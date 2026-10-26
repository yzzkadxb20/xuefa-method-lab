import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const BASE = process.env.TEST_BASE || "http://127.0.0.1:4173";
const HOST = new URL(BASE).host;
const PROFILE = path.join(process.cwd(), `.edge-cdp-${Date.now()}`);
const OUT = path.join(process.cwd(), "..", "screenshots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(
  EDGE,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1440,1000",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    `${BASE}/?demo=gate`,
  ],
  { stdio: "ignore", windowsHide: true }
);

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
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        const handlers = this.events.get(msg.method) || [];
        for (const h of handlers) h(msg.params);
      }
    });
  }
  async open() {
    if (this.ws.readyState === 1) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
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

async function waitFor(fn, timeout = 15000, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function main() {
  const list = await waitFor(
    async () => {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (!r.ok) return null;
      const j = await r.json();
      return j.find((t) => t.type === "page" && t.url.includes(HOST)) || null;
    },
    15000,
    "Edge page target"
  );
  const cdp = new CDP(list.webSocketDebuggerUrl);
  await cdp.open();
  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => errors.push(p.exceptionDetails?.text || "exception"));
  cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") errors.push((p.args || []).map((a) => a.value || a.description).join(" "));
  });
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const evalValue = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "eval error");
    return r.result?.value;
  };

  const setInput = async (text) => {
    await evalValue(`(() => { const i = document.querySelector('#messageInput'); i.value = ${JSON.stringify(text)}; document.querySelector('#composer').requestSubmit(); return true; })()`);
  };

  const shot = async (name) => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, "base64"));
  };

  await sleep(1500);

  const navCount = await evalValue(`document.querySelector('#navMethods').textContent`);
  const gateVisible = await evalValue(`Boolean(document.querySelector('.gate-card'))`);
  const methodCount = await evalValue(`document.querySelectorAll('.method-tile').length`);

  // 1) hard gate: asking for a plan before 3 answers must not produce one
  await setInput("直接给我方案，别问那么多");
  await sleep(900);
  const planBeforeGate = await evalValue(`document.querySelectorAll('.plan-card').length`);
  const gateStill = await evalValue(`Boolean(document.querySelector('.gate-card'))`);
  const refusal = await evalValue(`document.body.innerText.includes('还差第 1 问')`);
  await shot("cdp-gate.png");

  // 2) answer the three questions
  await setInput("4 周后有一场英文面试，我想在压力下连续说 2 分钟不卡壳。");
  await sleep(700);
  await setInput("雅思口语 5.5，能写但一开口就语法混乱；上次模拟面试被打断 3 次。");
  await sleep(700);
  await setInput("每天 30 分钟，晚上 9 点后，在宿舍，容易被人打断。");
  await waitFor(async () => evalValue(`Boolean(document.querySelector('.plan-card'))`), 10000, "plan card");
  await sleep(500);
  const planVisible = await evalValue(`Boolean(document.querySelector('.plan-card'))`);
  const methodVisible = await evalValue(`Boolean(document.querySelector('.method-card'))`);
  const methodName = await evalValue(`document.querySelector('.method-name')?.textContent || ''`);
  const planText = await evalValue(`document.querySelector('.plan-card')?.innerText || ''`);
  await shot("cdp-plan.png");

  // 3) feedback -> switch
  await evalValue(`document.querySelector('[data-action="open-feedback"]').click()`);
  await waitFor(async () => evalValue(`Boolean(document.querySelector('#feedbackForm'))`), 5000, "feedback form");
  await evalValue(`(() => {
    const setRange = (id, v) => { const el = document.querySelector(id); el.value = String(v); el.dispatchEvent(new Event('input', {bubbles:true})); };
    setRange('#fbCompletion', 85);
    setRange('#fbScore', 48);
    document.querySelector('[data-diff="5"]').click();
    document.querySelector('#fbNote').value = '跟读能跟上，但一脱稿就卡；越练越紧张。';
    document.querySelector('#feedbackForm').requestSubmit();
    return true;
  })()`);
  await waitFor(async () => evalValue(`Boolean(document.querySelector('.summary-card'))`), 10000, "summary card");
  await sleep(500);
  const summaryVisible = await evalValue(`Boolean(document.querySelector('.summary-card'))`);
  const switchVisible = await evalValue(`Boolean(document.querySelector('.switch-card'))`);
  const summaryText = await evalValue(`document.querySelector('.summary-card')?.innerText || ''`);
  await shot("cdp-summary.png");

  // 4) view navigation
  await evalValue(`document.querySelector('[data-action="view"][data-view="memory"]').click()`);
  await sleep(500);
  const memoryVisible = await evalValue(`Boolean(document.querySelector('.timeline'))`);
  await evalValue(`document.querySelector('[data-action="view"][data-view="report"]').click()`);
  await sleep(500);
  const reportVisible = await evalValue(`Boolean(document.querySelector('.chart'))`);

  console.log(JSON.stringify({
    navCount,
    gateVisible,
    methodCount,
    planBeforeGate,
    gateStill,
    refusal,
    planVisible,
    methodVisible,
    methodName,
    planText: planText.slice(0, 120),
    summaryVisible,
    switchVisible,
    summaryText: summaryText.slice(0, 120),
    memoryVisible,
    reportVisible,
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
  try {
    spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {}
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true });
  } catch {}
}
