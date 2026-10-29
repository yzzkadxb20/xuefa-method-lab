/* 学法实验室 · 规则引擎
 * 设计原则：门槛、匹配、换法由确定性逻辑保证；语言表达可交给 LLM 增强。
 * 这样既不会“聊着聊着忘了原则”，也能让推荐可解释、可复现。
 */

export const DOMAINS = ["通用", "考试", "英语口语", "口头表达", "专业课", "编程/理工", "写作", "审美/化妆", "时间管理"];

export const DOMAIN_META = {
  "通用": { emoji: "🧩", color: "#2F6B57" },
  "考试": { emoji: "📝", color: "#C25B3F" },
  "英语口语": { emoji: "🗣️", color: "#2E6F9E" },
  "口头表达": { emoji: "🎤", color: "#9A5B8C" },
  "专业课": { emoji: "📚", color: "#7A6236" },
  "编程/理工": { emoji: "💻", color: "#3D6B8A" },
  "写作": { emoji: "✍️", color: "#8A5A44" },
  "审美/化妆": { emoji: "💄", color: "#B4556E" },
  "时间管理": { emoji: "⏱️", color: "#5B6B4A" },
};

const PREFERRED = {
  "英语口语": "shadowing",
  "口头表达": "321-impromptu",
  "审美/化妆": "half-face",
  "编程/理工": "build-small",
  "写作": "imitate-rewrite",
  "考试": "past-paper-reverse",
  "专业课": "case-rule",
  "通用": "active-recall",
  "时间管理": "pomodoro",
};

export function detectDomain(text) {
  const t = String(text || "").toLowerCase();
  if (/化妆|妆容|底妆|眼妆|仿妆|通勤妆|遮瑕|修容|口红|肤质/.test(t)) return "审美/化妆";
  if (/英语|英文|口语|雅思|托福|雅思口语|面试.*(说|讲|英文)|english|speaking|interview/.test(t)) return "英语口语";
  if (/演讲|展示|答辩|汇报|口头|表达|pre|presentation|讲台|路演/.test(t)) return "口头表达";
  if (/编程|代码|算法|计算机|前端|后端|python|java|项目|debug|开发/.test(t)) return "编程/理工";
  if (/写作|论文|作文|文案|essay|writing/.test(t)) return "写作";
  if (/审计|会计|法学|法律|医学|临床|金融|专业|期末|考研|考试|复习|备考|证书|cpa|acca/.test(t)) {
    return /期末|考研|考试|复习|备考|证书|cpa|acca/.test(t) ? "考试" : "专业课";
  }
  if (/时间|拖延|专注|坚持|计划|效率/.test(t)) return "时间管理";
  return "通用";
}

export function parseMinutes(text) {
  const t = String(text || "");
  const min = t.match(/(\d+)\s*(分钟|min|mins|minutes)/i);
  if (min) return Math.max(5, parseInt(min[1], 10));
  const hour = t.match(/(\d+(?:\.\d+)?)\s*(小时|h|hr|hours?)/i);
  if (hour) return Math.max(5, Math.round(parseFloat(hour[1]) * 60));
  if (/半小时/.test(t)) return 30;
  if (/一小时|1\s*小时/.test(t)) return 60;
  return 30;
}

export function parseDays(text) {
  const t = String(text || "");
  const week = t.match(/(\d+)\s*(周|星期|weeks?)/i);
  if (week) return parseInt(week[1], 10) * 7;
  const day = t.match(/(\d+)\s*(天|日|days?)/i);
  if (day) return parseInt(day[1], 10);
  const month = t.match(/(\d+)\s*(个月|月|months?)/i);
  if (month) return parseInt(month[1], 10) * 30;
  if (/明天|后天|下周/.test(t)) return 7;
  return 21;
}

export function detectLevel(baseline) {
  const t = String(baseline || "");
  if (/零基础|没学过|小白|5\.0|5\.5|4\.5|不及格|60|很差|从零|不敢|开不了口/.test(t)) return "起步";
  if (/熟练|90|85|7\.5|8\.0|很好|流利|专业|资深/.test(t)) return "进阶";
  return "有基础";
}

