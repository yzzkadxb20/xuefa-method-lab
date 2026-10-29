import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9340;
const BASE = process.env.TEST_BASE || "http://127.0.0.1:4180";
const HOST = new URL(BASE).host;
const PROFILE = path.join(process.cwd(), `.edge-v2-${Date.now()}`);
const SHOTS = path.resolve(process.cwd(), "..", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const username = `student${String(Date.now()).slice(-6)}`;
const password = "password123";
const suggestionTitle = `希望增加播客精听方法 ${username}`;

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

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const j = await r.json();
      const t = j.find((x) => x.type === "page" && x.url.includes(HOST));
      if (t) return t;
    } catch {}
  }
  throw new Error("no browser target");
}

async function main() {
  const target = await waitForTarget();
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => errors.push(p.exceptionDetails?.text || "exception"));
  cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") errors.push((p.args || []).map((a) => a.value || a.description).join(" "));
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");

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
    throw new Error(`timeout: ${label}`);
  };
  const fill = async (sel, value) => val(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);
  const click = async (sel) => val(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if(!el) throw new Error('missing ${sel}'); el.click(); return true; })()`);
  const shot = async (name) => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(SHOTS, name), Buffer.from(r.data, "base64"));
  };

  await wait(`document.querySelector('#authForm')`, "login form");
  await shot("v2-login-clean.png");

  // register
  await click(`[data-tab="register"]`);
  await fill("#username", username);
  await fill("#password", password);
  await fill("#confirmPassword", password);
  await click("#authForm .auth-submit");
  await wait(`location.pathname === '/' || location.pathname === '/index.html'`, "redirect after register", 15000);
  await wait(`document.querySelector('.gate-card')`, "gate card");
  await shot("v2-app-gate.png");

  // answer 3 questions
  const answers = [
    "4 周后有一场英文面试，我想在压力下连续说 2 分钟不卡壳。",
    "雅思口语 5.5，能写但一开口就语法混乱；上次模拟面试被打断 3 次。",
    "每天 30 分钟，晚上 9 点后，在宿舍，容易被人打断。",
  ];
  for (const answer of answers) {
    await fill("#messageInput", answer);
    await click("#composer .send-btn");
    await sleep(700);
  }
  await wait(`document.querySelector('.plan-card')`, "plan card", 15000);
  await sleep(1200);
  await shot("v2-app-plan.png");

  // reload: server memory should restore gate + plan
  await cdp.send("Page.reload");
  await wait(`document.querySelector('.plan-card')`, "plan after reload", 15000);
  const planAfterReload = await val(`Boolean(document.querySelector('.plan-card'))`);
  const gateCompleteAfterReload = await val(`document.querySelector('.gate-card')?.innerText.includes('3 / 3') || false`);

  // logout then login again
  await click(`[data-action="logout"]`);
  await wait(`location.pathname === '/login.html'`, "logout redirect", 15000);
  await fill("#username", username);
  await fill("#password", password);
  await click("#authForm .auth-submit");
  await wait(`document.querySelector('.plan-card')`, "plan after re-login", 15000);
  const planAfterLogin = await val(`Boolean(document.querySelector('.plan-card'))`);

  // submit suggestion
  await click(`[data-action="open-suggestion"]`);
  await wait(`document.querySelector('#suggestionForm')`, "suggestion form");
  await fill("#sgTitle", suggestionTitle);
  await fill("#sgContent", "想增加一套每天 20 分钟的播客精听方法，包含选材、精听、复述和复习。");
  await click("#suggestionForm .btn.coral");
  await sleep(1000);
  const suggestionSubmitted = await val(`document.body.innerText.includes('已提交') || Boolean(document.querySelector('#mySuggestions'))`);

  // admin login
  await click(`[data-action="logout"]`);
  await wait(`location.pathname === '/login.html'`, "logout before admin", 15000);
  await fill("#username", "admin");
  await fill("#password", "admin12345");
  await click("#authForm .auth-submit");
  await wait(`location.pathname === '/admin.html'`, "admin page", 15000);
  await wait(`document.querySelectorAll('[data-suggestion]').length > 0`, "admin suggestion list", 15000);
  await shot("v2-admin-suggestions.png");

  // process the suggestion
  await click(`[data-suggestion]`);
  await wait(`document.querySelector('#detailStatus')`, "suggestion detail");
  await fill("#detailReply", "收到，我们会评估播客精听方法，并在方法库中补充一套可执行卡片。");
  await val(`(() => { const el = document.querySelector('#detailStatus'); el.value = 'reviewing'; return true; })()`);
  await click("#detailSave");
  await sleep(1000);
  const suggestionProcessed = await val(`document.body.innerText.includes('已保存') || document.body.innerText.includes('处理中')`);

  // edit a method and restore it
  await click(`[data-view="methods"]`);
  await wait(`document.querySelectorAll('[data-method]').length > 0`, "admin method list", 15000);
  const methodId = await val(`document.querySelector('[data-method]').dataset.method`);
  await click(`[data-method="${methodId}"]`);
  await wait(`document.querySelector('[data-field="one_liner"]')`, "method editor");
  const originalOneLiner = await val(`document.querySelector('[data-field="one_liner"]').value`);
  await fill('[data-field="one_liner"]', `${originalOneLiner}（v2 admin test）`);
  await click("#methodSave");
  await sleep(1000);
  const methodSaved = await val(`document.body.innerText.includes('已保存')`);
  await shot("v2-admin-method-edit.png");
  // restore
  await fill('[data-field="one_liner"]', originalOneLiner);
  await click("#methodSave");
  await sleep(700);

  console.log(JSON.stringify({
    username,
    planAfterReload,
    gateCompleteAfterReload,
    planAfterLogin,
    suggestionSubmitted,
    suggestionProcessed,
    methodId,
    methodSaved,
    errors,
  }, null, 2));

  cdp.ws.close();
}

try {
  await main();
} catch (err) {
  console.error("TEST_FAILED", err.stack || err);
  process.exitCode = 1;
} finally {
  try { spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
