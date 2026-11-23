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
let methodVersions = [];
let versionMode = false;
let selectedVersion = null;
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
    metrics: ["管理台 / 指标看板", "先看真实使用，再谈增长。"],
    users: ["管理台 / 用户概况", "只看必要信息，不碰用户密码。"],
  }[next];
  $("#adminCrumb").textContent = meta[0];
  $("#adminTitle").textContent = meta[1];
  if (next === "suggestions") loadSuggestions();
  if (next === "methods") loadMethods();
  if (next === "metrics") loadMetrics();
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

async function loadMetrics() {
  const data = await api("/api/admin/metrics");
  const u = data.users || {};
  const l = data.learning || {};
  const s = data.suggestions || {};
  const cards = [
    ["用户总数", u.total ?? 0, "不含管理员", INK],
    ["7 日活跃", u.active7d ?? 0, "最近同步过状态", MINT],
    ["有学习记录", u.withLogs ?? 0, "至少一次打卡", GOLD],
    ["平均完成率", `${l.avgCompletion ?? 0}%`, "执行信号", INK],
    ["平均效果分", `${l.avgEffect ?? 0}`, "效果信号", CORAL],
    ["换法率", `${l.switchRate ?? 0}%`, `${l.switched ?? 0}/${l.trials ?? 0} 次试验`, GOLD],
    ["基线完成", `${l.baselineDone ?? 0}`, `未测 ${l.baselineMissing ?? 0} · 跳过 ${l.baselineSkipped ?? 0}`, MINT],
    ["待处理建议", s.pending ?? 0, "需要先看", CORAL],
  ];
  const maxLogs = Math.max(1, ...(data.days || []).map((d) => d.logs || 0));
  const bars = (data.days || []).map((d) => `
    <div class="metric-bar">
      <div class="metric-bar-value">${d.logs}</div>
      <div class="metric-bar-track"><span style="height:${Math.round((d.logs / maxLogs) * 100)}%"></span></div>
      <div class="metric-bar-label">${esc(d.label)}</div>
    </div>`).join("");
  $("#metricsContent").innerHTML = `
    <div class="admin-stats">${cards.map(([k, v, sub, color]) => `<div class="admin-stat"><div class="k">${k}</div><div class="v" style="color:${color}">${v}</div><div class="s">${sub}</div></div>`).join("")}</div>
    <div class="admin-panel" style="margin-top:14px">
      <div class="panel-head"><div><h2>最近 7 天 · 打卡量</h2><p>按学习记录日期聚合，不按页面访问量。</p></div><span class="tag gray">试点口径</span></div>
      <div class="metric-chart">${bars || `<div class="memory-note">还没有打卡记录。</div>`}</div>
      <div class="metric-note">
        <b>试点先看 4 个数：</b>
        ① 三问完成率 → ② 首日打卡率（有记录/有账号）→ ③ 第 3 天回访 → ④ 换法后效果变化。
        小样本只描述，不宣称因果；基线是学习行为，不是学科分数。
      </div>
    </div>`;
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
  if (versionMode && selectedMethod) return renderVersionHistory();
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
      <button class="admin-secondary" id="methodVersions">版本历史</button>
      <button class="admin-secondary" id="methodPublish">${m.published ? "转为草稿" : "发布"}</button>
      <button class="admin-primary" id="methodSave">保存方法卡</button>
    </div>`;
}

const VERSION_FIELDS = [
  ["name", "方法名"], ["category", "分类"], ["domains", "领域"], ["evidence", "证据等级"],
  ["time", "时间"], ["difficulty", "难度"], ["one_liner", "一句话"], ["why", "为什么有效"],
  ["steps", "步骤"], ["materials", "资料"], ["metric", "成功指标"], ["fail", "常见失败"],
  ["switch_when", "换法条件"], ["source", "来源"], ["evidence_note", "证据说明"],
];

function fmtVersionValue(value) {
  if (Array.isArray(value)) return value.join(" / ");
  return String(value ?? "");
}

function versionDiff(current, target) {
  return VERSION_FIELDS
    .filter(([key]) => JSON.stringify(current[key] ?? "") !== JSON.stringify(target[key] ?? ""))
    .map(([key, label]) => ({ key, label, from: target[key], to: current[key] }));
}

function renderVersionHistory() {
  const box = $("#methodEditor");
  if (!methodVersions.length) {
    box.innerHTML = `<div class="editor-head"><div><h3>版本历史</h3><p class="muted">还没有版本记录；下一次保存会自动生成。</p></div><button class="admin-secondary" id="versionBack">返回编辑</button></div>
      <div class="empty-state"><div class="big">🕘</div><strong>暂无版本</strong><p>保存一次方法卡后，这里会出现可回滚的快照。</p></div>`;
    return;
  }
  const current = selectedMethod;
  const target = methodVersions.find((v) => v.version === selectedVersion) || methodVersions[0];
  const diffs = versionDiff(current, target.data);
  box.innerHTML = `
    <div class="editor-head">
      <div><h3>版本历史</h3><p class="muted">对比当前版本与历史快照；回滚会生成一个新版本，不会删历史。</p></div>
      <button class="admin-secondary" id="versionBack">返回编辑</button>
    </div>
    <div class="version-layout">
      <div class="version-list">
        ${methodVersions.map((v) => `
          <button class="version-item ${v.version === target.version ? "active" : ""}" data-version="${v.version}">
            <b>v${v.version}</b><span>${fmt(v.created_at)}</span>
            <em>${v.published ? "已发布" : "草稿"}</em>
          </button>`).join("")}
      </div>
      <div class="version-diff">
        <div class="version-diff-head">
          <div><b>当前 → v${target.version}</b><span>${diffs.length ? `${diffs.length} 个字段不同` : "没有字段差异"}</span></div>
          <button class="admin-primary" id="rollbackVersion" data-version="${target.version}" ${target.version === methodVersions[0].version ? "disabled" : ""}>回滚到 v${target.version}</button>
        </div>
        ${diffs.length ? diffs.map((d) => `
          <div class="diff-row">
            <div class="diff-key">${esc(d.label)}</div>
            <div class="diff-values"><span class="old">${esc(fmtVersionValue(d.from)) || "（空）"}</span><span class="arrow">→</span><span class="new">${esc(fmtVersionValue(d.to)) || "（空）"}</span></div>
          </div>`).join("") : `<div class="memory-note">这一版和当前内容一致。</div>`}
      </div>
    </div>`;
}

async function openVersions() {
  if (!selectedMethod?.id) return;
  versionMode = true;
  methodVersions = [];
  selectedVersion = null;
  renderMethodEditor();
  const data = await api(`/api/admin/methods/${encodeURIComponent(selectedMethod.id)}/versions`);
  methodVersions = data.versions || [];
  selectedVersion = methodVersions[0]?.version || null;
  renderMethodEditor();
}

async function rollbackVersion() {
  const version = Number($("#rollbackVersion")?.dataset.version);
  if (!version || !selectedMethod?.id) return;
  if (!confirm(`回滚到 v${version}？当前内容会先保留为新版本。`)) return;
  await api(`/api/admin/methods/${encodeURIComponent(selectedMethod.id)}/rollback`, { method: "POST", body: { version } });
  toast(`已回滚到 v${version}，并生成新版本。`);
  versionMode = false;
  await loadMethods();
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
  const isExisting = Boolean(selectedMethod?.id);
  const path = isExisting ? `/api/admin/methods/${encodeURIComponent(selectedMethod.id)}` : "/api/admin/methods";
  await api(path, { method: isExisting ? "PATCH" : "POST", body: { method, published } });
  toast(published ? "已保存并发布，用户端刷新可见。" : "已保存为草稿。");
  selectedMethod = { ...method, published };
  await loadMethods();
}

async function loadUsers() {
  const data = await api("/api/admin/users");
  const users = data.users || [];
  $("#userTable").innerHTML = `
    <thead><tr><th>用户名</th><th>角色</th><th>注册时间</th><th>最近同步</th><th>建议数</th><th>操作</th></tr></thead>
    <tbody>${users.map((u) => `<tr><td><b>${esc(u.username)}</b></td><td>${u.role === "admin" ? "管理员" : "用户"}</td><td>${fmt(u.created_at)}</td><td>${fmt(u.state_updated_at)}</td><td>${u.suggestion_count || 0}</td><td><button class="admin-secondary" data-reset-id="${esc(u.id)}" data-reset-name="${esc(u.username)}">生成重置码</button></td></tr>`).join("")}</tbody>`;
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
      versionMode = false;
      methodVersions = [];
      renderMethodList();
      return renderMethodEditor();
    }
    if (e.target.id === "methodVersions") return openVersions();
    if (e.target.id === "versionBack") { versionMode = false; return renderMethodEditor(); }
    if (e.target.id === "rollbackVersion") return rollbackVersion();
    const versionBtn = e.target.closest("[data-version]");
    if (versionBtn && versionMode) {
      selectedVersion = Number(versionBtn.dataset.version);
      return renderVersionHistory();
    }
    const resetBtn = e.target.closest("[data-reset-id]");
    if (resetBtn) {
      const data = await api(`/api/admin/users/${encodeURIComponent(resetBtn.dataset.resetId)}/reset-code`, { method: "POST", body: {} });
      window.prompt(`@${resetBtn.dataset.resetName} 的一次性重置码（15 分钟内有效，只显示一次）：`, data.code);
      return;
    }
    if (e.target.id === "detailSave") return saveSuggestion();
    if (e.target.id === "detailCancel") { $("#detailReply").value = ""; return; }
    if (e.target.id === "methodSave") return saveMethod();
    if (e.target.id === "methodPublish") return saveMethod(!selectedMethod?.published);
    if (e.target.id === "newMethodBtn") {
      selectedMethod = { id: "", name: "", en: "", category: "通用", domains: ["通用"], evidence: "C", evidence_note: "", time: 20, difficulty: 2, one_liner: "", why: "", steps: [], materials: [], metric: "", fail: [], switch_when: "", source: "", published: false };
      versionMode = false;
      methodVersions = [];
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
      if (view === "metrics") await loadMetrics();
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
  await loadMetrics();
  await loadUsers();
}

init().catch((err) => {
  console.error(err);
  toast(err.message || "加载失败");
});