export function buildProfile(answers, name = "体验用户") {
  const [goal = "", baseline = "", constraints = ""] = answers;
  const domain = detectDomain(`${goal} ${baseline} ${constraints}`);
  return {
    name,
    goal: goal.trim(),
    baseline: baseline.trim(),
    constraints: constraints.trim(),
    domain,
    minutes: parseMinutes(`${constraints} ${goal}`),
    deadline: parseDays(`${goal} ${constraints}`),
    level: detectLevel(baseline),
    failedMethods: [],
    createdAt: new Date().toISOString(),
  };
}

export function matchMethods(methods, profile) {
  const preferred = PREFERRED[profile.domain];
  const scored = methods.map((m) => {
    let score = 0;
    const reasons = [];
    if (m.domains.includes(profile.domain)) {
      score += 45;
      reasons.push(`领域匹配：${profile.domain}`);
    }
    if (m.domains.includes("通用")) score += 6;
    if (m.goals.some((g) => profile.goal.includes(g))) {
      score += 8;
      reasons.push("目标关键词吻合");
    }
    if (m.evidence === "A") score += 10;
    else if (m.evidence === "B") score += 6;
    else score += 2;
    if (m.time <= profile.minutes + 5) {
      score += 10;
      reasons.push(`时间成本 ${m.time} 分钟，适配你的 ${profile.minutes} 分钟`);
    } else if (m.time > profile.minutes * 2) {
      score -= 12;
      reasons.push(`时间成本 ${m.time} 分钟，超出你的预算`);
    }
    if (profile.level === "起步" && m.difficulty >= 4) score -= 10;
    if (profile.deadline <= 21 && ["past-paper-reverse", "timed-mock", "three-round-review"].includes(m.id)) {
      score += 12;
      reasons.push("临近截止，优先考试策略");
    }
    if (preferred === m.id) {
      score += 18;
      reasons.push("该场景的首选微试验");
    }
    if (profile.failedMethods?.includes(m.id)) {
      score -= 40;
      reasons.push("你之前试过且效果不佳");
    }
    return { ...m, fit: Math.max(0, Math.min(99, Math.round(score))), reasons };
  });
  scored.sort((a, b) => b.fit - a.fit || a.difficulty - b.difficulty);
  return scored.slice(0, 3);
}

export function buildDiagnosis(profile, method) {
  const risk = (() => {
    const t = `${profile.baseline} ${profile.constraints}`;
    if (/没时间|忙|加班|课多|碎片|打断|宿舍/.test(t)) return "时间碎片化，计划容易被现实打断";
    if (/卡|不敢|紧张|忘|开不了口|语法|错/.test(t)) return "输出焦虑与提取困难，输入多但输出少";
    if (/拖延|坚持|三分钟热度|懒/.test(t)) return "启动阻力大于学习难度，需要先降低门槛";
    return "缺少可量化的反馈，难以判断方法是否真的有效";
  })();
  const readiness = Math.max(45, Math.min(92, 70 + (profile.deadline <= 21 ? 8 : 0) + (profile.minutes >= 30 ? 6 : -4)));
  return {
    title: "学情判断",
    headline: "你缺的不是更多方法，而是一个能验证效果的闭环。",
    summary: `目标「${profile.goal}」是具体的；你的起点是「${profile.baseline}」；每天可投入约 ${profile.minutes} 分钟，截止约 ${profile.deadline} 天。`,
    bullets: [
      { label: "目标清晰度", value: profile.goal.length > 12 ? "较高" : "一般，建议再具体一点" },
      { label: "当前起点", value: `${profile.level} · ${profile.domain}` },
      { label: "主要风险", value: risk },
      { label: "匹配准备度", value: `${readiness}/100` },
    ],
    prescription: `先用「${method.name}」做 3 天微试验。不要一次改所有习惯，只验证一件事：这个方法能不能让你今天产出可检查的结果。`,
    readiness,
  };
}

