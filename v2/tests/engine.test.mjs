import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_QUESTIONS,
  buildProfile,
  buildTasks,
  detectDomain,
  parseMinutes,
  SCENARIOS,
} from "../public/js/engine.js";

test("domain detection: makeup / english / exam", () => {
  assert.equal(detectDomain("底妆总卡粉，想学会通勤妆"), "审美/化妆");
  assert.equal(detectDomain("4 周后英文面试，想连续说 2 分钟"), "英语口语");
  assert.equal(detectDomain("审计期末想从 60 到 80"), "考试");
});

test("forced domain wins over conflicting answer text", () => {
  const profile = buildProfile(
    ["4 周后英文面试", "会基础，但底妆总卡粉", "每天 1 小时"],
    "tester",
    "英语口语"
  );
  assert.equal(profile.domain, "英语口语");
  assert.equal(profile.minutes, 60);
});

test("domain falls back when no override", () => {
  const profile = buildProfile(["4 周后英文面试", "雅思 5.5，开口语法乱", "每天 30 分钟"]);
  assert.equal(profile.domain, "英语口语");
});

test("task builder adds stable ids, reasons and total minutes", () => {
  const profile = buildProfile(
    ["4 周后英文面试", "雅思 5.5，开口语法乱", "每天 30 分钟"],
    "tester",
    "英语口语"
  );
  const plan = buildTasks(profile, { id: "chunking", name: "语块串联", category: "英语口语", metric: "1 分钟录音" });
  assert.equal(plan.tasks.length, 3);
  assert.equal(plan.tasks[0].id, "chunking-0");
  assert.ok(plan.tasks.every((t) => t.reason && t.reason.length > 5));
  assert.equal(plan.totalMinutes, plan.tasks.reduce((s, t) => s + t.minutes, 0));
});

test("baseline has five scored questions", () => {
  assert.equal(BASELINE_QUESTIONS.length, 5);
  for (const q of BASELINE_QUESTIONS) {
    assert.ok(q.q.length > 4);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.every((o) => Number.isInteger(o.score)));
  }
});

test("parseMinutes handles minutes and hours", () => {
  assert.equal(parseMinutes("每天 30 分钟"), 30);
  assert.equal(parseMinutes("每天 1 小时"), 60);
  assert.equal(parseMinutes("没有时间"), 30);
});

test("demo scenarios remain available", () => {
  assert.ok(Object.keys(SCENARIOS).length >= 3);
  for (const id of ["english", "audit", "makeup"]) assert.ok(SCENARIOS[id]);
});
