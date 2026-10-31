import * as E from "./engine.js";
import { api } from "./api.js";

/* ------------------------------------------------------------------ utils */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const STORAGE_KEY = "methodlab.state.v3";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escAttr = esc;
const uid = () => Math.random().toString(36).slice(2, 9);
const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const dateLabel = (value) => {
  if (!value) return "";
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};
const timeLabel = (ts) =>
  new Date(ts || Date.now()).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function formatText(text = "") {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

/* ------------------------------------------------------------------ state */
let METHODS = [];
let METHOD_MAP = new Map();
let state = null;
let feedbackDraft = null;
let busy = false;
let CURRENT_USER = null;
let saveTimer = null;
let serverSaveWarned = false;

function defaultState() {
  return {
    version: 3,
    createdAt: new Date().toISOString(),
    gate: { step: 0, answers: [], complete: false },
    profile: null,
    diagnosis: null,
    match: [],
    methodId: null,
    plan: null,
    logs: [],
    trials: [],
    messages: [],
    activeView: "chat",
    demo: null,
    lastSummary: null,
    llmAvailable: false,
    llmEnabled: false,
    llmModel: "",
    libraryFilter: "全部",
    librarySearch: "",
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 3) return null;
    return { ...defaultState(), ...parsed };
  } catch {
    return null;
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* local cache; server is source of truth */
  }
  if (!CURRENT_USER) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveServerState(), 650);
}

async function saveServerState() {
  if (!CURRENT_USER || !state) return;
  try {
    await api("/api/state", { method: "PUT", body: { state } });
    serverSaveWarned = false;
  } catch (err) {
    console.warn("server save failed", err);
    if (!serverSaveWarned) {
      serverSaveWarned = true;
      toast("服务端保存失败，已暂存本地；请检查网络后重试。");
    }
  }
}

function bindAccountUi() {
  const adminLink = $("#adminLink");
  if (adminLink) adminLink.hidden = CURRENT_USER?.role !== "admin";
}

/* ------------------------------------------------------------------ gate */
const GATE_QUESTIONS = [
  {
    title: "你想解决的具体学习目标是什么？",
    hint: "请给我一个场景 + 期限，例如「4 周后英文面试，能连续说 2 分钟」。",
    chips: ["4 周后英文面试，能连续说 2 分钟", "2 周后审计期末，想从 60 到 80", "7 天后课堂展示，想不紧张", "2 周学会 15 分钟通勤妆"],
  },
  {
    title: "你现在的真实起点如何？",
    hint: "给我一个最近的表现、分数、作品或卡点，不要只说「不太好」。",
    chips: ["雅思 5.5，开口就语法混乱", "模考 58，案例题丢分最多", "内容还行，上台语速就变快", "会基础，但底妆总卡粉"],
  },
  {
    title: "你每天能稳定投入多少时间？在什么环境？",
    hint: "时间、地点、干扰因素都算。越真实，任务卡越能执行。",
    chips: ["每天 30 分钟，晚上 9 点后，在宿舍", "每天 1 小时，晚上图书馆", "每天 20 分钟，午休空教室", "每天 20 分钟，早上自然光"],
  },
];

const PAGE_META = {
  chat: { crumb: "教练台 / 今日", title: "今天，先把方法调对。" },
  library: { crumb: "方法资产 / 方法库", title: "方法不是收藏，是拿来试的。" },
  memory: { crumb: "长期记忆 / 我的档案", title: "它记得你走过的弯路。" },
  report: { crumb: "反馈闭环 / 学习报告", title: "用反馈，而不是感觉，判断效果。" },
};

function addMessage(role, type, text = "", data = null) {
  const m = { id: uid(), role, type, text, data, ts: Date.now() };
  state.messages.push(m);
  return m;
}

function ensureGreeting() {
  if (state.messages.length) return;
  addMessage(
    "agent",
    "text",
    "嗨，我是小法 👋 学法实验室的学习教练。\n\n我会先问你 **3 个问题**，再给方案。不是走流程——没有起点和约束的推荐，都是耍流氓。\n\n你可以直接点下面的例子，也可以用自己的话回答。"
  );
  addMessage("agent", "gate");
}

/* ------------------------------------------------------------------ init */
async function init() {
  // auth gate: server also redirects, but this covers expired sessions cleanly
  try {
    const me = await api("/api/me");
    CURRENT_USER = me.user;
  } catch {
    location.href = "/login.html";
    return;
  }

  try {
    let data;
    if (window.__METHODS__) {
      data = window.__METHODS__;
    } else {
      try {
        const live = await api("/api/methods");
        data = { methods: live.methods || [] };
      } catch {
        const res = await fetch("data/methods.json", { cache: "no-store" });
        if (!res.ok) throw new Error("methods.json not found");
        data = await res.json();
      }
    }
    METHODS = data.methods || [];
    METHOD_MAP = new Map(METHODS.map((m) => [m.id, m]));
    const navCount = $("#navMethods");
    if (navCount) navCount.textContent = String(METHODS.length);
  } catch (err) {
    $("#chatStream").innerHTML = `<div class="empty-state"><div class="big">⚠️</div><strong>方法库没有加载成功</strong><p>请确认服务已启动，然后刷新页面。</p></div>`;
    return;
  }

  let serverState = null;
  try {
    const saved = await api("/api/state");
    serverState = saved.state;
  } catch (err) {
    console.warn("state load failed", err);
  }

  if (serverState && typeof serverState === "object") {
    state = { ...defaultState(), ...serverState, version: 3 };
  } else {
    // v2: server state is the source of truth. Do not import another browser user's localStorage.
    state = defaultState();
  }

  if (!state.profile) state.profile = null;
  if (state.profile && (!state.profile.name || state.profile.name === "体验用户")) {
    state.profile.name = CURRENT_USER.username;
  }
  if (!state.messages?.length) ensureGreeting();
  state.version = 3;

  bindEvents();
  bindAccountUi();
  renderAll();
  checkHealth();
  // first sync: make the new state durable on the server
  if (!serverState) saveServerState();
}

/* ------------------------------------------------------------------ render */
function renderAll() {
  renderNav();
  renderSidebar();
  renderTopbar();
  renderChat();
  renderSuggestions();
  renderContext();
  if (state.activeView === "library") renderLibrary();
  if (state.activeView === "memory") renderMemory();
  if (state.activeView === "report") renderReport();
  persist();
}