const TASK_TEMPLATES = {
  "英语口语": (m) => [
    { title: "选一段真实语料", desc: "30-60 秒，盲听 1 遍抓大意；先不要看字幕。", minutes: 5, output: "一句大意" },
    { title: "影子跟读 3 遍", desc: "逐句模仿语音语调，最后录 1 分钟；卡住也继续。", minutes: 15, output: "1 分钟录音" },
    { title: "回听标 3 个卡点", desc: "只标 3 个，重录一次；不要一次改 10 个问题。", minutes: 5, output: "3 个卡点 + 重录" },
  ],
  "口头表达": (m) => [
    { title: "抽题写 3 行结构", desc: "冲突 / 行动 / 结果，每行只写关键词。", minutes: 5, output: "3 行结构卡" },
    { title: "录 2 分钟即兴", desc: "不看稿，按结构讲完；允许不完美。", minutes: 12, output: "2 分钟录像" },
    { title: "回看只改 1 个问题", desc: "静音看手势，开声音听停顿，只选一个改。", minutes: 8, output: "1 条改进 + 重录" },
  ],
  "审美/化妆": (m) => [
    { title: "记录肤质与光线", desc: "自然光下拍一张素颜，记下肤质、敏感点、色差。", minutes: 5, output: "肤质/光线档案" },
    { title: "半脸对比练习", desc: "只做半张脸，按底妆-眉眼-修容-唇的顺序。", minutes: 20, output: "半脸成品" },
    { title: "同光拍照对比", desc: "同一光线拍左右脸，只记录 3 个差异。", minutes: 5, output: "3 个差异 + 下次单点改进" },
  ],
  "考试": (m) => [
    { title: "做 10 道真题/自测", desc: "限时 10 分钟，不查资料，先暴露真实水平。", minutes: 10, output: "10 道题的答案" },
    { title: "错题尸检", desc: "标错误类型：知识 / 审题 / 计算 / 表达；写触发条件。", minutes: 20, output: "错题分类表" },
    { title: "主动回忆 3 个考点", desc: "合上资料，用白纸复述；卡住处标红。", minutes: 5, output: "3 个考点 + 卡点" },
  ],
  "专业课": (m) => [
    { title: "选一个真实案例", desc: "先写自己的判断，不要先看答案。", minutes: 8, output: "一段判断" },
    { title: "案例-规则对照", desc: "对照准则/法条/标准，标出判断与规则的差距。", minutes: 18, output: "对照表" },
    { title: "用一句话总结", desc: "写出「什么条件下，适用什么规则」。", minutes: 4, output: "一句触发条件" },
  ],
  "编程/理工": (m) => [
    { title: "写最小版本范围", desc: "只保留 1 个核心功能，写清不做什么。", minutes: 8, output: "MVP 范围卡" },
    { title: "实现并跑通", desc: "先让它在本地跑起来，不追求完整。", minutes: 35, output: "可运行的最小版本" },
    { title: "写调试日志", desc: "记录 1 个卡点、3 个假设、最后怎么解决。", minutes: 7, output: "1 条调试日志" },
  ],
  "写作": (m) => [
    { title: "拆一篇范文", desc: "只拆结构、过渡和 3 个句式，不抄句子。", minutes: 8, output: "范文拆解表" },
    { title: "写 1 段自己的内容", desc: "合上范文，用自己的题目写 200 字。", minutes: 22, output: "200 字初稿" },
    { title: "对照重写", desc: "只改 1 个结构问题，重写开头或结尾。", minutes: 10, output: "1 段重写" },
  ],
  "时间管理": (m) => [
    { title: "写下一个 25 分钟任务", desc: "必须小到能看见完成结果。", minutes: 3, output: "1 个任务" },
    { title: "无切换专注", desc: "25 分钟只做这一件事，打断就记下来。", minutes: 25, output: "1 个可见产出" },
    { title: "记录打断", desc: "写下打断来源，不评价自己。", minutes: 2, output: "打断清单" },
  ],
  "通用": (m) => [
    { title: "写下 3 个核心问题", desc: "围绕今天的内容，问题要能自测。", minutes: 5, output: "3 个问题" },
    { title: "合上资料主动回忆", desc: "用白纸或口述回答，卡住也先不看书。", minutes: 20, output: "一页回忆稿" },
    { title: "对照补缺", desc: "只补卡点，不重抄全部内容。", minutes: 5, output: "3 个卡点" },
  ],
};

