import { api } from "./api.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (ts) => {
  if (!ts) return "—";
  const d = new Date(Number(ts));
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const statusLabel = { pending: "待处理", reviewing: "处理中", resolved: "已解决", rejected: "不采纳" };
const CORAL = "#d94e31";
const GOLD = "#9a7218";
const MINT = "#2b8a5b";
const INK = "#10231e";

let me = null;
let view = "suggestions";
let suggestions = [];
let filter = "pending";
let selectedSuggestion = null;
let methods = [];
let selectedMethod = null;
let search = "";

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function setView(next) {
  view = next;
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === next));
  $$(".admin-view").forEach((v) => v.classList.toggle("active", v.id === `view-${next}`));
  const meta = {
    suggestions: ["管理台 / 问题与建议", "把用户的反馈，变成下一次改进。"],
    methods: ["管理台 / 方法库", "方法不是文案，是可执行、可验证的资产。"],
    users: ["管理台 / 用户概况", "只看必要信息，不碰用户密码。"],
  }[next];
  $("#adminCrumb").textContent = meta[0];
  $("#adminTitle").textContent = meta[1];
  if (next === "suggestions") loadSuggestions();
  if (next === "methods") loadMethods();
  if (next === "users") loadUsers();
}

async function loadStats() {
  const data = await api("/api/admin/stats");
  const map = Object.fromEntries((data.suggestions || []).map((x) => [x.status, x.n]));
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  $("#suggestionStats").innerHTML = [
    ["待处理", map.pending || 0, "需要先看", CORAL],
    ["处理中", map.reviewing || 0, "已回复/跟进", GOLD],
    ["已解决", map.resolved || 0, "已闭环", MINT],
    ["全部建议", total, "含不采纳", INK],
  ].map(([k, v, s, color]) => `<div class="admin-stat"><div class="k">${k}</div><div class="v" style="color:${color}">${v}</div><div class="s">${s}</div></div>`).join("");
  $("#pendingBadge").textContent = String(map.pending || 0);
  $("#methodsBadge").textContent = String(data.methods?.published || 0);
}

async function loadSuggestions() {
  const data = await api(`/api/admin/suggestions?status=${filter}`);
  suggestions = data.suggestions || [];
  renderSuggestionFilters();
  renderSuggestionList();
  if (selectedSuggestion && suggestions.some((s) => s.id === selectedSuggestion.id)) {
    selectedSuggestion = suggestions.find((s) => s.id === selectedSuggestion.id);
  } else {
    selectedSuggestion = suggestions[0] || null;
  }
  renderSuggestionDetail();
}

function renderSuggestionFilters() {
  const items = [["pending", "待处理"], ["reviewing", "处理中"], ["resolved", "已解决"], ["rejected", "不采纳"], ["", "全部"]];
  $("#suggestionFilters").innerHTML = items.map(([k, label]) => `<button class="ticket-filter ${filter === k ? "active" : ""}" data-filter="${k}">${label}</button>`).join("");
}

function renderSuggestionList() {
  const box = $("#suggestionList");
  if (!suggestions.length) {
    box.innerHTML = `<div class="empty-state"><div class="big">✅</div><strong>这个分类没有待处理</strong><p>切换筛选，或等用户提交新的建议。</p></div>`;
    return;
  }
  box.innerHTML = suggestions.map((s) => `
    <button class="ticket ${selectedSuggestion?.id === s.id ? "active" : ""}" data-suggestion="${s.id}">
      <div class="ticket-top"><span class="ticket-title">${esc(s.title)}</span><span class="status ${s.status}">${statusLabel[s.status] || s.status}</span></div>
      <div class="ticket-meta">@${esc(s.username)} · ${s.type === "method" ? "方法建议" : "问题反馈"} · ${fmt(s.created_at)}</div>
      <div class="ticket-snippet">${esc(s.content)}</div>
    </button>`).join("");
}

function renderSuggestionDetail() {
  const box = $("#suggestionDetail");
  if (!selectedSuggestion) {
    box.innerHTML = `<div class="empty-state"><div class="big">💬</div><strong>选择一条建议</strong><p>左侧点击后，在这里处理状态和回复。</p></div>`;
    return;
  }
  const s = selectedSuggestion;
  box.innerHTML = `
    <div class="detail-head">
      <div><div class="detail-title">${esc(s.title)}</div><div class="detail-sub">@${esc(s.username)} · ${s.type === "method" ? "方法建议" : "问题反馈"} · ${fmt(s.created_at)}</div></div>
      <span class="status ${s.status}">${statusLabel[s.status] || s.status}</span>
    </div>
    <div class="detail-content">${esc(s.content)}</div>
    ${s.method_name ? `<div class="detail-sub">关联方法：${esc(s.method_name)}</div>` : ""}
    <label class="detail-label">处理状态</label>
    <select class="detail-select" id="detailStatus">
      ${Object.entries(statusLabel).map(([k, v]) => `<option value="${k}" ${s.status === k ? "selected" : ""}>${v}</option>`).join("")}
    </select>
    <label class="detail-label">管理员回复（用户可在“我的建议”看到）</label>
    <textarea class="detail-textarea" id="detailReply" placeholder="例如：收到，这个建议会纳入下一版方法库评估；预计本周给出结论。">${esc(s.admin_reply || "")}</textarea>
    <div class="detail-actions">
      <button class="admin-secondary" id="detailCancel">清空回复</button>
      <button class="admin-primary" id="detailSave">保存处理结果</button>
    </div>`;
}

