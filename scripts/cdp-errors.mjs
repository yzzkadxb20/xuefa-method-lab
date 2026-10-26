import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9334;
const URL = process.env.TEST_URL || "http://127.0.0.1:4174/?demo=plan&scenario=english";
const PROFILE = path.join(process.cwd(), `.edge-err-${Date.now()}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,1000", "--no-first-run", "--remote-allow-origins=*",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, URL,
], { stdio: "ignore", windowsHide: true });

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        for (const h of this.events.get(msg.method) || []) h(msg.params);
      }
    });
  }
  async open() {
    if (this.ws.readyState === 1) return;
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", res, { once: true });
      this.ws.addEventListener("error", rej, { once: true });
    });
  }
  on(method, handler) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(handler);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function main() {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const j = await r.json();
      target = j.find((t) => t.type === "page") || null;
    } catch {}
  }
  if (!target) throw new Error("no target");
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => errors.push({ type: "exception", text: p.exceptionDetails?.text, desc: p.exceptionDetails?.exception?.description }));
  cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") errors.push({ type: "console", text: (p.args || []).map((a) => a.value || a.description).join(" ") });
  });
  cdp.on("Log.entryAdded", (p) => {
    if (p.entry?.level === "error") errors.push({ type: "log", text: p.entry.text });
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await sleep(3000);
  const evalValue = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
    return r.result?.value;
  };
  console.log(JSON.stringify({
    url: await evalValue("location.href"),
    messages: await evalValue("document.querySelectorAll('.message').length"),
    gate: await evalValue("Boolean(document.querySelector('.gate-card'))"),
    plan: await evalValue("Boolean(document.querySelector('.plan-card'))"),
    body: (await evalValue("document.body.innerText")).slice(0, 300),
    errors,
  }, null, 2));
  cdp.ws.close();
}

try {
  await main();
} catch (e) {
  console.error("FAILED", e.stack || e);
  process.exitCode = 1;
} finally {
  try { spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