const TASK_OVERRIDES = {
  shadowing: () => TASK_TEMPLATES["英语口语"](),
  chunking: () => [
    { title: "摘 10 个高频语块", desc: "从今天的语料或面试题里摘 10 个能直接用的整块表达，按功能分类。", minutes: 5, output: "10 个语块卡" },
    { title: "每个语块造 2 句", desc: "用你自己的经历造句，不抄例句；造完大声读一遍。", minutes: 15, output: "20 个句子" },
    { title: "串成 1 分钟独白", desc: "选 8 个语块，不看稿串成 1 分钟；录音。", minutes: 5, output: "1 分钟录音" },
  ],
  "record-review": () => [
    { title: "录 1 分钟即兴", desc: "选一个面试/日常话题，不写稿，直接说 1 分钟。", minutes: 5, output: "1 分钟原始录音" },
    { title: "回听只标 3 个问题", desc: "停顿、语法、用词各选一个，不要一次标 10 个。", minutes: 5, output: "3 个问题" },
    { title: "重录同一话题", desc: "只改这 3 个问题，重录一次，对比两次。", minutes: 10, output: "重录 + 对比" },
  ],
  "role-play": () => [
    { title: "选场景写角色卡", desc: "面试官/候选人，各写 3 个目标；不要写台词。", minutes: 5, output: "2 张角色卡" },
    { title: "即兴对话 3 分钟 ×2", desc: "第一轮你当候选人，第二轮换角色。", minutes: 15, output: "2 轮对话" },
    { title: "复盘卡点", desc: "只记 1 个听不懂或接不上的地方。", minutes: 5, output: "1 个卡点" },
  ],
  "active-recall": () => [
    { title: "写 3 个核心问题", desc: "围绕今天的内容，问题要能自测，不要抄标题。", minutes: 5, output: "3 个问题" },
    { title: "合上资料回答", desc: "用白纸或口述回答，卡住也先不看书。", minutes: 20, output: "一页回忆稿" },
    { title: "对照补缺", desc: "只补卡点；24 小时后再测一次。", minutes: 5, output: "3 个卡点" },
  ],
  "half-face": () => TASK_TEMPLATES["审美/化妆"](),
  "look-deconstruct": () => [
    { title: "选一个妆容分区截图", desc: "把底妆、眉眼、修容、唇分开看，标出比例和位置。", minutes: 5, output: "4 张分区图" },
    { title: "按结构复现", desc: "按底妆-眉眼-修容-唇的顺序画一遍，不追求同款产品。", minutes: 25, output: "一次完整复现" },
    { title: "同光拍照，只改 1 个差异", desc: "和参考图对比，只选一个结构差异改。", minutes: 10, output: "对比图 + 1 个改进" },
  ],
  "routine-freeze": () => [
    { title: "把流程拆成 5 步", desc: "只保留必要步骤，写清每步用时。", minutes: 5, output: "5 步流程卡" },
    { title: "计时做一次", desc: "同一顺序做一遍，超时就记下超在哪。", minutes: 15, output: "一次计时记录" },
    { title: "记录遗漏与超时", desc: "只记 1 个要删掉的步骤，明天继续固化。", minutes: 5, output: "1 个删减决定" },
  ],
  "video-review": () => [
    { title: "录 3 分钟展示", desc: "按真实场景讲，不背稿；允许卡壳。", minutes: 5, output: "3 分钟录像" },
    { title: "静音看 + 开声音看", desc: "静音看手势/站姿，开声音听语速/停顿。", minutes: 10, output: "2 条观察" },
    { title: "只改 1 个问题，重录", desc: "只改最影响表达的一个动作，重录一次。", minutes: 5, output: "重录 + 对比" },
  ],
};