async function saveSuggestion() {
  if (!selectedSuggestion) return;
  const status = $("#detailStatus").value;
  const reply = $("#detailReply").value;
  await api(`/api/admin/suggestions/${selectedSuggestion.id}`, { method: "PATCH", body: { status, admin_reply: reply } });
  toast("已保存，用户端会看到回复。");
  await loadStats();
  await loadSuggestions();
}

async function loadMethods() {
  const data = await api("/api/admin/methods");
  methods = data.methods || [];
  $("#methodsBadge").textContent = String(methods.filter((m) => m.published).length);
  renderMethodList();
  if (selectedMethod) {
    selectedMethod = methods.find((m) => m.id === selectedMethod.id) || null;
  }
  renderMethodEditor();
}

function renderMethodList() {
  const q = search.trim().toLowerCase();
  const list = methods.filter((m) => !q || `${m.name} ${m.id} ${(m.domains || []).join(" ")}`.toLowerCase().includes(q));
  const box = $("#methodList");
  if (!list.length) {
    box.innerHTML = `<div class="empty-state"><div class="big">🔍</div><strong>没有找到方法</strong><p>换个关键词，或新增一个。</p></div>`;
    return;
  }
  box.innerHTML = list.map((m) => `
    <button class="method-admin-item ${selectedMethod?.id === m.id ? "active" : ""}" data-method="${esc(m.id)}">
      <div><div class="method-admin-name">${esc(m.name)}</div><div class="method-admin-sub">${esc((m.domains || []).join(" / "))} · ${m.time} min · 证据 ${m.evidence}</div></div>
      <span class="publish-dot ${m.published ? "on" : "off"}">${m.published ? "已发布" : "草稿"}</span>
    </button>`).join("");
}

function renderMethodEditor() {
  const box = $("#methodEditor");
  if (!selectedMethod) {
    box.innerHTML = `<div class="empty-state"><div class="big">🗂️</div><strong>选择一张方法卡</strong><p>左侧点击编辑，或新增一个方法。</p></div>`;
    return;
  }
  const m = selectedMethod;
  const field = (key, label, value, full = false, type = "text") => `
    <div class="editor-field ${full ? "full" : ""}"><label>${label}</label>
      <input class="admin-input" data-field="${key}" type="${type}" value="${esc(value ?? "")}" />
    </div>`;
  const area = (key, label, value, full = true) => `
    <div class="editor-field ${full ? "full" : ""}"><label>${label}</label>
      <textarea class="admin-textarea" data-field="${key}">${esc(value ?? "")}</textarea>
    </div>`;
  box.innerHTML = `
    <div class="editor-head">
      <div><h3>${m.id ? "编辑方法卡" : "新增方法卡"}</h3><p class="panel-head" style="margin:4px 0 0;padding:0"><span style="font-size:8px;color:var(--muted)">发布后用户端刷新可见；草稿不会进入匹配。</span></p></div>
      <span class="publish-dot ${m.published ? "on" : "off"}">${m.published ? "已发布" : "草稿"}</span>
    </div>
    <div class="editor-grid">
      ${field("id", "ID（英文/数字/-）", m.id)}
      ${field("name", "方法名", m.name)}
      ${field("en", "英文名", m.en)}
      ${field("category", "分类", m.category)}
      ${field("domains", "领域（逗号分隔）", (m.domains || []).join("，"), true)}
      ${field("time", "时间（分钟）", m.time, false, "number")}
      ${field("difficulty", "难度 1-5", m.difficulty, false, "number")}
      ${field("evidence", "证据等级（A/B/C）", m.evidence)}
      ${field("one_liner", "一句话", m.one_liner, true)}
      ${area("why", "为什么有效", m.why)}
      ${area("steps", "步骤（每行一条）", (m.steps || []).join("\n"))}
      ${area("materials", "资料三件套（每行一条）", (m.materials || []).join("\n"))}
      ${field("metric", "成功指标", m.metric, true)}
      ${area("fail", "常见失败（每行一条）", (m.fail || []).join("\n"))}
      ${area("switch_when", "什么时候换法", m.switch_when)}
      ${field("source", "来源", m.source, true)}
      ${area("evidence_note", "证据说明", m.evidence_note)}
    </div>
    <div class="editor-actions">
      <button class="admin-secondary" id="methodPublish">${m.published ? "转为草稿" : "发布"}</button>
      <button class="admin-primary" id="methodSave">保存方法卡</button>
    </div>`;
}

