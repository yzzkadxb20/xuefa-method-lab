import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import methodSeed from "./method-seed.mjs";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

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

const PORT = Number(process.env.PORT || 4180);
const HOST = process.env.HOST || "0.0.0.0";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === "production";
const IS_SERVERLESS = process.env.NETLIFY === "true" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.LAMBDA_TASK_ROOT);
const DATABASE_URL = process.env.DATABASE_URL || "";
const USE_SSL = process.env.PGSSL === "1";

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for server-pg.mjs");
  process.exit(1);
}
if (IS_PROD && !process.env.ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD is required in production");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: USE_SSL ? { rejectUnauthorized: false } : undefined,
  max: IS_SERVERLESS ? 1 : 5,
  idleTimeoutMillis: 30000,
});

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
const now = () => Date.now();
const uid = () => crypto.randomUUID();
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
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

async function q(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

async function initDb() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at BIGINT NOT NULL,
      disabled BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS user_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      method_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status, created_at);
    CREATE TABLE IF NOT EXISTS methods (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      updated_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_methods_published ON methods(published);
  `);

  for (const m of methodSeed) {
    await q(
      `INSERT INTO methods (id, data_json, published, created_at, updated_at, updated_by)
       VALUES ($1, $2, TRUE, $3, $4, NULL) ON CONFLICT (id) DO NOTHING`,
      [m.id, JSON.stringify(m), now(), now()]
    );
  }

  const admin = await q("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!admin.rows.length) {
    await q(
      "INSERT INTO users (id, username, password_hash, role, created_at) VALUES ($1, $2, $3, 'admin', $4)",
      [uid(), ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), now()]
    );
    if (IS_PROD) {
      console.log(`[init] admin account created: ${ADMIN_USERNAME} (password from env)`);
    } else {
      console.log(`[init] admin account: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
    }
  }
  await q("DELETE FROM sessions WHERE expires_at <= $1", [now()]);
}

function sendJson(res, status, payload, extra = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(JSON.stringify(payload));
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

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, token) {
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

function clearCookie(res) {
  res.setHeader("Set-Cookie", "ml_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}

async function currentUser(req) {
  const token = cookies(req).ml_session;
  if (!token) return null;
  const r = await q(
    `SELECT u.id, u.username, u.role, u.created_at, u.disabled
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2 LIMIT 1`,
    [sha256(token), now()]
  );
  const row = r.rows[0];
  if (!row || row.disabled) return null;
  return { id: row.id, username: row.username, role: row.role, createdAt: Number(row.created_at) };
}

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await q(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [sha256(token), userId, now() + SESSION_MS, now()]
  );
  setCookie(res, token);
}

async function requireUser(req, res) {
  const user = await currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: "未登录或会话已过期" });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    sendJson(res, 403, { error: "需要管理员权限" });
    return null;
  }
  return user;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function text(value, max, min = 0) {
  const s = String(value ?? "").trim();
  if (s.length < min) return null;
  return s.slice(0, max);
}

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5-]{3,24}$/;
const TYPES = new Set(["issue", "method"]);
const STATUS = new Set(["pending", "reviewing", "resolved", "rejected"]);

function list(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 8);
  return String(value || "").split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean).slice(0, 8);
}

function normalizeMethod(input) {
  if (!input || typeof input !== "object") return null;
  const id = text(input.id, 80, 2);
  const name = text(input.name, 80, 1);
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id) || !name) return null;
  return {
    id, name,
    en: text(input.en, 120) || "",
    category: text(input.category, 80) || "通用",
    domains: list(input.domains),
    goals: list(input.goals),
    evidence: ["A", "B", "C"].includes(input.evidence) ? input.evidence : "C",
    evidence_note: text(input.evidence_note, 500) || "",
    time: Math.max(5, Math.min(180, Number(input.time) || 20)),
    difficulty: Math.max(1, Math.min(5, Number(input.difficulty) || 2)),
    one_liner: text(input.one_liner, 300) || "",
    why: text(input.why, 500) || "",
    steps: list(input.steps),
    materials: list(input.materials),
    metric: text(input.metric, 300) || "",
    fail: list(input.fail),
    switch_to: text(input.switch_to, 80) || "",
    switch_when: text(input.switch_when, 500) || "",
    source: text(input.source, 300) || "",
  };
}

