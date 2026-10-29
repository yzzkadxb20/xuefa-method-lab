import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCENARIOS,
  buildProfile,
  matchMethods,
  buildDiagnosis,
  buildTasks,
  computeEffect,
  decideOutcome,
  buildNextDay,
} from "../public/js/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TEST_BASE || "http://127.0.0.1:4180";
const METHODS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "data", "methods.json"), "utf8")).methods;
const byId = new Map(METHODS.map((m) => [m.id, m]));

const sc = SCENARIOS.english;
const profile = buildProfile(sc.answers, "林同学");
const first = byId.get(sc.methodId);
const second = byId.get(sc.switchId);
const scores = matchMethods(METHODS, profile);
const scoredSecond = scores.find((m) => m.id === second.id) || { ...second, fit: 86, reasons: ["该场景的首选微试验"] };

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ts = (n, h = 20, m = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
profile.createdAt = new Date(ts(-6, 9, 0)).toISOString();

const logs = sc.logs.map((l, i) => {
  const method = i < 3 ? first : second;
  return {
    id: `demo-log-${i + 1}`,
    date: day(i - sc.logs.length),
    day: i + 1,
    ...l,
    effect: computeEffect(l),
    methodId: method.id,
    methodName: method.name,
    minutes: i < 3 ? 30 : 28,
  };
});

const trial1 = {
  id: "demo-trial-1",
  methodId: first.id,
  methodName: first.name,
  startDate: logs[0].date,
  endDate: logs[2].date,
  status: "switched",
  logIds: logs.slice(0, 3).map((l) => l.id),
  avgCompletion: Math.round((logs[0].completion + logs[1].completion + logs[2].completion) / 3),
  avgEffect: Math.round((logs[0].effect + logs[1].effect + logs[2].effect) / 3),
  reason: "完成率不低，但自测连续低于 60：方法没有转化为输出。",
};
const trial2 = {
  id: "demo-trial-2",
  methodId: second.id,
  methodName: second.name,
  startDate: logs[3].date,
  endDate: null,
  status: "active",
  logIds: logs.slice(3).map((l) => l.id),
  avgCompletion: Math.round((logs[3].completion + logs[4].completion + logs[5].completion) / 3),
  avgEffect: Math.round((logs[3].effect + logs[4].effect + logs[5].effect) / 3),
};

const decision = decideOutcome(logs[2]);
decision.action = "switch";
decision.type = "方法不匹配";
decision.headline = "你执行了，但效果没有跟上，建议换法。";
decision.reason = "完成率 55%、自测 48，说明「做了」但没有转化为可检查的结果。不是你不努力，是方法和当前瓶颈不匹配。";
const nextDay = buildNextDay(profile, first, { ...decision, nextMethod: second });
const summary = { log: logs[2], decision, method: first, nextDay, nextMethod: second };

const plan = buildTasks(profile, second);
plan.tasks[0].done = true;

const state = {
  version: 3,
  createdAt: new Date(ts(-6, 9, 0)).toISOString(),
  gate: { step: 3, answers: sc.answers.slice(), complete: true },
  profile,
  diagnosis: buildDiagnosis(profile, scoredSecond),
  match: scores,
  methodId: second.id,
  plan,
  logs,
  trials: [trial1, trial2],
  messages: [
    { id: "m1", role: "agent", type: "text", text: "嗨，我是小法 👋 你今天不用重新讲一遍，我已经记得你走到哪一步了。", data: null, ts: ts(-6, 9, 0) },
    { id: "m2", role: "agent", type: "gate", text: "", data: null, ts: ts(-6, 9, 1) },
    { id: "m3", role: "agent", type: "diagnosis", text: "", data: { diagnosis: buildDiagnosis(profile, scoredSecond) }, ts: ts(-6, 9, 2) },
    { id: "m4", role: "agent", type: "method", text: "", data: { method: scoredSecond, alternatives: scores }, ts: ts(-6, 9, 3) },
    { id: "m5", role: "agent", type: "summary", text: "", data: summary, ts: ts(-3, 20, 40) },
    { id: "m6", role: "agent", type: "switch", text: "", data: { from: first, to: second, decision }, ts: ts(-3, 20, 41) },
    { id: "m7", role: "agent", type: "plan", text: "", data: { plan, method: second, profile, day: 7 }, ts: ts(-1, 9, 5) },
    { id: "m8", role: "agent", type: "text", text: `第 7 天，先按这张卡做。完成后点「完成打卡」，我会根据你的反馈决定是加难度，还是继续换法。`, data: null, ts: ts(-1, 9, 6) },
  ],
  activeView: "chat",
  demo: null,
  lastSummary: summary,
  llmAvailable: false,
  llmEnabled: false,
  llmModel: "",
  libraryFilter: "全部",
  librarySearch: "",
};

let cookie = "";
async function request(pathname, options = {}) {
  const headers = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${pathname}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    const m = c.match(/ml_session=([^;]+)/);
    if (m) cookie = `ml_session=${m[1]}`;
  }
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  let login = await request("/api/auth/login", { method: "POST", body: { username: "demo", password: "demo12345" } });
  if (!login.res.ok) {
    login = await request("/api/auth/register", { method: "POST", body: { username: "demo", password: "demo12345" } });
  }
  if (!login.res.ok) throw new Error(login.data.error || "demo login failed");
  const stateRes = await request("/api/state", { method: "PUT", body: { state } });
  if (!stateRes.res.ok) throw new Error(stateRes.data.error || "state save failed");

  const existing = await request("/api/suggestions");
  if (!existing.data.suggestions?.length) {
    await request("/api/suggestions", {
      method: "POST",
      body: {
        type: "method",
        title: "希望增加播客精听方法",
        content: "每天 20 分钟，想有一套从选材、精听、复述到复习的播客精听方法。",
      },
    });
    await request("/api/suggestions", {
      method: "POST",
      body: {
        type: "issue",
        title: "任务卡完成后按钮反馈不明显",
        content: "完成打卡后希望有更明显的成功反馈，并自动跳到今日总结。",
      },
    });
  }
  console.log(JSON.stringify({ demo: "demo / demo12345", logs: logs.length, suggestions: 2, ok: true }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
