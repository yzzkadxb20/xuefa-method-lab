import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

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
  ".woff2": "font/woff2",
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function readBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = path.normalize(path.join(PUBLIC_DIR, decoded === "/" ? "index.html" : decoded));
  if (!candidate.startsWith(PUBLIC_DIR)) return null;
  return candidate;
}

function serveStatic(req, res, urlPath) {
  let file = safeFile(urlPath);
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const stat = fs.statSync(file);
    const cache = ext === ".html" ? "no-cache" : "public, max-age=3600";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": cache,
    });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal error");
  }
}

async function coach(req, res) {
  if (!API_KEY) {
    json(res, 503, {
      error: "LLM not configured",
      hint: "Set DEEPSEEK_API_KEY before starting the server. The prototype still works with the local coach engine.",
    });
    return;
  }
  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw || "{}");
  } catch {
    json(res, 400, { error: "Invalid JSON" });
    return;
  }
  const message = String(payload.message || "").slice(0, 4000);
  const context = payload.context || {};
  if (!message.trim()) {
    json(res, 400, { error: "message required" });
    return;
  }

  const system = [
    "你是「学法实验室」的学习教练小法。",
    "硬规则：用户必须先完成 3 个问题（目标/起点/时间与环境），否则不得给出最终学习方案。但服务端只会收到已完成三问的对话；若上下文显示未完成，你要拒绝给方案并追问。",
    "你的任务：结合用户档案、当前方法、任务卡和最近反馈，给出简短、具体、可执行的回复。",
    "限制：不要承诺提分或治愈；不要编造研究；不要推荐盗版资料；不要一次给很多方法；每次只改一个变量。",
    "语气：中文，温和、直接、有边界感，可以少量使用 emoji。",
    "输出 2-5 句话，不要长篇大论，不要使用 Markdown 标题。",
  ].join("\n");

  const contextText = JSON.stringify(context).slice(0, 8000);
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `用户说：${message}\n\n当前上下文（JSON）：${contextText}` },
    ],
    temperature: 0.6,
    max_tokens: 500,
  };

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      json(res, 502, { error: "LLM upstream error", status: upstream.status, detail: text.slice(0, 500) });
      return;
    }
    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    json(res, 200, { text, model: MODEL });
  } catch (err) {
    json(res, 502, { error: "LLM request failed", detail: String(err).slice(0, 300) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      llm: Boolean(API_KEY),
      model: API_KEY ? MODEL : null,
      time: new Date().toISOString(),
    });
    return;
  }
  if (url.pathname === "/api/coach" && req.method === "POST") {
    await coach(req, res);
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method not allowed");
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`学法实验室 running at http://localhost:${PORT}`);
  console.log(`AI enhancement: ${API_KEY ? `on (${MODEL})` : "off (local coach engine)"}`);
});
