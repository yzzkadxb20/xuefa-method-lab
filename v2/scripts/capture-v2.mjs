import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9341;
const BASE = process.env.CAPTURE_BASE || "http://127.0.0.1:4180";
const MOBILE = process.env.MOBILE === "1";
const SHOT_PREFIX = process.env.SHOT_PREFIX || "";
const PROFILE = path.join(process.cwd(), `.edge-capture-${Date.now()}`);
const SHOTS = path.resolve(process.cwd(), "..", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1440,1000",
  "--no-first-run", "--remote-allow-origins=*", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`, `${BASE}/login.html`,
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
  on(m, h) { if (!this.events.has(m)) this.events.set(m, []); this.events.get(m).push(h); }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function main() {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = j.find((x) => x.type === "page" && x.url.includes(new URL(BASE).host));
    } catch {}
  }
  if (!target) throw new Error("no target");
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => errors.push(p.exceptionDetails?.text || "exception"));
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  if (MOBILE) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  }

  const val = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "eval error");
    return r.result?.value;
  };
  const wait = async (expr, label, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await val(expr)) return true;
      await sleep(250);
    }
    throw new Error(`timeout ${label}`);
  };
  const fill = (sel, value) => val(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  const click = (sel) => val(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); if(!el) throw new Error('missing ${sel}'); el.click(); return true; })()`);
  const shot = async (name) => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: MOBILE });
    fs.writeFileSync(path.join(SHOTS, SHOT_PREFIX + name), Buffer.from(r.data, "base64"));
  };

  await wait(`document.querySelector('#authForm')`, "login");
  await sleep(900);
  await shot("v2-login-clean.png");

  // demo user
  await fill("#username", "demo");
  await fill("#password", "demo12345");
  await click("#authForm .auth-submit");
  try {
    await wait(`document.querySelector('.plan-card')`, "demo plan");
  } catch (e) {
    console.log("DEBUG_URL", await val("location.href"));
    console.log("DEBUG_TEXT", String(await val("document.body.innerText")).slice(0, 1200));
    console.log("DEBUG_ERRORS", JSON.stringify(errors));
    await shot("v2-public-debug.png");
    throw e;
  }
  await sleep(900);
  await click(`[data-view="chat"]`);
  await sleep(500);
  await shot("v2-app-plan.png");

  await click(`[data-view="memory"]`);
  await wait(`document.querySelector('.timeline')`, "memory");
  await sleep(700);
  await shot("v2-app-memory.png");

  await click(`[data-view="report"]`);
  await wait(`document.querySelector('.chart')`, "report");
  await sleep(700);
  await shot("v2-app-report.png");

  if (process.env.SKIP_ADMIN === "1") {
    console.log(JSON.stringify({ ok: true, public: true, errors }, null, 2));
    cdp.ws.close();
    return;
  }

  // logout -> admin
  await click(`[data-action="logout"]`);
  await wait(`location.pathname === '/login.html'`, "logout");
  await fill("#username", "admin");
  await fill("#password", "admin12345");
  await click("#authForm .auth-submit");
  await wait(`location.pathname === '/admin.html'`, "admin");
  await wait(`document.querySelectorAll('[data-suggestion]').length > 0`, "tickets");
  await sleep(700);
  await shot("v2-admin-suggestions.png");

  await click(`[data-view="methods"]`);
  await wait(`document.querySelectorAll('[data-method]').length > 0`, "methods");
  await click(`[data-method]`);
  await wait(`document.querySelector('[data-field="one_liner"]')`, "editor");
  await sleep(600);
  await shot("v2-admin-methods.png");

  await click(`[data-view="users"]`);
  await wait(`document.querySelector('#userTable tbody tr')`, "users");
  await sleep(500);
  await shot("v2-admin-users.png");

  console.log(JSON.stringify({ ok: true, errors }, null, 2));
  cdp.ws.close();
}

try {
  await main();
} catch (e) {
  console.error("CAPTURE_FAILED", e.stack || e);
  process.exitCode = 1;
} finally {
  try { spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