export function buildTasks(profile, method) {
  const fn = TASK_TEMPLATES[profile.domain] || TASK_TEMPLATES["通用"];
  const override = TASK_OVERRIDES[method.id];
  const tasks = (override ? override() : fn(method)).map((t, i) => ({ ...t, id: `${method.id}-${i}`, done: false }));
  return {
    tasks,
    totalMinutes: tasks.reduce((s, t) => s + t.minutes, 0),
    success: method.metric,
    why: method.why,
  };
}

export function buildNextDay(profile, method, decision) {
  if (decision.action === "switch") {
    return [
      "先用 5 分钟复述昨天最卡的 1 个点，不打开资料。",
      `用新方法「${decision.nextMethod?.name || "待定"}」做一次 15 分钟微练习。`,
      "结束前录/写 1 个可检查的输出，明天对比。",
    ];
  }
  return [
    "先用 5 分钟主动回忆昨天的 3 个卡点。",
    `用「${method.name}」练 20 分钟，换一个更难的素材/题目。`,
    "结束前做一次 2 分钟自测，记录分数和难度。",
  ];
}

export function computeEffect({ completion, difficulty, score, mood }) {
  const moodScore = { 1: 40, 2: 55, 3: 65, 4: 80, 5: 95 }[mood] || 65;
  return Math.round(0.4 * completion + 0.3 * score + 0.2 * (100 - (difficulty - 1) * 20) + 0.1 * moodScore);
}

export function decideOutcome({ completion, difficulty, score, effect }) {
  if (completion < 60) {
    return {
      action: "adjust",
      type: "执行阻力",
      headline: "先别换方法，先把门槛降下来。",
      reason: `完成率 ${completion}% 偏低，今天更像是被任务规模或环境打断了。先缩短单次时长、拆小任务，再判断方法本身。`,
    };
  }
  if (difficulty >= 5 && effect < 65) {
    return {
      action: "switch",
      type: "认知过载",
      headline: "这个方法对你现在太难了，换一个更可执行的。",
      reason: `难度 ${difficulty}/5 且效果分 ${effect}，继续硬扛只会消耗信心。换一个难度更低、反馈更快的方法。`,
    };
  }
  if (effect < 58 || score < 60) {
    return {
      action: "switch",
      type: "方法不匹配",
      headline: "你执行了，但效果没有跟上，建议换法。",
      reason: `效果分 ${effect}、自测 ${score}，说明「做了」但没有转化为可检查的结果。不是你不努力，是方法和当前瓶颈不匹配。`,
    };
  }
  return {
    action: "keep",
    type: "方法有效",
    headline: "今天这个方法值得保留，明天加一点难度。",
    reason: `效果分 ${effect}，完成率 ${completion}%，说明方法能被你执行并产生结果。明天只加一个变量：素材难度或自测严格度。`,
  };
}