async function api(req, res, url) {
  const p = url.pathname;

  if (p === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, mode: "postgres", time: new Date().toISOString() });
    return true;
  }

  if (p === "/api/auth/register" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const username = text(body.username, 24, 3);
    const password = String(body.password || "");
    if (!username || !USERNAME_RE.test(username)) {
      sendJson(res, 400, { error: "用户名需 3-24 位，只允许中英文、数字、下划线、短横线" });
      return true;
    }
    if (password.length < 8 || password.length > 128) {
      sendJson(res, 400, { error: "密码至少 8 位" });
      return true;
    }
    try {
      const id = uid();
      await q(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES ($1, $2, $3, 'user', $4)",
        [id, username, hashPassword(password), now()]
      );
      await createSession(res, id);
      sendJson(res, 201, { user: { id, username, role: "user" } });
    } catch (e) {
      if (e.code === "23505") sendJson(res, 409, { error: "用户名已存在" });
      else throw e;
    }
    return true;
  }

  if (p === "/api/auth/login" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const username = text(body.username, 64, 1);
    const password = String(body.password || "");
    const r = await q("SELECT id, username, role, password_hash, disabled FROM users WHERE lower(username) = lower($1)", [username]);
    const row = r.rows[0];
    if (!row || row.disabled || !verifyPassword(password, row.password_hash)) {
      sendJson(res, 401, { error: "用户名或密码不正确" });
      return true;
    }
    await createSession(res, row.id);
    sendJson(res, 200, { user: { id: row.id, username: row.username, role: row.role } });
    return true;
  }

  if (p === "/api/auth/logout" && req.method === "POST") {
    const token = cookies(req).ml_session;
    if (token) await q("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
    clearCookie(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (p === "/api/me" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return true;
    sendJson(res, 200, { user });
    return true;
  }

  if (p === "/api/state" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return true;
    const r = await q("SELECT state_json, updated_at FROM user_states WHERE user_id = $1", [user.id]);
    sendJson(res, 200, {
      state: r.rows[0] ? JSON.parse(r.rows[0].state_json) : null,
      updatedAt: r.rows[0] ? Number(r.rows[0].updated_at) : null,
    });
    return true;
  }

  if (p === "/api/state" && req.method === "PUT") {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!body.state || typeof body.state !== "object") {
      sendJson(res, 400, { error: "state 必须是对象" });
      return true;
    }
    const json = JSON.stringify(body.state);
    if (Buffer.byteLength(json) > 1.5 * 1024 * 1024) {
      sendJson(res, 413, { error: "学习记录过大" });
      return true;
    }
    await q(
      `INSERT INTO user_states (user_id, state_json, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = EXCLUDED.updated_at`,
      [user.id, json, now()]
    );
    sendJson(res, 200, { ok: true, updatedAt: now() });
    return true;
  }

  if (p === "/api/methods" && req.method === "GET") {
    const r = await q("SELECT data_json FROM methods WHERE published = TRUE ORDER BY updated_at DESC");
    sendJson(res, 200, { methods: r.rows.map((x) => JSON.parse(x.data_json)), count: r.rows.length });
    return true;
  }

  if (p === "/api/suggestions" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return true;
    const r = await q(
      "SELECT id, type, title, content, method_name, status, admin_reply, created_at, updated_at FROM suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [user.id]
    );
    sendJson(res, 200, { suggestions: r.rows.map((x) => ({ ...x, created_at: Number(x.created_at), updated_at: Number(x.updated_at) })) });
    return true;
  }

  if (p === "/api/suggestions" && req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const type = TYPES.has(body.type) ? body.type : "issue";
    const title = text(body.title, 120, 4);
    const content = text(body.content, 5000, 4);
    if (!title || !content) {
      sendJson(res, 400, { error: "标题至少 4 字，内容至少 4 字" });
      return true;
    }
    const id = uid();
    await q(
      "INSERT INTO suggestions (id, user_id, type, title, content, method_name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)",
      [id, user.id, type, title, content, text(body.methodName, 80), now(), now()]
    );
    sendJson(res, 201, { id, status: "pending" });
    return true;
  }

  if (p === "/api/admin/stats" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const users = await q("SELECT COUNT(*)::int AS n FROM users WHERE role = 'user'");
    const suggestions = await q("SELECT status, COUNT(*)::int AS n FROM suggestions GROUP BY status");
    const methods = await q("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE published = TRUE)::int AS published FROM methods");
    sendJson(res, 200, { users: users.rows[0].n, suggestions: suggestions.rows, methods: methods.rows[0] });
    return true;
  }

  if (p === "/api/admin/suggestions" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const status = url.searchParams.get("status");
    const where = STATUS.has(status) ? "WHERE s.status = $1" : "";
    const r = await q(
      `SELECT s.id, s.type, s.title, s.content, s.method_name, s.status, s.admin_reply, s.created_at, s.updated_at, u.username
       FROM suggestions s JOIN users u ON u.id = s.user_id ${where}
       ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, s.created_at DESC LIMIT 200`,
      where ? [status] : []
    );
    sendJson(res, 200, { suggestions: r.rows.map((x) => ({ ...x, created_at: Number(x.created_at), updated_at: Number(x.updated_at) })) });
    return true;
  }

  const sm = p.match(/^\/api\/admin\/suggestions\/([^/]+)$/);
  if (sm && req.method === "PATCH") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!STATUS.has(body.status)) {
      sendJson(res, 400, { error: "无效状态" });
      return true;
    }
    const r = await q(
      "UPDATE suggestions SET status = $1, admin_reply = $2, updated_at = $3 WHERE id = $4",
      [body.status, text(body.admin_reply, 5000), now(), sm[1]]
    );
    if (!r.rowCount) sendJson(res, 404, { error: "建议不存在" });
    else sendJson(res, 200, { ok: true });
    return true;
  }

  if (p === "/api/admin/users" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const r = await q(
      `SELECT u.id, u.username, u.role, u.created_at, st.updated_at AS state_updated_at,
        (SELECT COUNT(*)::int FROM suggestions s WHERE s.user_id = u.id) AS suggestion_count
       FROM users u LEFT JOIN user_states st ON st.user_id = u.id
       ORDER BY u.created_at DESC LIMIT 200`
    );
    sendJson(res, 200, { users: r.rows.map((x) => ({ ...x, created_at: Number(x.created_at), state_updated_at: x.state_updated_at ? Number(x.state_updated_at) : null })) });
    return true;
  }

  if (p === "/api/admin/methods" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const r = await q("SELECT id, data_json, published, updated_at, updated_by FROM methods ORDER BY updated_at DESC");
    sendJson(res, 200, {
      methods: r.rows.map((x) => ({ ...JSON.parse(x.data_json), published: x.published, updated_at: Number(x.updated_at), updated_by: x.updated_by })),
      count: r.rows.length,
    });
    return true;
  }

  if (p === "/api/admin/methods" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const method = normalizeMethod(body.method);
    if (!method) {
      sendJson(res, 400, { error: "方法数据不完整" });
      return true;
    }
    const published = body.published !== false;
    await q(
      `INSERT INTO methods (id, data_json, published, created_at, updated_at, updated_by) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET data_json = EXCLUDED.data_json, published = EXCLUDED.published, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by`,
      [method.id, JSON.stringify(method), published, now(), now(), admin.id]
    );
    sendJson(res, 200, { ok: true, id: method.id, published });
    return true;
  }

  const mm = p.match(/^\/api\/admin\/methods\/([^/]+)$/);
  if (mm && req.method === "PATCH") {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = JSON.parse((await readBody(req)) || "{}");
    const ex = await q("SELECT data_json, published FROM methods WHERE id = $1", [mm[1]]);
    if (!ex.rows[0]) {
      sendJson(res, 404, { error: "方法不存在" });
      return true;
    }
    const merged = body.method ? { ...JSON.parse(ex.rows[0].data_json), ...body.method, id: mm[1] } : JSON.parse(ex.rows[0].data_json);
    const method = normalizeMethod(merged);
    if (!method) {
      sendJson(res, 400, { error: "方法数据不完整" });
      return true;
    }
    const published = body.published === undefined ? ex.rows[0].published : Boolean(body.published);
    await q("UPDATE methods SET data_json = $1, published = $2, updated_at = $3, updated_by = $4 WHERE id = $5", [
      JSON.stringify(method), published, now(), admin.id, mm[1],
    ]);
    sendJson(res, 200, { ok: true, id: mm[1], published });
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/login") pathname = "/login.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/") pathname = "/index.html";

  if (pathname === "/index.html") {
    const user = await currentUser(req);
    if (!user) {
      res.writeHead(302, { Location: "/login.html" });
      res.end();
      return;
    }
  }
  if (pathname === "/admin.html") {
    const user = await currentUser(req);
    if (!user || user.role !== "admin") {
      res.writeHead(302, { Location: "/login.html?next=/admin.html" });
      res.end();
      return;
    }
  }

  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  }[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": fs.statSync(file).size,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
  });
  fs.createReadStream(file).pipe(res);
}

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) {
        sendJson(res, 403, { error: "跨站请求被拒绝" });
        return;
      }
      const handled = await api(req, res, url);
      if (!handled) sendJson(res, 404, { error: "API not found" });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end("Method not allowed");
      return;
    }
    await serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, e.status || 500, { error: e.message || "Server error" });
  }
});

export async function init() {
  await initDb();
}

if (!IS_SERVERLESS) {
  await init();
  server.listen(PORT, HOST, () => {
    console.log(`学法实验室 v2 (Postgres) running at http://localhost:${PORT}`);
    console.log(`admin login: ${ADMIN_USERNAME}${IS_PROD ? " (password from env)" : ` / ${ADMIN_PASSWORD}`}`);
  });
}
