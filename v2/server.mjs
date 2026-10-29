import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "methodlab.db");
const PORT = Number(process.env.PORT || 4180);
const HOST = process.env.HOST || "0.0.0.0";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === "production";

// tiny .env loader (no dependency); real env wins
function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS user_states (
  user_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  method_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_reply TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status, created_at);
CREATE TABLE IF NOT EXISTS methods (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_methods_published ON methods(published);
`);

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(":");
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(password, salt, 64);
    const target = Buffer.from(hash, "hex");
    return test.length === target.length && crypto.timingSafeEqual(test, target);
  } catch {
    return false;
  }
}

function seedMethods() {
  const file = path.join(PUBLIC_DIR, "data", "methods.json");
  if (!fs.existsSync(file)) return;
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const insert = db.prepare(
    "INSERT OR IGNORE INTO methods (id, data_json, published, created_at, updated_at, updated_by) VALUES (?, ?, 1, ?, ?, NULL)"
  );
  for (const m of payload.methods || []) {
    insert.run(m.id, JSON.stringify(m), now(), now());
  }
}

function seedAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;
  const username = ADMIN_USERNAME;
  const password = ADMIN_PASSWORD;
  const id = uid();
  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)"
  ).run(id, username, hashPassword(password), now());
  if (IS_PROD) {
    console.log(`[init] admin account created: ${username} (password from ADMIN_PASSWORD env)`);
    console.warn("[init] WARNING: set a strong ADMIN_PASSWORD and keep it out of logs.");
  } else {
    console.log(`[init] admin account: ${username} / ${password}`);
  }
}

seedMethods();
seedAdmin();

// cleanup old sessions on boot, then hourly
function cleanupSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}
cleanupSessions();
setInterval(cleanupSessions, 60 * 60 * 1000).unref();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function tokenHash(token) {
  return sha256(token);
}

function setSessionCookie(res, token) {
  const secure = IS_PROD || process.env.COOKIE_SECURE === "1";
  const cookie = [
    `ml_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ];
  if (secure) cookie.push("Secure");
  res.setHeader("Set-Cookie", cookie.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "ml_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}

function currentUser(req) {
  const token = parseCookies(req).ml_session;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.created_at, u.disabled, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`
    )
    .get(tokenHash(token), now());
  if (!row || row.disabled) return null;
  return { id: row.id, username: row.username, role: row.role, createdAt: row.created_at };
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    tokenHash(token),
    userId,
    now() + SESSION_MS,
    now()
  );
  setSessionCookie(res, token);
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: "未登录或会话已过期" });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    sendJson(res, 403, { error: "需要管理员权限" });
    return null;
  }
  return user;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients / curl
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function cleanText(value, max, min = 0) {
  const s = String(value ?? "").trim();
  if (s.length < min) return null;
  return s.slice(0, max);
}

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5-]{3,24}$/;
const SUGGESTION_TYPES = new Set(["issue", "method"]);
const SUGGESTION_STATUS = new Set(["pending", "reviewing", "resolved", "rejected"]);

function parseIdList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean);
  return [];
}

function normalizeMethod(input) {
  if (!input || typeof input !== "object") return null;
  const id = cleanText(input.id, 80, 2);
  const name = cleanText(input.name, 80, 1);
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id) || !name) return null;
  return {
    id,
    name,
    en: cleanText(input.en, 120) || "",
    category: cleanText(input.category, 80) || "通用",
    domains: parseIdList(input.domains).slice(0, 8),
    goals: parseIdList(input.goals).slice(0, 8),
    evidence: ["A", "B", "C"].includes(input.evidence) ? input.evidence : "C",
    evidence_note: cleanText(input.evidence_note, 500) || "",
    time: Math.max(5, Math.min(180, Number(input.time) || 20)),
    difficulty: Math.max(1, Math.min(5, Number(input.difficulty) || 2)),
    one_liner: cleanText(input.one_liner, 300) || "",
    why: cleanText(input.why, 500) || "",
    steps: parseIdList(input.steps).slice(0, 8),
    materials: parseIdList(input.materials).slice(0, 8),
    metric: cleanText(input.metric, 300) || "",
    fail: parseIdList(input.fail).slice(0, 8),
    switch_to: cleanText(input.switch_to, 80) || "",
    switch_when: cleanText(input.switch_when, 500) || "",
    source: cleanText(input.source, 300) || "",
  };
}

async function handleApi(req, res, url) {
  const p = url.pathname;

  if (p === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, llm: false, mode: "fullstack", time: new Date().toISOString() });
    return true;
  }

  if (p === "/api/auth/register" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const username = cleanText(body.username, 24, 3);
    const password = String(body.password || "");
    if (!username || !USERNAME_RE.test(username)) {
      sendJson(res, 400, { error: "用户名需 3-24 位，只允许中英文、数字、下划线、短横线" });
      return true;
    }
    if (password.length < 8 || password.length > 128) {
      sendJson(res, 400, { error: "密码至少 8 位" });
      return true;
    }
    const exists = db.prepare("SELECT id FROM users WHERE lower(username) = lower(?)").get(username);
    if (exists) {
      sendJson(res, 409, { error: "用户名已存在" });
      return true;
    }
    const id = uid();
    db.prepare("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, 'user', ?)").run(
      id,
      username,
      hashPassword(password),
      now()
    );
    createSession(res, id);
    sendJson(res, 201, { user: { id, username, role: "user" } });
    return true;
  }

  if (p === "/api/auth/login" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const username = cleanText(body.username, 64, 1);
    const password = String(body.password || "");
    const row = username
      ? db
          .prepare("SELECT id, username, role, password_hash, disabled FROM users WHERE lower(username) = lower(?)")
          .get(username)
      : null;
    if (!row || row.disabled || !verifyPassword(password, row.password_hash)) {
      sendJson(res, 401, { error: "用户名或密码不正确" });
      return true;
    }
    createSession(res, row.id);
    sendJson(res, 200, { user: { id: row.id, username: row.username, role: row.role } });
    return true;
  }

  if (p === "/api/auth/logout" && req.method === "POST") {
    const token = parseCookies(req).ml_session;
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (p === "/api/me" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return true;
    sendJson(res, 200, { user });
    return true;
  }

  if (p === "/api/state" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return true;
    const row = db.prepare("SELECT state_json, updated_at FROM user_states WHERE user_id = ?").get(user.id);
    sendJson(res, 200, { state: row ? JSON.parse(row.state_json) : null, updatedAt: row?.updated_at || null });
    return true;
  }

  if (p === "/api/state" && req.method === "PUT") {
    const user = requireUser(req, res);
    if (!user) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!body.state || typeof body.state !== "object") {
      sendJson(res, 400, { error: "state 必须是对象" });
      return true;
    }
    const json = JSON.stringify(body.state);
    if (Buffer.byteLength(json) > 1.5 * 1024 * 1024) {
      sendJson(res, 413, { error: "学习记录过大，请清理旧对话" });
      return true;
    }
    db.prepare(
      `INSERT INTO user_states (user_id, state_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`
    ).run(user.id, json, now());
    sendJson(res, 200, { ok: true, updatedAt: now() });
    return true;
  }

  if (p === "/api/methods" && req.method === "GET") {
    const rows = db.prepare("SELECT data_json FROM methods WHERE published = 1 ORDER BY updated_at DESC").all();
    sendJson(res, 200, { methods: rows.map((r) => JSON.parse(r.data_json)), count: rows.length });
    return true;
  }

  if (p === "/api/suggestions" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return true;
    const rows = db
      .prepare(
        "SELECT id, type, title, content, method_name, status, admin_reply, created_at, updated_at FROM suggestions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(user.id);
    sendJson(res, 200, { suggestions: rows });
    return true;
  }

  if (p === "/api/suggestions" && req.method === "POST") {
    const user = requireUser(req, res);
    if (!user) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const type = SUGGESTION_TYPES.has(body.type) ? body.type : "issue";
    const title = cleanText(body.title, 120, 4);
    const content = cleanText(body.content, 5000, 4);
    if (!title || !content) {
      sendJson(res, 400, { error: "标题至少 4 字，内容至少 4 字" });
      return true;
    }
    const id = uid();
    db.prepare(
      "INSERT INTO suggestions (id, user_id, type, title, content, method_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
    ).run(id, user.id, type, title, content, cleanText(body.methodName, 80) || null, now(), now());
    sendJson(res, 201, { id, status: "pending" });
    return true;
  }

  // ---- admin ----
  if (p === "/api/admin/stats" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const users = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'user'").get().n;
    const suggestions = db.prepare("SELECT status, COUNT(*) AS n FROM suggestions GROUP BY status").all();
    const methods = db.prepare("SELECT COUNT(*) AS total, SUM(published) AS published FROM methods").get();
    sendJson(res, 200, { users, suggestions, methods });
    return true;
  }

  if (p === "/api/admin/suggestions" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const status = url.searchParams.get("status");
    const where = SUGGESTION_STATUS.has(status) ? "WHERE s.status = ?" : "";
    const rows = db
      .prepare(
        `SELECT s.id, s.type, s.title, s.content, s.method_name, s.status, s.admin_reply, s.created_at, s.updated_at, u.username
         FROM suggestions s JOIN users u ON u.id = s.user_id ${where}
         ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, s.created_at DESC LIMIT 200`
      )
      .all(...(where ? [status] : []));
    sendJson(res, 200, { suggestions: rows });
    return true;
  }

  const sm = p.match(/^\/api\/admin\/suggestions\/([^/]+)$/);
  if (sm && req.method === "PATCH") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const status = SUGGESTION_STATUS.has(body.status) ? body.status : null;
    if (!status) {
      sendJson(res, 400, { error: "无效状态" });
      return true;
    }
    const reply = cleanText(body.admin_reply, 5000);
    const result = db.prepare("UPDATE suggestions SET status = ?, admin_reply = ?, updated_at = ? WHERE id = ?").run(
      status,
      reply,
      now(),
      sm[1]
    );
    if (!result.changes) {
      sendJson(res, 404, { error: "建议不存在" });
      return true;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (p === "/api/admin/users" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const rows = db
      .prepare(
        `SELECT u.id, u.username, u.role, u.created_at, st.updated_at AS state_updated_at,
          (SELECT COUNT(*) FROM suggestions s WHERE s.user_id = u.id) AS suggestion_count
         FROM users u LEFT JOIN user_states st ON st.user_id = u.id
         ORDER BY u.created_at DESC LIMIT 200`
      )
      .all();
    sendJson(res, 200, { users: rows });
    return true;
  }

  if (p === "/api/admin/methods" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const rows = db.prepare("SELECT id, data_json, published, updated_at, updated_by FROM methods ORDER BY updated_at DESC").all();
    sendJson(res, 200, {
      methods: rows.map((r) => ({ ...JSON.parse(r.data_json), published: !!r.published, updated_at: r.updated_at, updated_by: r.updated_by })),
      count: rows.length,
    });
    return true;
  }

  if (p === "/api/admin/methods" && req.method === "POST") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const method = normalizeMethod(body.method);
    if (!method) {
      sendJson(res, 400, { error: "方法数据不完整：至少需要 id、name、domains、steps、materials" });
      return true;
    }
    const published = body.published === false ? 0 : 1;
    db.prepare(
      `INSERT INTO methods (id, data_json, published, created_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, published = excluded.published, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
    ).run(method.id, JSON.stringify(method), published, now(), now(), admin.id);
    sendJson(res, 200, { ok: true, id: method.id, published: !!published });
    return true;
  }

  const mm = p.match(/^\/api\/admin\/methods\/([^/]+)$/);
  if (mm && req.method === "PATCH") {
    const admin = requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const existing = db.prepare("SELECT data_json, published FROM methods WHERE id = ?").get(mm[1]);
    if (!existing) {
      sendJson(res, 404, { error: "方法不存在" });
      return true;
    }
    const merged = body.method ? { ...JSON.parse(existing.data_json), ...body.method, id: mm[1] } : JSON.parse(existing.data_json);
    const method = normalizeMethod(merged);
    if (!method) {
      sendJson(res, 400, { error: "方法数据不完整" });
      return true;
    }
    const published = body.published === undefined ? existing.published : body.published ? 1 : 0;
    db.prepare("UPDATE methods SET data_json = ?, published = ?, updated_at = ?, updated_by = ? WHERE id = ?").run(
      JSON.stringify(method),
      published,
      now(),
      admin.id,
      mm[1]
    );
    sendJson(res, 200, { ok: true, id: mm[1], published: !!published });
    return true;
  }

  return false;
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/login") pathname = "/login.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/") pathname = "/index.html";

  // auth-aware page routing
  if (pathname === "/index.html") {
    const user = currentUser(req);
    if (!user) {
      res.writeHead(302, { Location: "/login.html" });
      res.end();
      return;
    }
  }
  if (pathname === "/admin.html") {
    const user = currentUser(req);
    if (!user || user.role !== "admin") {
      res.writeHead(302, { Location: "/login.html?next=/admin.html" });
      res.end();
      return;
    }
  }

  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500);
    res.end("Internal error");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) {
        sendJson(res, 403, { error: "跨站请求被拒绝" });
        return;
      }
      const handled = await handleApi(req, res, url);
      if (!handled) sendJson(res, 404, { error: "API not found" });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end("Method not allowed");
      return;
    }
    serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`学法实验室 v2 running at http://localhost:${PORT}`);
  console.log(`database: ${DB_PATH}`);
  console.log(`admin login: ${ADMIN_USERNAME}${IS_PROD ? " (password from ADMIN_PASSWORD env)" : ` / ${ADMIN_PASSWORD}`}`);
});