export const SCENARIOS = {
  english: {
    id: "english",
    label: "英语口语 · 4 周面试",
    emoji: "🗣️",
    answers: [
      "4 周后有一场英文面试，我想能在压力下连续说 2 分钟不卡壳。",
      "雅思口语 5.5，能写但一开口就语法混乱；上次模拟面试被打断 3 次。",
      "每天 30 分钟，晚上 9 点后，在宿舍，容易被人打断。",
    ],
    methodId: "shadowing",
    switchId: "chunking",
    logs: [
      { completion: 60, difficulty: 4, score: 52, mood: 3, note: "跟读能跟上，但脱稿就卡。" },
      { completion: 65, difficulty: 4, score: 55, mood: 3, note: "录音里停顿还是很多。" },
      { completion: 55, difficulty: 5, score: 48, mood: 2, note: "越练越紧张，开始怀疑自己。" },
      { completion: 85, difficulty: 3, score: 68, mood: 4, note: "换成语块后，至少能说出完整句子。" },
      { completion: 88, difficulty: 3, score: 74, mood: 4, note: "面试常见问题能撑到 90 秒。" },
      { completion: 92, difficulty: 4, score: 80, mood: 5, note: "今天被追问也没崩，继续。" },
    ],
  },
  audit: {
    id: "audit",
    label: "审计学期末 · 2 周",
    emoji: "📚",
    answers: [
      "2 周后审计学期末考，我想从 60 分左右冲到 80 分。",
      "章节都看过，但合上书就说不清；上次模考 58 分，案例题丢分最多。",
      "每天 1 小时，晚上 8 点到 9 点，图书馆，周末可多 1 小时。",
    ],
    methodId: "past-paper-reverse",
    switchId: "active-recall",
    logs: [
      { completion: 70, difficulty: 3, score: 60, mood: 3, note: "真题做了，但错题没归类。" },
      { completion: 75, difficulty: 3, score: 65, mood: 4, note: "开始按考点分类，清楚一点。" },
      { completion: 60, difficulty: 4, score: 58, mood: 3, note: "案例题还是写不出依据。" },
      { completion: 82, difficulty: 3, score: 70, mood: 4, note: "主动回忆能背出准则了。" },
      { completion: 86, difficulty: 3, score: 76, mood: 4, note: "案例-规则对照有用。" },
      { completion: 90, difficulty: 3, score: 82, mood: 5, note: "模考 78，继续。" },
    ],
  },
  speech: {
    id: "speech",
    label: "课堂展示 · 7 天",
    emoji: "🎤",
    answers: [
      "7 天后要做 3 分钟课堂展示，我想讲得清楚、不紧张。",
      "内容准备得还行，但一上台语速就变快，上次展示超时 1 分钟。",
      "每天 20 分钟，午休时间，在空教室，可以录像。",
    ],
    methodId: "321-impromptu",
    switchId: "video-review",
    logs: [
      { completion: 65, difficulty: 3, score: 58, mood: 3, note: "结构有了，但一开口还是快。" },
      { completion: 70, difficulty: 4, score: 62, mood: 3, note: "录像发现自己一直看天花板。" },
      { completion: 80, difficulty: 3, score: 70, mood: 4, note: "只看一个动作后，改善明显。" },
      { completion: 85, difficulty: 3, score: 76, mood: 4, note: "停顿开始可控。" },
      { completion: 88, difficulty: 3, score: 80, mood: 5, note: "完整走了一遍，信心上来了。" },
    ],
  },
  makeup: {
    id: "makeup",
    label: "通勤妆 · 14 天",
    emoji: "💄",
    answers: [
      "2 周内学会一个 15 分钟通勤妆，日常上班能稳定画出来。",
      "会涂粉底和口红，但底妆容易卡粉，眼影总是画脏，分不清是产品还是手法问题。",
      "每天早上 20 分钟，自然光，在宿舍洗手台，只能半脸练习。",
    ],
    methodId: "half-face",
    switchId: "look-deconstruct",
    logs: [
      { completion: 75, difficulty: 3, score: 62, mood: 4, note: "半脸对比能看出卡粉位置。" },
      { completion: 80, difficulty: 3, score: 68, mood: 4, note: "换了上妆顺序，服帖一点。" },
      { completion: 70, difficulty: 4, score: 60, mood: 3, note: "眼影还是脏，可能是晕染问题。" },
      { completion: 85, difficulty: 3, score: 72, mood: 4, note: "按分区拆解后清楚多了。" },
      { completion: 90, difficulty: 3, score: 78, mood: 5, note: "15 分钟能完成，步骤没漏。" },
    ],
  },
};

export const MOODS = [
  { value: 1, emoji: "😫", label: "很糟" },
  { value: 2, emoji: "😕", label: "有点卡" },
  { value: 3, emoji: "😐", label: "一般" },
  { value: 4, emoji: "🙂", label: "不错" },
  { value: 5, emoji: "🤩", label: "很顺" },
];

export function methodById(methods, id) {
  return methods.find((m) => m.id === id) || methods[0];
}

export function scoreLabel(score) {
  if (score >= 80) return "高";
  if (score >= 60) return "中";
  return "低";
}