function renderNav() {
  $$(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === state.activeView));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${state.activeView}`));
  const meta = PAGE_META[state.activeView] || PAGE_META.chat;
  $("#crumb").textContent = meta.crumb;
  $("#pageTitle").textContent = meta.title;
  const todayCount = state.plan ? state.plan.tasks.filter((t) => !t.done).length : 1;
  const badge = $("#navToday");
  if (badge) badge.textContent = String(todayCount || "✓");
}

function renderSidebar() {
  const answered = state.gate.answers.filter(Boolean).length;
  const pct = state.gate.complete ? 100 : (answered / 3) * 100;
  const bar = $("#gateMiniBar");
  if (bar) bar.style.width = `${pct}%`;
  const txt = $("#gateMiniText");
  if (txt) txt.textContent = state.gate.complete ? "3 / 3 · 已解锁" : `${answered} / 3`;

  const name = CURRENT_USER?.username || state.profile?.name || "学习用户";
  $("#userName").textContent = name;
  $("#userAvatar").textContent = String(name).slice(0, 1);
  $("#userSub").textContent = state.profile
    ? `@${CURRENT_USER?.username || "user"} · ${state.profile.domain} · 第 ${state.logs.length + 1} 天`
    : `@${CURRENT_USER?.username || "user"} · 等待第一次诊断`;
  $("#userStreak").innerHTML = `${computeStreak()}<span>d</span>`;
  bindAccountUi();
}

function renderTopbar() {
  const d = new Date();
  $("#todayLabel").textContent = `${d.getMonth() + 1}月${d.getDate()}日 · 周${"日一二三四五六"[d.getDay()]}`;
  const pill = $("#llmPill");
  const text = $("#llmText");
  if (!pill || !text) return;
  if (state.llmEnabled) {
    pill.classList.add("on");
    pill.classList.remove("off");
    text.textContent = state.llmModel || "AI 增强";
    pill.title = "AI 增强已开启";
  } else {
    pill.classList.add("on");
    pill.classList.remove("off");
    text.textContent = "服务端记忆";
    pill.title = "已登录，学习记录保存在服务端";
  }
}

function renderChat() {
  const stream = $("#chatStream");
  if (!stream) return;
  const demo = state.demo
    ? `<div class="demo-banner"><span>✨ 演示档案：${esc(state.demo.label)} · 含模拟学习记录</span><button data-action="reset">退出演示</button></div>`
    : "";
  stream.innerHTML = demo + state.messages.map(renderMessage).join("");
  const focus = new URLSearchParams(location.search).get("focus");
  const target = focus ? stream.querySelector(`.${focus}-card`) : null;
  if (target) {
    setTimeout(() => target.scrollIntoView({ block: "center" }), 120);
  } else {
    scrollChat();
  }
}

function renderMessage(m) {
  const user = m.role === "user";
  const time = timeLabel(m.ts);
  let content = "";
  if (m.type === "text") content = `<div class="bubble">${formatText(m.text)}</div>`;
  else if (m.type === "gate") content = renderGateCard();
  else if (m.type === "diagnosis") content = renderDiagnosisCard(m.data?.diagnosis);
  else if (m.type === "method") content = renderMethodCard(m.data);
  else if (m.type === "plan") content = renderPlanCard(m.data);
  else if (m.type === "summary") content = renderSummaryCard(m.data);
  else if (m.type === "switch") content = renderSwitchCard(m.data);
  else content = `<div class="bubble">${formatText(m.text || "")}</div>`;

  return `
    <div class="message ${user ? "user" : "agent"}">
      <div class="avatar">${user ? "你" : "法"}</div>
      <div class="msg-wrap">
        <div class="msg-meta"><strong>${user ? "你" : "小法 · 学习教练"}</strong><span>${time}</span></div>
        ${content}
      </div>
    </div>`;
}

function renderGateCard() {
  const answers = state.gate.answers;
  const step = Math.min(state.gate.step, 3);
  const complete = state.gate.complete;
  const segs = [0, 1, 2].map((i) => {
    const done = complete || Boolean(answers[i]);
    const active = !complete && i === step;
    return `<div class="gate-seg ${done ? "done" : ""} ${active ? "active" : ""}"><i></i></div>`;
  }).join("");

  const questions = GATE_QUESTIONS.map((q, i) => {
    const done = Boolean(answers[i]);
    const active = !complete && i === step;
    return `
      <div class="gate-q ${done ? "done" : ""} ${active ? "active" : ""}">
        <div class="q-index">${done ? "✓" : i + 1}</div>
        <div class="q-body">
          <div class="q-title">${esc(q.title)}</div>
          ${done ? `<div class="q-answer">${esc(answers[i])}</div>` : `<div class="q-hint">${esc(q.hint)}</div>`}
        </div>
      </div>`;
  }).join("");

  return `
    <div class="gate-card">
      <div class="gate-head">
        <div class="left"><span class="tag coral">硬门槛</span><div><div class="gate-title">先回答 3 个问题</div><div class="gate-sub">答完之前，我不会给出最终方案</div></div></div>
        <span class="tag ink">${complete ? "已解锁" : `${answers.filter(Boolean).length} / 3`}</span>
      </div>
      <div class="gate-progress">${segs}</div>
      <div class="gate-questions">${questions}</div>
      ${complete
        ? `<div class="gate-unlocked">✅ 三问完成：学情判断 → 方法匹配 → 今日任务卡已解锁</div>`
        : `<div class="gate-lock">🔒 还差 ${3 - answers.filter(Boolean).length} 问；现在给方案，等于瞎猜。</div>`}
    </div>`;
}

function renderDiagnosisCard(d) {
  if (!d) return `<div class="coach-card"><div class="card-body">学情数据生成中…</div></div>`;
  return `
    <div class="coach-card diagnosis-card">
      <div class="card-head">
        <div class="card-kicker"><span class="ico">01</span> 学情判断</div>
        <span class="tag gray">不是标签，是起点</span>
      </div>
      <div class="card-title">${esc(d.headline)}</div>
      <div class="card-body">
        <div class="diagnosis-grid">
          <div class="readiness-ring" style="--value:${d.readiness}">
            <div class="readiness-inner"><div class="readiness-num">${d.readiness}</div><div class="readiness-label">准备度 / 100</div></div>
          </div>
          <div class="diag-bullets">
            ${d.bullets.map((b) => `<div class="diag-row"><div class="k">${esc(b.label)}</div><div class="v">${esc(b.value)}</div></div>`).join("")}
          </div>
        </div>
        <div class="prescription">${esc(d.prescription)}</div>
      </div>
      <div class="card-foot"><span class="muted">下一步：只选一个方法，先试 3 天。</span><span class="tag mint">可验证 · 可退出</span></div>
    </div>`;
}

function renderMethodCard(data) {
  if (!data?.method) return "";
  const m = data.method;
  const alts = (data.alternatives || []).filter((x) => x.id !== m.id).slice(0, 2);
  const reasons = (m.reasons || []).slice(0, 3);
  const dots = "●".repeat(m.difficulty) + "○".repeat(Math.max(0, 5 - m.difficulty));
  return `
    <div class="coach-card method-card">
      <div class="card-head">
        <div class="card-kicker"><span class="ico">02</span> 方法匹配</div>
        <span class="tag mint">3 天微试验</span>
      </div>
      <div class="card-body">
        <div class="method-top">
          <div><div class="method-name">${esc(m.name)}</div><div class="method-en">${esc(m.en)}</div></div>
          <div class="fit-pill"><div class="fit-num">${m.fit || "—"}</div><div class="fit-label">匹配度 / 100</div></div>
        </div>
        <div class="method-meta">
          <span class="tag mint"><span class="evidence-badge">${m.evidence}</span> 证据 ${m.evidence}</span>
          <span class="tag gray">${esc(m.category)}</span>
          <span class="tag gray">约 ${m.time} 分钟</span>
          <span class="tag gray">难度 ${dots}</span>
        </div>
        <p class="method-quote">${esc(m.one_liner)}</p>
        <div class="method-why">
          <div class="why-row"><span>为什么是它</span><span>${esc(m.why)}</span></div>
          <div class="why-row"><span>3 天后怎么判断</span><span>${esc(m.metric)}</span></div>
        </div>
        ${reasons.length ? `<div class="reason-list">${reasons.map((r) => `<span class="reason-pill">${esc(r)}</span>`).join("")}</div>` : ""}
        <div class="plan-metric"><strong>什么时候该换：</strong>${esc(m.switch_when)}</div>
        ${alts.length ? `
          <div class="detail-section" style="margin-top:14px">
            <h4>备选方案（不是备胎，是对照组）</h4>
            <div class="reason-list">
              ${alts.map((a) => `<button class="chip" data-action="open-method" data-id="${escAttr(a.id)}">${esc(a.name)} · ${a.fit || "—"} 分</button>`).join("")}
            </div>
          </div>` : ""}
      </div>
      <div class="card-foot"><span class="muted">方法来自方法库，不是现场编的。</span><span class="tag gold">证据 ${m.evidence}</span></div>
    </div>`;
}

function renderPlanCard(data) {
  if (!data?.plan) return "";
  const plan = data.plan;
  const method = data.method;
  const day = data.day || 1;
  const done = plan.tasks.filter((t) => t.done).length;
  const allDone = done === plan.tasks.length;
  return `
    <div class="coach-card plan-card">
      <div class="card-head">
        <div class="card-kicker"><span class="ico">03</span> 今日任务卡</div>
        <span class="tag gold">第 ${day} 天</span>
      </div>
      <div class="card-body">
        <div class="plan-top">
          <div><div class="plan-title">今天只做这 ${plan.tasks.length} 件事</div><div class="plan-sub">${esc(method.name)} · ${esc(method.category)}</div></div>
          <div class="plan-time">${plan.totalMinutes}<span>min</span></div>
        </div>
        <div class="task-list">
          ${plan.tasks.map((t) => `
            <div class="task ${t.done ? "done" : ""}">
              <button class="task-check" data-action="toggle-task" data-task="${escAttr(t.id)}" aria-label="标记完成">✓</button>
              <div class="task-body">
                <div class="task-title">${esc(t.title)}</div>
                <div class="task-desc">${esc(t.desc)}</div>
                <div class="task-meta"><span>产出：<span class="out">${esc(t.output)}</span></span><span>·</span><span>可检查</span></div>
              </div>
              <div class="task-min">${t.minutes}′</div>
            </div>`).join("")}
        </div>
        <div class="plan-metric"><strong>完成标准：</strong>${esc(plan.success)}<br><strong>今天只改一个变量：</strong>先按卡执行，不临时加码。</div>
      </div>
      <div class="card-foot">
        <span class="muted">已完成 ${done}/${plan.tasks.length} · 完成后请反馈</span>
        <button class="btn ${allDone ? "coral" : "primary"}" data-action="open-feedback">${allDone ? "全部完成，去打卡 ✅" : "完成打卡，反馈今天"}</button>
      </div>
    </div>`;
}

function renderSummaryCard(data) {
  if (!data?.log) return "";
  const { log, decision, method, nextDay, nextMethod } = data;
  const color = log.effect >= 70 ? "#2b8a5b" : log.effect >= 55 ? "#c6922e" : "#ff6b4a";
  const cls = log.effect >= 70 ? "" : log.effect >= 55 ? "warn" : "bad";
  return `
    <div class="coach-card summary-card ${cls}">
      <div class="card-head">
        <div class="card-kicker"><span class="ico">04</span> 今日总结</div>
        <span class="tag ${decision.action === "keep" ? "mint" : decision.action === "switch" ? "coral" : "gold"}">${esc(decision.type)}</span>
      </div>
      <div class="card-body">
        <div class="summary-grid">
          <div class="effect-ring" style="background:conic-gradient(${color} calc(${log.effect} * 1%), #eee8dc 0)">
            <div class="effect-inner"><div class="effect-num">${log.effect}</div><div class="effect-label">今日效果分</div></div>
          </div>
          <div>
            <div class="summary-headline">${esc(decision.headline)}</div>
            <div class="summary-reason">${esc(decision.reason)}</div>
            <div class="summary-stats">
              <span class="stat-pill">完成率 <b>${log.completion}%</b></span>
              <span class="stat-pill">难度 <b>${log.difficulty}/5</b></span>
              <span class="stat-pill">自测 <b>${log.score}</b></span>
              <span class="stat-pill">投入 <b>${log.minutes || method.time} 分钟</b></span>
            </div>
          </div>
        </div>
        ${log.note ? `<div class="memory-note">📝 你的原话：${esc(log.note)}</div>` : ""}
        <div class="next-day">
          <div class="next-day-title">🌤 明天学什么（已排好）</div>
          <ol>${(nextDay || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        </div>
      </div>
      <div class="card-foot">
        <span class="muted">${nextMethod ? "已触发换法，下面看新任务卡。" : "保持方法，明天只加一个变量。"}</span>
        <button class="btn ghost" data-action="view" data-view="report">看趋势 →</button>
      </div>
    </div>`;
}

function renderSwitchCard(data) {
  if (!data?.from || !data?.to) return "";
  return `
    <div class="coach-card switch-card">
      <div class="card-head">
        <div class="card-kicker"><span class="ico">↺</span> 换法建议</div>
        <span class="tag coral">不是失败，是调试</span>
      </div>
      <div class="card-body">
        <div class="switch-path">
          <span class="switch-old">${esc(data.from.name)}</span>
          <span class="switch-arrow">→</span>
          <span class="switch-new">${esc(data.to.name)}</span>
        </div>
        <div class="switch-reason">${esc(data.decision?.reason || "你主动选择了新的方法。先试 3 天，用反馈决定去留。")}</div>
        <div class="plan-metric"><strong>新方法的判断标准：</strong>${esc(data.to.metric)}</div>
      </div>
      <div class="card-foot"><span class="muted">旧方法不是没用，只是不适合现在的你。</span><span class="tag gray">${esc(data.to.category)}</span></div>
    </div>`;
}

/* ------------------------------------------------------------------ context */
function renderContext() {
  const panel = $("#contextPanel");
  if (!panel) return;
  const answered = state.gate.answers.filter(Boolean).length;
  const pct = state.gate.complete ? 100 : (answered / 3) * 100;
  const tasks = state.plan?.tasks || [];
  const done = tasks.filter((t) => t.done).length;
  const lastLog = state.logs[state.logs.length - 1];
  const method = state.methodId ? METHOD_MAP.get(state.methodId) : null;

  panel.innerHTML = `
    ${state.demo ? `<div class="demo-banner"><span>✨ ${esc(state.demo.label)}</span><button data-action="reset">退出</button></div>` : ""}
    <div class="ctx-card">
      <div class="ctx-head"><div class="ctx-title">三问门槛</div><div class="ctx-dots">${[0, 1, 2].map((i) => `<i class="${state.gate.complete || state.gate.answers[i] ? "done" : i === state.gate.step ? "on" : ""}"></i>`).join("")}</div></div>
      <div class="ctx-gate-line"><span>${state.gate.complete ? "已解锁方案" : `还差 ${3 - answered} 问`}</span><span>${answered}/3</span></div>
      <div class="ctx-gate-sub">${state.gate.complete ? "三问已进入记忆，后续不再重复问。" : "未答完前，只澄清问题，不给最终方案。"}</div>
      <div class="ctx-progress"><span style="width:${pct}%"></span></div>
    </div>
    <div class="ctx-card">
      <div class="ctx-head"><div class="ctx-title">今天</div><span class="tag ${state.plan ? "mint" : "gray"}">${state.plan ? `第 ${state.logs.length + 1} 天` : "未开始"}</span></div>
      ${state.plan ? `
        <div class="ctx-method">${esc(method?.name || "今日方法")}</div>
        <div class="ctx-method-sub">${done}/${tasks.length} 个任务 · 约 ${state.plan.totalMinutes} 分钟</div>
        <div class="ctx-task-progress"><div class="bar"><span style="width:${tasks.length ? (done / tasks.length) * 100 : 0}%"></span></div><div class="num">${done}/${tasks.length}</div></div>
        <button class="ctx-btn" data-action="open-feedback">完成打卡 →</button>
      ` : `
        <div class="ctx-gate-sub">完成三问后，这里会出现一张今天能执行、晚上能验收的任务卡。</div>
        <button class="ctx-btn" data-action="focus-input">去回答第 ${Math.min(answered + 1, 3)} 问 →</button>
      `}
    </div>
    <div class="ctx-card">
      <div class="ctx-head"><div class="ctx-title">它记得你</div><span class="tag gray">${state.logs.length} 次反馈</span></div>
      <div class="ctx-memory-line">${lastLog ? `最近一次：${lastLog.effect} 分` : "还没有学习记忆"}</div>
      <div class="ctx-memory-sub">${lastLog ? `第 ${lastLog.day} 天 · ${esc(lastLog.methodName)}<br>${esc(lastLog.note || "已记录完成率、难度、自测和状态。")}` : "完成第一次打卡后，它会开始记录什么有效、什么无效。"}</div>
      <button class="ctx-link" data-action="view" data-view="memory">查看记忆时间线 →</button>
    </div>
    <div class="ctx-card ctx-principles">
      <div class="ctx-title">教练原则</div>
      <ul>
        <li><span>01</span> 不替你做决定，只帮你看清代价。</li>
        <li><span>02</span> 每次只改一个变量。</li>
        <li><span>03</span> 效果不好就换法，不硬扛。</li>
      </ul>
    </div>`;
}

function renderSuggestions() {
  const box = $("#suggestions");
  if (!box) return;
  let chips = [];
  if (!state.gate.complete) {
    const q = GATE_QUESTIONS[state.gate.step] || GATE_QUESTIONS[0];
    chips = q.chips;
  } else if (!state.plan) {
    chips = ["帮我生成方案", "先看方法库", "我有点急，能快点吗"];
  } else {
    chips = ["今天任务是什么？", "我想换方法", "复盘今天", "看看我的记忆"];
    if (state.logs.length === 0) chips.unshift("我完成了，怎么反馈？");
  }
  box.innerHTML = chips.map((c) => `<button class="chip" data-action="chip" data-text="${escAttr(c)}">${esc(c)}</button>`).join("");
  const input = $("#messageInput");
  if (input) {
    input.placeholder = state.gate.complete
      ? "和教练继续聊，或点上面的快捷问题…"
      : `回答第 ${state.gate.step + 1} 问：${GATE_QUESTIONS[state.gate.step]?.title || ""}`;
  }
}

function scrollChat() {
  const el = $("#chatStream");
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 80);
  });
}

function showTyping() {
  const stream = $("#chatStream");
  if (!stream || $("#typingIndicator")) return;
  const div = document.createElement("div");
  div.id = "typingIndicator";
  div.className = "message";
  div.innerHTML = `<div class="avatar">法</div><div class="msg-wrap"><div class="msg-meta"><strong>小法 · 学习教练</strong><span>正在想</span></div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>`;
  stream.appendChild(div);
  scrollChat();
}

function hideTyping() {
  const el = $("#typingIndicator");
  if (el) el.remove();
}

/* ------------------------------------------------------------------ gate flow */
function looksLikePlanRequest(text) {
  const t = text.trim();
  return (
    /^(直接|快点|别问|跳过|不要问)/.test(t) ||
    /(别问|跳过).*(问题|三问)/.test(t) ||
    /(直接|马上).*(给|出|生成).*(方案|计划|方法)/.test(t)
  );
}

function handleGate(text) {
  const t = text.trim();
  if (t.length < 3) {
    addMessage("agent", "text", "再具体一点。你可以只给我一个场景 + 一个最近的表现，我就能开始判断。");
    renderAll();
    return;
  }
  if (looksLikePlanRequest(t)) {
    const q = GATE_QUESTIONS[state.gate.step];
    addMessage("agent", "text", `我理解你着急。但还差第 ${state.gate.step + 1} 问：**${q.title}**\n\n这不是拖延——没有这个信息，方案只能靠猜。你先回答这一问，我马上继续。`);
    renderAll();
    return;
  }

  state.gate.answers[state.gate.step] = t;
  state.gate.step += 1;

  if (state.gate.step < 3) {
    const next = GATE_QUESTIONS[state.gate.step];
    addMessage("agent", "text", `收到 ✅ 第 ${state.gate.step + 1} 问：**${next.title}**\n\n${next.hint}`);
    renderAll();
    return;
  }

  state.gate.complete = true;
  addMessage("agent", "text", "三问完成 ✅ 现在我做三件事：判断学情 → 匹配方法 → 生成今天能执行的任务卡。\n\n先说明：**方案不是终局，是一个 3 天微试验。**");
  renderAll();
  busy = true;
  showTyping();
  setTimeout(() => {
    generatePlan();
    hideTyping();
    busy = false;
    renderAll();
  }, 750);
}

function generatePlan() {
  if (!state.gate.complete) return;
  const profile = E.buildProfile(state.gate.answers, CURRENT_USER?.username || "学习用户");
  const candidates = E.matchMethods(METHODS, profile);
  const method = candidates[0];
  if (!method) return;
  state.profile = profile;
  state.match = candidates;
  state.methodId = method.id;
  state.diagnosis = E.buildDiagnosis(profile, method);
  state.plan = E.buildTasks(profile, method);
  state.lastSummary = null;
  state.trials = [];
  state.logs = [];
  startTrial(method);

  addMessage("agent", "diagnosis", "", { diagnosis: state.diagnosis });
  addMessage("agent", "method", "", { method, alternatives: candidates.slice(0, 3) });
  addMessage("agent", "plan", "", { plan: state.plan, method, profile, day: 1 });
  addMessage(
    "agent",
    "text",
    "任务卡已经生成。做完之后，点 **「完成打卡，反馈今天」**，告诉我四件事：完成度、难度、自测分、今天最卡的地方。\n\n我会根据你的反馈做今日总结；如果方法不适合，我会**直接给你换法**，并把明天学什么排好。"
  );
  persist();
}

/* ------------------------------------------------------------------ coach flow */
async function sendMessage(text) {
  const t = String(text || "").trim();
  if (!t || busy) return;
  const input = $("#messageInput");
  if (input) {
    input.value = "";
    autoResize(input);
  }
  addMessage("user", "text", t);
  renderChat();
  renderSuggestions();
  persist();

  if (!state.gate.complete) {
    handleGate(t);
    return;
  }

  if (!state.plan) {
    busy = true;
    showTyping();
    await sleep(450);
    generatePlan();
    hideTyping();
    busy = false;
    renderAll();
    return;
  }

  busy = true;
  showTyping();
  await sleep(350);
  try {
    await handleCoach(t);
  } finally {
    hideTyping();
    busy = false;
    renderAll();
  }
}

async function handleCoach(text) {
  const t = text.trim();

  if (/换.*方法|换个方法|不适合|没用|效果不好|想换/.test(t)) {
    manualSwitch("你主动提出换法。先不否定旧方法，我们只控制一个变量：换一个更匹配当前瓶颈的方法。");
    return;
  }

  if (/复盘|总结|今天怎么样|效果如何/.test(t)) {
    showLastSummary();
    return;
  }

  if (/今天.*(任务|学什么)|任务卡|计划|做什么/.test(t)) {
    addMessage("agent", "text", "今天还是这张卡。先把第 2 步做完，再来反馈；不要临时加码。");
    addMessage("agent", "plan", "", { plan: state.plan, method: METHOD_MAP.get(state.methodId), profile: state.profile, day: state.logs.length + 1 });
    return;
  }

  if (/记忆|档案|了解我|记得我/.test(t)) {
    addMessage("agent", "text", "我记得的不是聊天记录，而是能影响下一次决策的变量：你的目标、起点、时间约束、每次打卡的完成率/难度/自测，以及哪种方法对你有效。");
    setView("memory");
    return;
  }

  if (/方法库|有哪些方法|方法卡|换个领域/.test(t)) {
    addMessage("agent", "text", "方法库在左边。你可以按领域筛，也可以直接告诉我目标，我帮你缩小到 3 个候选。");
    setView("library");
    return;
  }

  if (/你好|在吗|hi|hello|嗨/.test(t)) {
    addMessage("agent", "text", `我在 🙌 今天是第 ${state.logs.length + 1} 天。你现在最该做的，是完成「${METHOD_MAP.get(state.methodId)?.name || "今日方法"}」的任务卡；卡住了就告诉我卡在哪一步。`);
    return;
  }

  if (/不想|没时间|太难|焦虑|崩溃|坚持不了|累/.test(t)) {
    addMessage("agent", "text", "先不解决「坚持」，先解决「启动」。把今天任务卡缩成最小版本：只做第 1 步，5 分钟，做完就停。\n\n你不是懒，你可能是任务设计得太大。明天我会把难度再降一档。");
    return;
  }

  if (/怎么|如何|具体|步骤/.test(t)) {
    const m = METHOD_MAP.get(state.methodId);
    if (m) {
      addMessage("agent", "text", `今天这个方法叫「${m.name}」。具体只做三步：\n\n1. ${m.steps[0]}\n2. ${m.steps[1]}\n3. ${m.steps[2]}\n\n不要一次做完整套；先做出一个可检查的产出。`);
      return;
    }
  }

  if (state.llmEnabled) {
    try {
      const reply = await askLLM(t);
      if (reply) {
        addMessage("agent", "text", reply);
        return;
      }
    } catch {
      /* fall through to local */
    }
  }

  const m = METHOD_MAP.get(state.methodId);
  addMessage(
    "agent",
    "text",
    `我在听。先把这句话放进今天的判断里：**${t}**\n\n现在不需要更多建议，只需要一个动作——回到「${m?.name || "今日方法"}」的任务卡，完成最小的一步。完成后打卡，我会用你的反馈决定明天是加难度、降难度，还是换法。`
  );
}

async function askLLM(message) {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context: {
        profile: state.profile,
        method: METHOD_MAP.get(state.methodId)?.name,
        plan: state.plan?.tasks?.map((t) => ({ title: t.title, done: t.done })),
        recentLogs: state.logs.slice(-5),
      },
    }),
  });
  if (!res.ok) throw new Error("LLM unavailable");
  const data = await res.json();
  return data.text;
}

/* ------------------------------------------------------------------ tasks / feedback */
function toggleTask(taskId) {
  if (!state.plan) return;
  const task = state.plan.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  persist();
  renderAll();
  scrollChat();
}

function openFeedback() {
  if (!state.plan) {
    toast("先完成三问，拿到今天的任务卡。");
    return;
  }
  const total = state.plan.tasks.length;
  const done = state.plan.tasks.filter((t) => t.done).length;
  feedbackDraft = {
    completion: done ? Math.round((done / total) * 100) : 80,
    difficulty: 3,
    score: 70,
    mood: 4,
    note: "",
  };
  renderFeedbackModal();
}

function renderFeedbackModal() {
  const method = METHOD_MAP.get(state.methodId);
  const d = feedbackDraft;
  const modal = `
    <div class="modal-backdrop">
      <div class="modal narrow" role="dialog" aria-modal="true" aria-label="今日反馈">
        <form id="feedbackForm">
          <div class="modal-head">
            <div><h3>今日反馈 · 让明天更准</h3><p>${esc(method?.name || "今日方法")} · 你不需要写得漂亮，只要真实。</p></div>
            <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">✕</button>
          </div>
          <div class="modal-body">
            <div class="feedback-grid">
              <div class="feedback-block">
                <div class="feedback-label"><span>完成度</span><small>不是「做了多久」，是「完成了多少」</small></div>
                <div class="range-row"><input id="fbCompletion" type="range" min="0" max="100" step="5" value="${d.completion}" data-range="completion" /><span class="range-value" data-range-value="completion">${d.completion}%</span></div>
              </div>
              <div class="feedback-block">
                <div class="feedback-label"><span>今天的难度</span><small>1 = 太轻松，5 = 快撑不住</small></div>
                <div class="difficulty-row">
                  ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="diff-btn ${d.difficulty === n ? "active" : ""}" data-action="diff" data-diff="${n}">${n}</button>`).join("")}
                </div>
              </div>
              <div class="feedback-block">
                <div class="feedback-label"><span>自测 / 产出质量</span><small>如果没有分数，就按 0-100 估一个</small></div>
                <div class="range-row"><input id="fbScore" type="range" min="0" max="100" step="5" value="${d.score}" data-range="score" /><span class="range-value" data-range-value="score">${d.score}</span></div>
              </div>
              <div class="feedback-block">
                <div class="feedback-label"><span>今天的状态</span><small>状态会影响判断，不是借口</small></div>
                <div class="mood-row">
                  ${E.MOODS.map((m) => `<button type="button" class="mood-btn ${d.mood === m.value ? "active" : ""}" data-action="mood" data-mood="${m.value}">${m.emoji}<small>${m.label}</small></button>`).join("")}
                </div>
              </div>
              <div class="feedback-block">
                <div class="feedback-label"><span>今天最卡的地方</span><small>越具体，越容易被换法</small></div>
                <textarea id="fbNote" class="feedback-note" placeholder="例如：跟读能跟上，但一脱稿就卡；或者：案例题知道规则，但写不出依据。">${esc(d.note)}</textarea>
              </div>
              <div class="feedback-tip">🔍 我会用这四个信号判断：完成率 <b>&lt;60%</b> → 先降门槛；效果分 <b>&lt;58</b> 或自测 <b>&lt;60</b> → 换方法；难度 <b>=5</b> 且效果低 → 认知过载，换更轻的方法。</div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn ghost" data-action="close-modal">稍后再说</button>
            <button type="submit" class="btn coral">提交反馈，生成总结 →</button>
          </div>
        </form>
      </div>
    </div>`;
  showModal(modal);
}

function readFeedbackForm() {
  return {
    completion: clamp(parseInt($("#fbCompletion")?.value || "80", 10), 0, 100),
    difficulty: clamp(parseInt(feedbackDraft?.difficulty || 3, 10), 1, 5),
    score: clamp(parseInt($("#fbScore")?.value || "70", 10), 0, 100),
    mood: clamp(parseInt(feedbackDraft?.mood || 4, 10), 1, 5),
    note: ($("#fbNote")?.value || "").trim(),
  };
}

function submitFeedback() {
  if (!state.plan) return;
  const fb = readFeedbackForm();
  completeDay(fb);
}

function completeDay(fb) {
  const method = METHOD_MAP.get(state.methodId);
  if (!method) return;
  const effect = E.computeEffect(fb);
  const decision = E.decideOutcome({ ...fb, effect });
  const log = {
    id: uid(),
    date: iso(),
    day: state.logs.length + 1,
    ...fb,
    effect,
    methodId: method.id,
    methodName: method.name,
    minutes: state.plan?.totalMinutes || method.time,
  };
  state.logs.push(log);

  updateTrial(log, decision);
  let nextMethod = null;
  if (decision.action === "switch") {
    nextMethod = METHOD_MAP.get(method.switch_to) || (state.match || []).find((m) => m.id !== method.id) || null;
    if (nextMethod?.id === method.id) nextMethod = null;
    decision.nextMethod = nextMethod;
  }

  const nextDay = E.buildNextDay(state.profile, method, decision);
  const summary = { log, decision, method, nextDay, nextMethod };
  state.lastSummary = summary;
  addMessage("agent", "summary", "", summary);

  if (nextMethod) {
    addMessage("agent", "switch", "", { from: method, to: nextMethod, decision });
    state.profile.failedMethods = Array.from(new Set([...(state.profile.failedMethods || []), method.id]));
    state.methodId = nextMethod.id;
    state.match = E.matchMethods(METHODS, state.profile);
    state.diagnosis = E.buildDiagnosis(state.profile, nextMethod);
    state.plan = E.buildTasks(state.profile, nextMethod);
    startTrial(nextMethod);
    addMessage("agent", "plan", "", { plan: state.plan, method: nextMethod, profile: state.profile, day: state.logs.length + 1 });
    addMessage("agent", "text", `换法不是判你失败，是把变量控制住。明天先用「${nextMethod.name}」做一次最小练习；如果 3 天后效果仍低，我们会继续换，直到找到能让你产出结果的版本。`);
  } else if (decision.action === "adjust") {
    addMessage("agent", "text", "今天先不换法。明天把任务缩到最小版本：只做前两步，10-15 分钟，先恢复完成感。完成率上来后，再判断方法本身。");
  } else {
    addMessage("agent", "text", "今天这个方法值得保留。明天只加一个变量：素材/题目难一点，或自测严一点；不要同时加时长和难度。");
  }

  closeModal();
  persist();
  renderAll();
  toast(decision.action === "switch" ? "已记录反馈，并为你换了方法。" : "已记录反馈，明天计划已更新。");
  setTimeout(scrollChat, 80);
}

function startTrial(method) {
  if (!method) return null;
  const existing = state.trials.find((t) => t.methodId === method.id && t.status === "active");
  if (existing) return existing;
  const trial = {
    id: uid(),
    methodId: method.id,
    methodName: method.name,
    startDate: iso(),
    endDate: null,
    status: "active",
    logIds: [],
    avgCompletion: null,
    avgEffect: null,
  };
  state.trials.push(trial);
  return trial;
}

function updateTrial(log, decision) {
  let trial = state.trials.find((t) => t.methodId === log.methodId && t.status === "active");
  if (!trial) trial = startTrial(METHOD_MAP.get(log.methodId));
  if (!trial) return null;
  trial.logIds.push(log.id);
  const logs = state.logs.filter((l) => trial.logIds.includes(l.id));
  trial.avgCompletion = avg(logs.map((l) => l.completion));
  trial.avgEffect = avg(logs.map((l) => l.effect));
  if (decision.action === "switch") {
    trial.status = "switched";
    trial.endDate = log.date;
    trial.reason = decision.reason;
  }
  return trial;
}

function manualSwitch(reason) {
  const old = METHOD_MAP.get(state.methodId);
  if (!old) return;
  const next = METHOD_MAP.get(old.switch_to) || (state.match || []).find((m) => m.id !== old.id);
  if (!next) {
    toast("方法库里暂时没有更合适的替代，先保持当前方法。");
    return;
  }
  const trial = state.trials.find((t) => t.methodId === old.id && t.status === "active");
  if (trial) {
    trial.status = "switched";
    trial.endDate = iso();
    trial.reason = reason;
  }
  state.profile.failedMethods = Array.from(new Set([...(state.profile.failedMethods || []), old.id]));
  state.methodId = next.id;
  state.plan = E.buildTasks(state.profile, next);
  state.match = E.matchMethods(METHODS, state.profile);
  state.diagnosis = E.buildDiagnosis(state.profile, next);
  startTrial(next);
  addMessage("agent", "text", reason);
  addMessage("agent", "switch", "", { from: old, to: next, decision: { reason } });
  addMessage("agent", "plan", "", { plan: state.plan, method: next, profile: state.profile, day: state.logs.length + 1 });
  persist();
  renderAll();
  toast(`已换到「${next.name}」，任务卡已更新。`);
}

function showLastSummary() {
  if (!state.logs.length) {
    addMessage("agent", "text", "还没有可复盘的反馈。先完成今天的任务，点「完成打卡」，我才能用数据总结，而不是用感觉。");
    renderAll();
    return;
  }
  if (state.lastSummary) {
    addMessage("agent", "summary", "", state.lastSummary);
    renderAll();
    return;
  }
  const log = state.logs[state.logs.length - 1];
  const method = METHOD_MAP.get(log.methodId) || METHOD_MAP.get(state.methodId);
  const decision = E.decideOutcome(log);
  const nextMethod = decision.action === "switch" ? METHOD_MAP.get(method?.switch_to) : null;
  const data = { log, decision, method, nextDay: E.buildNextDay(state.profile, method, { ...decision, nextMethod }), nextMethod };
  state.lastSummary = data;
  addMessage("agent", "summary", "", data);
  renderAll();
}

/* ------------------------------------------------------------------ library */
function renderLibrary() {
  const filters = ["全部", ...E.DOMAINS];
  const counts = Object.fromEntries(E.DOMAINS.map((d) => [d, METHODS.filter((m) => m.domains.includes(d)).length]));
  counts["全部"] = METHODS.length;
  $("#domainFilters").innerHTML = filters
    .map((d) => `<button class="filter-chip ${state.libraryFilter === d ? "active" : ""}" data-action="filter-domain" data-domain="${escAttr(d)}">${esc(d)} <span style="opacity:.55">${counts[d] || 0}</span></button>`)
    .join("");
  const search = $("#librarySearch");
  if (search) search.value = state.librarySearch || "";
  renderMethodGrid();
}

function renderMethodGrid() {
  const grid = $("#methodGrid");
  if (!grid) return;
  const q = (state.librarySearch || "").toLowerCase().trim();
  const list = METHODS.filter((m) => {
    const domainOk = state.libraryFilter === "全部" || m.domains.includes(state.libraryFilter);
    const text = `${m.name} ${m.en} ${m.category} ${m.domains.join(" ")} ${m.one_liner} ${m.goal || ""}`.toLowerCase();
    return domainOk && (!q || text.includes(q));
  });
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="big">🔍</div><strong>没有找到匹配的方法</strong><p>换个关键词，或切回「全部」。</p></div>`;
    return;
  }
  grid.innerHTML = list
    .map((m) => {
      const meta = E.DOMAIN_META[m.domains[0]] || E.DOMAIN_META["通用"];
      return `<button class="method-tile" data-action="open-method" data-id="${escAttr(m.id)}">
        <div class="method-tile-top"><div><div class="method-tile-name">${esc(m.name)}</div><div class="method-tile-en">${esc(m.en)}</div></div><span class="evidence">${m.evidence}</span></div>
        <p>${esc(m.one_liner)}</p>
        <div class="method-tile-foot"><span class="domain-dot"><i style="background:${meta.color}"></i>${esc(m.domains.slice(0, 2).join(" / "))}</span><span class="method-tile-time">${m.time} min · 难度 ${m.difficulty}/5</span></div>
      </button>`;
    })
    .join("");
}

function openMethod(id) {
  const m = METHOD_MAP.get(id);
  if (!m) return;
  let fit = null;
  if (state.profile) {
    fit = E.matchMethods(METHODS, state.profile).find((x) => x.id === id);
  }
  const meta = E.DOMAIN_META[m.domains[0]] || E.DOMAIN_META["通用"];
  const modal = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escAttr(m.name)}">
        <div class="modal-head">
          <div>
            <div class="method-detail-top"><div><div class="method-detail-name">${esc(m.name)}</div><div class="method-detail-en">${esc(m.en)}</div></div><span class="tag mint"><span class="evidence-badge">${m.evidence}</span> 证据 ${m.evidence}</span></div>
            <p>${esc(m.one_liner)}</p>
          </div>
          <button class="modal-close" data-action="close-modal" aria-label="关闭">✕</button>
        </div>
        <div class="modal-body">
          <div class="method-meta">
            <span class="tag gray">${esc(meta.emoji)} ${esc(m.domains.join(" / "))}</span>
            <span class="tag gray">${esc(m.category)}</span>
            <span class="tag gray">约 ${m.time} 分钟</span>
            <span class="tag gray">难度 ${m.difficulty}/5</span>
            ${fit ? `<span class="tag mint">当前匹配 ${fit.fit} 分</span>` : ""}
          </div>
          <div class="detail-section"><h4>为什么有效</h4><p>${esc(m.why)}</p></div>
          <div class="detail-section"><h4>执行步骤</h4><ol>${m.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></div>
          <div class="detail-two">
            <div class="detail-box"><div class="t">成功指标</div><div class="c">${esc(m.metric)}</div></div>
            <div class="detail-box"><div class="t">时间 / 难度</div><div class="c">约 ${m.time} 分钟 · 难度 ${m.difficulty}/5<br>证据：${m.evidence}（${esc(m.evidence_note)}）</div></div>
          </div>
          <div class="detail-section"><h4>配套资料（三件套）</h4><ul>${m.materials.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="detail-two">
            <div class="detail-box"><div class="t">常见失败</div><div class="c">${m.fail.map(esc).join("；")}</div></div>
            <div class="detail-box"><div class="t">什么时候换</div><div class="c">${esc(m.switch_when)}</div></div>
          </div>
          <div class="source-note">来源：${esc(m.source)}。方法卡只提炼可执行结构，不复制个人表达；证据等级 C 的方法请在 3 天微试验中谨慎验证。</div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" data-action="close-modal">先看看</button>
          <button class="btn primary" data-action="try-method" data-id="${escAttr(m.id)}">用这个方法试 3 天 →</button>
        </div>
      </div>
    </div>`;
  showModal(modal);
}

function tryMethod(id) {
  if (!state.gate.complete) {
    closeModal();
    toast("先完成三问。方法可以选，但不能跳过起点。");
    return;
  }
  const next = METHOD_MAP.get(id);
  const old = METHOD_MAP.get(state.methodId);
  if (!next) return;
  if (next.id === old?.id) {
    closeModal();
    toast("这就是你当前的方法，先按任务卡做完今天。");
    return;
  }
  const trial = state.trials.find((t) => t.methodId === old?.id && t.status === "active");
  if (trial) {
    trial.status = "switched";
    trial.endDate = iso();
    trial.reason = "用户主动选择";
  }
  state.methodId = next.id;
  state.plan = E.buildTasks(state.profile, next);
  state.match = E.matchMethods(METHODS, state.profile);
  state.diagnosis = E.buildDiagnosis(state.profile, next);
  startTrial(next);
  addMessage("agent", "switch", "", { from: old, to: next, decision: { reason: "你主动选择了这个方法。先试 3 天，用反馈决定去留。" } });
  addMessage("agent", "plan", "", { plan: state.plan, method: next, profile: state.profile, day: state.logs.length + 1 });
  closeModal();
  persist();
  renderAll();
  toast(`已切换为「${next.name}」，今天先按新卡执行。`);
}

/* ------------------------------------------------------------------ memory */
function computeStreak() {
  if (!state.logs.length) return 0;
  const dates = new Set(state.logs.map((l) => l.date));
  let cursor = new Date();
  if (!dates.has(iso(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  while (dates.has(iso(cursor))) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/* ------------------------------------------------------------------ account / suggestions */
function openSuggestion() {
  showModal(`
    <div class="modal-backdrop">
      <div class="modal narrow" role="dialog" aria-modal="true" aria-label="提交建议">
        <div class="modal-head">
          <div><h3>提交问题 / 方法建议</h3><p>管理员会在后台看到；处理结果会回到「我的建议」。</p></div>
          <button class="modal-close" data-action="close-modal">✕</button>
        </div>
        <form id="suggestionForm">
          <div class="modal-body">
            <label class="feedback-label"><span>类型</span><small>问题反馈 / 方法建议</small></label>
            <select id="sgType" class="suggestion-select">
              <option value="issue">系统问题 / 使用卡点</option>
              <option value="method">方法建议 / 希望增加的方法</option>
            </select>
            <label class="feedback-label" style="margin-top:13px"><span>标题</span><small>一句话说清</small></label>
            <input id="sgTitle" class="suggestion-input" maxlength="120" placeholder="例如：希望增加播客听力方法 / 任务卡按钮点不动" />
            <label class="feedback-label" style="margin-top:13px"><span>具体内容</span><small>越具体越容易处理</small></label>
            <textarea id="sgContent" class="feedback-note" maxlength="5000" placeholder="描述场景、你期望的改进，或你希望加入的方法。"></textarea>
            <div class="feedback-tip">🔎 提交后会进入管理员工单；你可以在「我的记忆 → 我的建议」查看状态和回复。</div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn ghost" data-action="close-modal">取消</button>
            <button type="submit" class="btn coral">提交给管理员 →</button>
          </div>
        </form>
      </div>
    </div>`);
}

async function submitSuggestion() {
  const type = $("#sgType")?.value || "issue";
  const title = $("#sgTitle")?.value.trim() || "";
  const content = $("#sgContent")?.value.trim() || "";
  if (title.length < 4 || content.length < 4) {
    toast("标题和内容至少各写 4 个字。");
    return;
  }
  try {
    await api("/api/suggestions", { method: "POST", body: { type, title, content } });
    closeModal();
    toast("已提交。管理员处理后会在这里看到回复。");
  } catch (err) {
    toast(err.message || "提交失败");
  }
}

async function loadMySuggestions() {
  const box = $("#mySuggestions");
  if (!box) return;
  try {
    const data = await api("/api/suggestions");
    const list = data.suggestions || [];
    if (!list.length) {
      box.innerHTML = `<div class="memory-note">还没有提交过建议。遇到问题，或想增加一个方法，点左下角「提建议 / 报错」。</div>`;
      return;
    }
    const labels = { pending: "待处理", reviewing: "处理中", resolved: "已解决", rejected: "不采纳" };
    box.innerHTML = list.map((s) => `
      <div class="suggestion-row">
        <div class="suggestion-row-top"><b>${esc(s.title)}</b><span class="badge-status ${s.status === "resolved" ? "active" : "switched"}">${labels[s.status] || s.status}</span></div>
        <div class="suggestion-row-meta">${s.type === "method" ? "方法建议" : "问题反馈"} · ${dateLabel(new Date(s.created_at).toISOString())}</div>
        ${s.admin_reply ? `<div class="suggestion-reply">管理员回复：${esc(s.admin_reply)}</div>` : ""}
      </div>`).join("");
  } catch {
    box.innerHTML = `<div class="memory-note">建议加载失败，请刷新重试。</div>`;
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  location.href = "/login.html";
}

function renderMemory() {
  const box = $("#memoryContent");
  if (!box) return;
  const logs = state.logs;
  const trials = state.trials;
  const profile = state.profile;
  const avgEffect = avg(logs.map((l) => l.effect));
  const avgCompletion = avg(logs.map((l) => l.completion));

  if (!profile || !logs.length) {
    box.innerHTML = `
      <div class="memory-top"><div><div class="kicker">LONG-TERM MEMORY</div><h2>它还没开始记住你</h2><p>完成三问和第一次打卡后，这里会出现目标、方法试验和每日反馈。</p></div></div>
      <div class="empty-state"><div class="big">🧠</div><strong>记忆不是聊天记录</strong><p>它会记住：你的起点、时间约束、哪种方法有效、什么时候该换法。</p><div class="memory-actions" style="justify-content:center"><button class="btn primary" data-action="view" data-view="chat">去完成三问 →</button><button class="btn ghost" data-action="open-demo">看演示档案</button></div></div>`;
    return;
  }

  const timeline = [];
  if (profile.createdAt) {
    timeline.push({
      date: profile.createdAt.slice(0, 10),
      cls: "good",
      title: "建立学习档案",
      desc: `目标：${profile.goal} · ${profile.domain} · 每天 ${profile.minutes} 分钟`,
    });
  }
  for (const t of trials) {
    timeline.push({
      date: t.startDate,
      cls: "good",
      title: `开始试验「${t.methodName}」`,
      desc: t.status === "switched" ? "3 天微试验后触发换法" : "当前正在使用",
    });
    if (t.status === "switched" && t.endDate) {
      timeline.push({
        date: t.endDate,
        cls: "warn",
        title: `停用「${t.methodName}」`,
        desc: t.reason || "效果未达标，切换方法",
      });
    }
  }
  for (const l of logs) {
    timeline.push({
      date: l.date,
      cls: l.effect >= 70 ? "good" : l.effect >= 55 ? "" : "warn",
      title: `第 ${l.day} 天 · ${l.methodName} · ${l.effect} 分`,
      desc: `完成率 ${l.completion}% · 难度 ${l.difficulty}/5 · 自测 ${l.score}${l.note ? ` · ${l.note}` : ""}`,
    });
  }
  timeline.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  box.innerHTML = `
    <div class="memory-top">
      <div><div class="kicker">LONG-TERM MEMORY</div><h2>它记得你走过的弯路</h2><p>记忆不是聊天记录，而是下一次决策的变量。</p></div>
      <div class="memory-actions"><button class="btn ghost" data-action="export">导出记忆</button><button class="btn ghost" data-action="clear-memory">清空记忆</button></div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="k">连续学习</div><div class="v">${computeStreak()}<small> 天</small></div><div class="s">按反馈日期计算</div></div>
      <div class="stat-card"><div class="k">反馈次数</div><div class="v">${logs.length}<small> 次</small></div><div class="s">每次都会改变下一次</div></div>
      <div class="stat-card"><div class="k">平均完成率</div><div class="v">${avgCompletion}<small>%</small></div><div class="s">执行层面的信号</div></div>
      <div class="stat-card"><div class="k">平均效果分</div><div class="v">${avgEffect}<small> 分</small></div><div class="s">方法是否真的有效</div></div>
    </div>
    <div class="memory-grid">
      <div>
        <div class="panel">
          <div class="panel-title"><h3>记忆时间线</h3><span>最近 ${Math.min(timeline.length, 12)} 条</span></div>
          <div class="timeline">
            ${timeline.slice(0, 12).map((x) => `<div class="tl-item ${x.cls}"><div class="tl-date">${esc(dateLabel(x.date))}</div><div class="tl-title">${esc(x.title)}</div><div class="tl-desc">${esc(x.desc)}</div></div>`).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title"><h3>方法试验记录</h3><span>换法不是失败</span></div>
          <table class="trial-table">
            <thead><tr><th>方法</th><th>状态</th><th>完成率</th><th>效果</th></tr></thead>
            <tbody>
              ${trials.map((t) => `<tr><td>${esc(t.methodName)}</td><td><span class="badge-status ${t.status}">${t.status === "active" ? "进行中" : "已换法"}</span></td><td>${t.avgCompletion ?? "—"}%</td><td>${t.avgEffect ?? "—"}</td></tr>`).join("")}
            </tbody>
          </table>
          <div class="memory-note">💡 记忆规则：完成率低于 60% 先降门槛；效果分低于 58 或自测低于 60 才换方法。换法必须留下原因，避免“感觉不行就换”。</div>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-title"><h3>学习档案</h3><span>${esc(profile.domain)}</span></div>
          <div class="profile-line"><div class="k">目标</div><div class="v">${esc(profile.goal)}</div></div>
          <div class="profile-line"><div class="k">起点</div><div class="v">${esc(profile.baseline)}</div></div>
          <div class="profile-line"><div class="k">约束</div><div class="v">${esc(profile.constraints)}</div></div>
          <div class="profile-line"><div class="k">节奏</div><div class="v">每天 ${profile.minutes} 分钟 · 截止约 ${profile.deadline} 天</div></div>
          <div class="profile-line"><div class="k">当前方法</div><div class="v">${esc(METHOD_MAP.get(state.methodId)?.name || "—")}</div></div>
        </div>
        <div class="panel">
          <div class="panel-title"><h3>它对你的判断</h3><span>可修正</span></div>
          <div class="insight-list">
            <div class="insight"><span class="ico">🎯</span><div>你的目标清晰度：<b>${profile.goal.length > 12 ? "较高" : "一般"}</b>。目标越具体，任务卡越容易验收。</div></div>
            <div class="insight"><span class="ico">🧩</span><div>你当前在 <b>${esc(profile.domain)}</b> 领域；匹配时会优先考虑时间成本与证据等级。</div></div>
            <div class="insight"><span class="ico">🔁</span><div>已记录 <b>${logs.length}</b> 次反馈；效果不好时，系统会优先换法，而不是让你“再坚持一下”。</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-title"><h3>我的建议</h3><span>提交给管理员的工单</span></div>
      <div id="mySuggestions"><div class="memory-note">加载中…</div></div>
    </div>`;
  loadMySuggestions();
}

/* ------------------------------------------------------------------ report */
function last7Days() {
  const arr = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    arr.push({ iso: iso(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
  }
  return arr;
}

function renderReport() {
  const box = $("#reportContent");
  if (!box) return;
  const logs = state.logs;
  if (!logs.length) {
    box.innerHTML = `
      <div class="report-top"><div><div class="kicker">LEARNING REPORT</div><h2>还没有足够的数据</h2><p>完成第一次打卡后，这里会出现完成率、效果分和方法对比。</p></div></div>
      <div class="empty-state"><div class="big">📈</div><strong>用反馈，而不是感觉，判断效果</strong><p>至少完成 2 次打卡，才能看出趋势。</p><div class="memory-actions" style="justify-content:center"><button class="btn primary" data-action="view" data-view="chat">去完成任务 →</button></div></div>`;
    return;
  }

  const days = last7Days();
  const rows = days.map((d) => {
    const ls = logs.filter((l) => l.date === d.iso);
    return {
      ...d,
      completion: ls.length ? avg(ls.map((l) => l.completion)) : 0,
      effect: ls.length ? avg(ls.map((l) => l.effect)) : 0,
      count: ls.length,
    };
  });
  const best = [...rows].sort((a, b) => b.effect - a.effect)[0];
  const avgEffect = avg(logs.map((l) => l.effect));
  const avgCompletion = avg(logs.map((l) => l.completion));
  const totalMinutes = logs.reduce((s, l) => s + (l.minutes || 0), 0);
  const bestTrial = [...state.trials].sort((a, b) => (b.avgEffect || 0) - (a.avgEffect || 0))[0];
  const firstTrial = state.trials.find((t) => t.status === "switched");
  const activeTrial = state.trials.find((t) => t.status === "active");
  const improvement = firstTrial && activeTrial && firstTrial.avgEffect != null && activeTrial.avgEffect != null
    ? activeTrial.avgEffect - firstTrial.avgEffect
    : null;

  box.innerHTML = `
    <div class="report-top">
      <div><div class="kicker">LEARNING REPORT</div><h2>用反馈，而不是感觉，判断效果</h2><p>${state.demo ? "演示档案 · 以下为原型内置模拟数据" : "数据来自你的账号记忆，仅你可见"}</p></div>
      <div class="memory-actions"><button class="btn ghost" data-action="view" data-view="memory">看记忆 →</button></div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="k">连续学习</div><div class="v">${computeStreak()}<small> 天</small></div><div class="s">当前连续反馈</div></div>
      <div class="stat-card"><div class="k">累计投入</div><div class="v">${totalMinutes}<small> 分钟</small></div><div class="s">按任务卡估算</div></div>
      <div class="stat-card"><div class="k">平均完成率</div><div class="v">${avgCompletion}<small>%</small></div><div class="s">先看执行，再看效果</div></div>
      <div class="stat-card"><div class="k">平均效果分</div><div class="v">${avgEffect}<small> 分</small></div><div class="s">${avgEffect >= 70 ? "方法整体有效" : "需要继续调试"}</div></div>
    </div>
    <div class="report-grid">
      <div class="panel">
        <div class="panel-title"><h3>最近 7 天 · 完成率 vs 效果分</h3><span>悬停看数值</span></div>
        <div class="chart-box">
          <div class="chart">
            ${rows.map((r) => `<div class="bar-group"><div class="bar-values">${r.label}<br>完成 ${r.completion}% · 效果 ${r.effect}</div><div class="bar-stack"><div class="bar" style="height:${r.completion}%"></div><div class="bar effect" style="height:${r.effect}%"></div></div><div class="bar-label">${r.label}</div></div>`).join("")}
          </div>
          <div class="legend"><span><i style="background:var(--ink)"></i>完成率</span><span><i style="background:var(--coral)"></i>效果分</span><span>${best?.count ? `最好的一天：${best.label} · ${best.effect} 分` : "还没有足够数据"}</span></div>
        </div>
        <div class="report-note">读法：完成率低但效果高 → 任务太大；完成率高但效果低 → 方法不匹配；两者都低 → 先降门槛，不要急着换法。</div>
      </div>
      <div class="panel">
        <div class="panel-title"><h3>方法对比</h3><span>${state.trials.length} 次试验</span></div>
        <table class="trial-table">
          <thead><tr><th>方法</th><th>状态</th><th>完成</th><th>效果</th></tr></thead>
          <tbody>${state.trials.map((t) => `<tr><td>${esc(t.methodName)}</td><td><span class="badge-status ${t.status}">${t.status === "active" ? "进行中" : "已换法"}</span></td><td>${t.avgCompletion ?? "—"}%</td><td><b>${t.avgEffect ?? "—"}</b></td></tr>`).join("")}</tbody>
        </table>
        <div class="memory-note">${bestTrial ? `当前表现最好的方法：<b>${esc(bestTrial.methodName)}</b>，平均效果 ${bestTrial.avgEffect ?? "—"} 分。` : "完成一次以上试验后，这里会出现对比。"}${improvement != null ? `<br>换法后平均效果变化：<b>${improvement >= 0 ? "+" : ""}${improvement} 分</b>。` : ""}</div>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-title"><h3>本周洞察与下一步</h3><span>可执行，不空泛</span></div>
      <div class="insight-list">
        <div class="insight"><span class="ico">🧠</span><div><b>执行信号：</b>平均完成率 ${avgCompletion}%。${avgCompletion < 60 ? "任务规模可能偏大，明天先缩到最小版本。" : "执行层面基本稳定，可以开始加难度。"}</div></div>
        <div class="insight"><span class="ico">🎯</span><div><b>方法信号：</b>平均效果 ${avgEffect} 分。${avgEffect < 58 ? "已经触发换法阈值，优先换方法，而不是加时长。" : "方法有效，明天只加一个变量：素材/题目难度。"}</div></div>
        <div class="insight"><span class="ico">🔁</span><div><b>下一步：</b>${improvement != null && improvement > 0 ? `换法后提升了 ${improvement} 分，继续用新方法做 3 天，再决定是否保留。` : "保持当前方法 3 天，用同一指标对比，不凭感觉换法。"}</div></div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ demo */
function buildDemoState(scenarioId, mode = "plan") {
  const sc = E.SCENARIOS[scenarioId] || E.SCENARIOS.english;
  const profile = E.buildProfile(sc.answers, "演示用户");
  const first = METHOD_MAP.get(sc.methodId) || METHODS[0];
  const second = METHOD_MAP.get(sc.switchId) || METHODS[1];
  const logs = sc.logs.map((l, i) => {
    const method = i < 3 ? first : second;
    const effect = E.computeEffect(l);
    return {
      id: uid(),
      date: iso(addDays(new Date(), -(sc.logs.length - i))),
      day: i + 1,
      ...l,
      effect,
      methodId: method.id,
      methodName: method.name,
      minutes: i < 3 ? 30 : 28,
    };
  });
  profile.createdAt = `${logs[0].date}T09:00:00`;
  const trial1 = {
    id: uid(),
    methodId: first.id,
    methodName: first.name,
    startDate: logs[0].date,
    endDate: logs[2]?.date || logs[0].date,
    status: "switched",
    logIds: logs.slice(0, 3).map((l) => l.id),
    avgCompletion: avg(logs.slice(0, 3).map((l) => l.completion)),
    avgEffect: avg(logs.slice(0, 3).map((l) => l.effect)),
    reason: "完成率不低，但自测连续低于 60：方法没有转化为输出。",
  };
  const trial2 = {
    id: uid(),
    methodId: second.id,
    methodName: second.name,
    startDate: logs[3]?.date || logs[0].date,
    endDate: null,
    status: "active",
    logIds: logs.slice(3).map((l) => l.id),
    avgCompletion: avg(logs.slice(3).map((l) => l.completion)),
    avgEffect: avg(logs.slice(3).map((l) => l.effect)),
  };

  const s = defaultState();
  state = s;
  s.demo = sc;
  s.gate = { step: 3, answers: sc.answers.slice(), complete: true };
  s.profile = profile;
  s.logs = logs;
  s.trials = logs.length >= 3 ? [trial1, trial2] : [trial2].filter(Boolean);
  s.methodId = second.id;
  s.match = E.matchMethods(METHODS, profile);
  const scoredSecond = s.match.find((m) => m.id === second.id) || { ...second, fit: 86, reasons: ["该场景的首选微试验"] };
  s.diagnosis = E.buildDiagnosis(profile, scoredSecond);
  s.plan = E.buildTasks(profile, second);
  if (mode === "plan") s.plan.tasks[0].done = true;

  addMessage(
    "agent",
    "text",
    `这是「${sc.label}」的演示档案。我用过去 ${logs.length} 天的反馈，让你看到记忆如何影响今天的判断。\n\n这不是一次性推荐：第 3 天效果不达标后，系统触发了换法。`
  );
  addMessage("agent", "gate");

  if (mode === "summary") {
    const oldLog = logs[2];
    const decision = E.decideOutcome(oldLog);
    decision.action = "switch";
    decision.type = "方法不匹配";
    decision.headline = "你执行了，但效果没有跟上，建议换法。";
    decision.reason = "完成率 55%、自测 48，说明「做了」但没有转化为可检查的结果。不是你不努力，是方法和当前瓶颈不匹配。";
    const nextDay = E.buildNextDay(profile, first, { ...decision, nextMethod: second });
    addMessage("agent", "summary", "", { log: oldLog, decision, method: first, nextDay, nextMethod: second });
    addMessage("agent", "switch", "", { from: first, to: second, decision });
    addMessage("agent", "plan", "", { plan: s.plan, method: second, profile, day: logs.length + 1 });
  } else {
    addMessage("agent", "diagnosis", "", { diagnosis: s.diagnosis });
    addMessage("agent", "method", "", { method: scoredSecond, alternatives: s.match });
    addMessage("agent", "plan", "", { plan: s.plan, method: second, profile, day: logs.length + 1 });
    addMessage("agent", "text", "演示档案已加载。你可以点任务卡里的复选框，或直接「完成打卡」看总结与换法逻辑。");
  }

  s.activeView = ["memory", "report", "library"].includes(mode) ? mode : "chat";
  return s;
}

function openDemo() {
  const cards = Object.values(E.SCENARIOS).map((s) => `
    <button class="demo-card" data-action="load-demo" data-scenario="${s.id}">
      <div class="e">${s.emoji}</div>
      <div class="t">${esc(s.label)}</div>
      <div class="s">${esc(s.answers[0])}</div>
      <div class="go">加载 6 天记忆与今日任务 →</div>
    </button>`).join("");
  showModal(`
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="演示档案">
        <div class="modal-head"><div><h3>演示档案</h3><p>用内置的模拟学习记录，快速看清「记忆 → 判断 → 换法」怎么发生。</p></div><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-body">
          <div class="demo-modal-grid">${cards}</div>
          <div class="feedback-tip" style="margin-top:14px">🧪 演示数据只存在浏览器本地，不会上传；退出演示后可回到全新用户。</div>
        </div>
        <div class="modal-foot"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn primary" data-action="demo-gate">从三问开始 →</button></div>
      </div>
    </div>`);
}

function loadDemo(scenarioId) {
  state = buildDemoState(scenarioId, "plan");
  closeModal();
  renderAll();
  toast("演示档案已加载。");
}

/* ------------------------------------------------------------------ modal / reset */
function showModal(html) {
  const root = $("#modalRoot");
  root.innerHTML = html;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("#modalRoot").innerHTML = "";
  document.body.style.overflow = "";
}

function openConfirm(title, body, action) {
  showModal(`
    <div class="modal-backdrop">
      <div class="modal narrow" role="dialog" aria-modal="true">
        <div class="modal-head"><div><h3>${esc(title)}</h3><p>${esc(body)}</p></div><button class="modal-close" data-action="close-modal">✕</button></div>
        <div class="modal-foot"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn coral" data-action="${escAttr(action)}">确认</button></div>
      </div>
    </div>`);
}

function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  state = defaultState();
  ensureGreeting();
  history.replaceState(null, "", location.pathname);
  closeModal();
  renderAll();
  toast("已重置。三问会重新开始。");
}

function clearMemory() {
  openConfirm("清空这段学习记忆？", "目标、打卡、方法试验都会删除，无法恢复。建议先导出。", "confirm-clear");
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `methodlab-memory-${iso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("已导出 JSON。");
}

/* ------------------------------------------------------------------ health */
async function checkHealth() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error("no server");
    const data = await res.json();
    state.llmAvailable = Boolean(data.llm);
    state.llmModel = data.model || "AI 增强";
  } catch {
    state.llmAvailable = false;
  }
  renderTopbar();
  persist();
}

function toggleLLM() {
  if (!state.llmAvailable) {
    toast("当前使用服务端记忆 + 本地规则引擎；LLM 增强尚未配置。");
    return;
  }
  state.llmEnabled = !state.llmEnabled;
  persist();
  renderTopbar();
  toast(state.llmEnabled ? "AI 增强已开启：语言表达更自然，门槛与匹配仍由规则引擎保证。" : "已切回服务端规则引擎。");
}

/* ------------------------------------------------------------------ toast */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ------------------------------------------------------------------ events */
function setView(view) {
  if (!PAGE_META[view]) return;
  state.activeView = view;
  renderNav();
  if (view === "library") renderLibrary();
  if (view === "memory") renderMemory();
  if (view === "report") renderReport();
  if (view === "chat") setTimeout(scrollChat, 30);
  persist();
}

function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
}

function bindEvents() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;

    if (action === "view") {
      setView(el.dataset.view);
      return;
    }
    if (action === "chip") {
      sendMessage(el.dataset.text || "");
      return;
    }
    if (action === "focus-input") {
      $("#messageInput")?.focus();
      return;
    }
    if (action === "toggle-task") {
      toggleTask(el.dataset.task);
      return;
    }
    if (action === "open-feedback") {
      openFeedback();
      return;
    }
    if (action === "open-method") {
      openMethod(el.dataset.id);
      return;
    }
    if (action === "try-method") {
      tryMethod(el.dataset.id);
      return;
    }
    if (action === "open-demo") {
      openDemo();
      return;
    }
    if (action === "open-suggestion") {
      openSuggestion();
      return;
    }
    if (action === "open-admin") {
      location.href = "/admin.html";
      return;
    }
    if (action === "logout") {
      logout();
      return;
    }
    if (action === "load-demo") {
      loadDemo(el.dataset.scenario);
      return;
    }
    if (action === "demo-gate") {
      closeModal();
      state = defaultState();
      ensureGreeting();
      history.replaceState(null, "", location.pathname + "?demo=gate");
      renderAll();
      toast("已回到三问起点。");
      return;
    }
    if (action === "reset") {
      openConfirm("重置这段学习记忆？", "会清空目标、方法试验和打卡反馈，无法恢复。", "confirm-reset");
      return;
    }
    if (action === "confirm-reset") {
      resetState();
      return;
    }
    if (action === "clear-memory") {
      clearMemory();
      return;
    }
    if (action === "confirm-clear") {
      resetState();
      return;
    }
    if (action === "export") {
      exportData();
      return;
    }
    if (action === "toggle-llm") {
      toggleLLM();
      return;
    }
    if (action === "filter-domain") {
      state.libraryFilter = el.dataset.domain;
      renderLibrary();
      return;
    }
    if (action === "close-modal") {
      closeModal();
      return;
    }
    if (action === "mood") {
      feedbackDraft.mood = Number(el.dataset.mood);
      $$(".mood-btn").forEach((b) => b.classList.toggle("active", Number(b.dataset.mood) === feedbackDraft.mood));
      return;
    }
    if (action === "diff") {
      feedbackDraft.difficulty = Number(el.dataset.diff);
      $$(".diff-btn").forEach((b) => b.classList.toggle("active", Number(b.dataset.diff) === feedbackDraft.difficulty));
      return;
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "librarySearch") {
      state.librarySearch = e.target.value;
      renderMethodGrid();
      return;
    }
    if (e.target.matches("[data-range]")) {
      const key = e.target.dataset.range;
      if (feedbackDraft) feedbackDraft[key] = Number(e.target.value);
      const out = document.querySelector(`[data-range-value="${key}"]`);
      if (out) out.textContent = key === "completion" ? `${e.target.value}%` : e.target.value;
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id === "feedbackForm") {
      e.preventDefault();
      submitFeedback();
    }
    if (e.target.id === "suggestionForm") {
      e.preventDefault();
      submitSuggestion();
    }
  });

  const composer = $("#composer");
  composer?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage($("#messageInput")?.value || "");
  });

  const input = $("#messageInput");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      composer?.requestSubmit();
    }
  });
  input?.addEventListener("input", () => autoResize(input));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/* ------------------------------------------------------------------ start */
init();