function readMethodForm() {
  const get = (key) => $(`[data-field="${key}"]`)?.value?.trim() || "";
  const lines = (key) => get(key).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const list = (key) => get(key).split(/[,，]/).map((x) => x.trim()).filter(Boolean);
  return {
    id: get("id"),
    name: get("name"),
    en: get("en"),
    category: get("category"),
    domains: list("domains"),
    goals: [],
    evidence: get("evidence") || "C",
    evidence_note: get("evidence_note"),
    time: Number(get("time")) || 20,
    difficulty: Number(get("difficulty")) || 2,
    one_liner: get("one_liner"),
    why: get("why"),
    steps: lines("steps"),
    materials: lines("materials"),
    metric: get("metric"),
    fail: lines("fail"),
    switch_to: "",
    switch_when: get("switch_when"),
    source: get("source"),
  };
}

async function saveMethod(publishedOverride) {
  const method = readMethodForm();
  if (!method.id || !method.name) {
    toast("至少填写 ID 和方法名。");
    return;
  }
  const published = publishedOverride === undefined ? Boolean(selectedMethod?.published) : publishedOverride;
  await api("/api/admin/methods", { method: "POST", body: { method, published } });
  toast(published ? "已保存并发布，用户端刷新可见。" : "已保存为草稿。");
  selectedMethod = { ...method, published };
  await loadMethods();
}

async function loadUsers() {
  const data = await api("/api/admin/users");
  const users = data.users || [];
  $("#userTable").innerHTML = `
    <thead><tr><th>用户名</th><th>角色</th><th>注册时间</th><th>最近同步</th><th>建议数</th></tr></thead>
    <tbody>${users.map((u) => `<tr><td><b>${esc(u.username)}</b></td><td>${u.role === "admin" ? "管理员" : "用户"}</td><td>${fmt(u.created_at)}</td><td>${fmt(u.state_updated_at)}</td><td>${u.suggestion_count || 0}</td></tr>`).join("")}</tbody>`;
}

function bind() {
  document.addEventListener("click", async (e) => {
    const nav = e.target.closest("[data-view]");
    if (nav) return setView(nav.dataset.view);
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      filter = filterBtn.dataset.filter;
      return loadSuggestions();
    }
    const ticket = e.target.closest("[data-suggestion]");
    if (ticket) {
      selectedSuggestion = suggestions.find((s) => s.id === ticket.dataset.suggestion) || null;
      renderSuggestionList();
      return renderSuggestionDetail();
    }
    const methodBtn = e.target.closest("[data-method]");
    if (methodBtn) {
      selectedMethod = methods.find((m) => m.id === methodBtn.dataset.method) || null;
      renderMethodList();
      return renderMethodEditor();
    }
    if (e.target.id === "detailSave") return saveSuggestion();
    if (e.target.id === "detailCancel") { $("#detailReply").value = ""; return; }
    if (e.target.id === "methodSave") return saveMethod();
    if (e.target.id === "methodPublish") return saveMethod(!selectedMethod?.published);
    if (e.target.id === "newMethodBtn") {
      selectedMethod = { id: "", name: "", en: "", category: "通用", domains: ["通用"], evidence: "C", evidence_note: "", time: 20, difficulty: 2, one_liner: "", why: "", steps: [], materials: [], metric: "", fail: [], switch_when: "", source: "", published: false };
      renderMethodList();
      return renderMethodEditor();
    }
    if (e.target.id === "logoutBtn") {
      await api("/api/auth/logout", { method: "POST" });
      location.href = "/login.html";
      return;
    }
    if (e.target.id === "backApp") { location.href = "/"; return; }
    if (e.target.id === "refreshBtn") {
      await loadStats();
      if (view === "suggestions") await loadSuggestions();
      if (view === "methods") await loadMethods();
      if (view === "users") await loadUsers();
      toast("已刷新");
    }
  });
  $("#methodSearch").addEventListener("input", (e) => {
    search = e.target.value;
    renderMethodList();
  });
}

async function init() {
  const data = await api("/api/me");
  me = data.user;
  if (!me || me.role !== "admin") {
    location.href = "/login.html?next=/admin.html";
    return;
  }
  $("#adminName").textContent = me.username;
  $("#adminAvatar").textContent = me.username.slice(0, 1).toUpperCase();
  bind();
  await loadStats();
  await loadSuggestions();
  await loadMethods();
  await loadUsers();
}

init().catch((err) => {
  console.error(err);
  toast(err.message || "加载失败");
});
