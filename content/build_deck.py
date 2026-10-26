
# ------------------------------------------------------------------ 06 method library
def slide_06():
    s = slide()
    bg(s, CREAM)
    kicker(s, "05 / METHOD LIBRARY")
    title(s, "43 张方法卡，9 个领域，统一的结构。", size=30)
    subtitle(s, "不是「名人方法合集」，而是可执行、可验证、可退出的方法资产。")

    # anatomy card
    rect(s, 0.72, 2.30, 5.55, 4.35, fill=PAPER, line=LINE, radius=0.08)
    badge(s, "METHOD CARD / 示例", 0.96, 2.46, w=1.85, fill=INK, color=MINT, size=7.5)
    tx(s, "影子跟读", 0.96, 2.80, 2.4, 0.42, size=22, bold=True)
    tx(s, "Shadowing · 英语口语 / 口头表达", 0.96, 3.22, 4.7, 0.24, size=8.5, color=MUTED, font=SERIF)
    rows = [
        ("适用目标", "口语流利度 / 面试表达 / 语音"),
        ("证据等级", "B · 二语口语训练共识"),
        ("时间成本", "25 min · 难度 2/5"),
        ("执行步骤", "盲听 → 跟读 → 录音 → 复述"),
        ("成功指标", "1 分钟停顿 ≤5 次，3 个语块脱稿"),
        ("失败模式", "只看字幕 / 不录音 / 素材太难"),
        ("换法条件", "跟读流利但复述卡 → 语块串联"),
    ]
    for i, (k, v) in enumerate(rows):
        y = 3.52 + i * 0.43
        tx(s, k, 1.00, y, 0.9, 0.22, size=8.2, color=MUTED2, bold=True)
        tx(s, v, 1.98, y - 0.01, 4.05, 0.24, size=8.8, color=INK2)
        if i < len(rows) - 1:
            line(s, 1.00, y + 0.30, 4.98, y + 0.30, color=LINE2, width=0.5)

    # domain grid
    tx(s, "9 个领域，按「能力 + 反馈方式」组织", 6.62, 2.08, 5.8, 0.28, size=10.5, bold=True)
    domains = [
        ("通用", 15, "记忆 / 理解 / 专注"),
        ("考试", 15, "真题 / 模考 / 错题"),
        ("专业课", 19, "案例 / 推导 / 推理"),
        ("英语口语", 11, "跟读 / 语块 / 录音"),
        ("口头表达", 12, "即兴 / 故事 / 录像"),
        ("编程/理工", 8, "项目 / 调试 / 复现"),
        ("写作", 6, "拆解 / 重写 / 论证"),
        ("审美/化妆", 7, "拆妆 / 半脸 / 光线"),
        ("时间管理", 5, "番茄 / 微习惯 / 复盘"),
    ]
    for i, (name, count, note) in enumerate(domains):
        row, col = divmod(i, 3)
        x = 6.62 + col * 2.03
        y = 2.46 + row * 1.03
        rect(s, x, y, 1.88, 0.88, fill=CREAM, line=LINE, radius=0.10)
        tx(s, str(count), x + 0.12, y + 0.12, 0.45, 0.3, size=15, color=CORAL_DARK, bold=True, font=SERIF)
        tx(s, name, x + 0.56, y + 0.14, 1.2, 0.24, size=9.5, bold=True)
        tx(s, note, x + 0.12, y + 0.55, 1.62, 0.2, size=7.2, color=MUTED2)

    # stats strip
    rect(s, 6.62, 5.58, 5.98, 1.02, fill=INK, line=None, radius=0.10)
    for i, (n, label) in enumerate([("10", "证据 A"), ("26", "证据 B"), ("7", "证据 C")]):
        tx(s, n, 6.84 + i * 1.35, 5.70, 0.5, 0.35, size=18, color=(MINT if i == 0 else (GOLD if i == 1 else CORAL)), bold=True, font=SERIF)
        tx(s, label, 7.30 + i * 1.35, 5.78, 0.9, 0.2, size=7.5, color=RGBColor(0xD6, 0xDF, 0xD8))
    line(s, 10.98, 5.72, 10.98, 6.44, color=RGBColor(0x3E, 0x5B, 0x4F), width=0.7)
    tx(s, "129+", 11.18, 5.68, 0.75, 0.35, size=18, color=CREAM, bold=True, font=SERIF)
    tx(s, "资料模板\n（每卡 3 件套）", 11.92, 5.72, 0.58, 0.45, size=7, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.3)

    tx(s, "来源：学习科学文献 + 专业训练体系 + 公开方法访谈；只提炼结构，不复制个人 IP。", 0.72, 6.80, 11.8, 0.22, size=7.8, color=MUTED2)
    footer(s, 6)
    s.notes_slide.notes_text_frame.text = "强调方法卡不是文章，而是结构化资产：目标、证据、时间、步骤、指标、失败模式、换法条件。这样匹配和换法才能被计算。"


# ------------------------------------------------------------------ 07 matcher
def bar_chart(s, x, y, w, h, categories, values, color=CORAL, max_value=100):
    cd = ChartData()
    cd.categories = categories
    cd.add_series("匹配度", values)
    chart = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(x), Inches(y), Inches(w), Inches(h), cd).chart
    chart.has_title = False
    chart.has_legend = False
    chart.font.name = YAHEI
    chart.font.size = Pt(9)
    chart.font.color.rgb = MUTED
    plot = chart.plots[0]
    plot.gap_width = 45
    plot.has_data_labels = True
    dl = plot.data_labels
    dl.font.size = Pt(10)
    dl.font.bold = True
    dl.font.color.rgb = INK
    dl.number_format = "0"
    dl.number_format_is_linked = False
    dl.position = XL_LABEL_POSITION.OUTSIDE_END
    ser = plot.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = color
    ser.format.line.fill.background()
    va = chart.value_axis
    va.minimum_scale = 0
    va.maximum_scale = max_value
    va.major_unit = 20
    va.has_major_gridlines = False
    va.visible = False
    ca = chart.category_axis
    ca.tick_labels.font.name = YAHEI
    ca.tick_labels.font.size = Pt(10)
    ca.tick_labels.font.color.rgb = INK2
    ca.format.line.color.rgb = LINE
    ca.has_major_gridlines = False
    return chart


def slide_07():
    s = slide()
    bg(s, PAPER)
    kicker(s, "06 / MATCHING")
    title(s, "不是 LLM 拍脑袋，是四层打分 + 一条退出机制。", size=29)
    subtitle(s, "推荐必须可解释、可复现、可退出；LLM 只负责把理由讲清楚。")

    # formula panel
    rect(s, 0.72, 2.12, 5.55, 3.82, fill=INK, line=None, radius=0.10)
    tx(s, "FIT SCORE", 0.98, 2.32, 2.0, 0.22, size=8, color=MINT, bold=True, font=SERIF)
    tx(s, "Fit =", 0.98, 2.62, 0.7, 0.35, size=17, color=CREAM, bold=True)
    tx(s, "0.35 × Goal  +  0.25 × Time\n+ 0.20 × Evidence  +  0.20 × History\n−  Friction", 1.75, 2.58, 4.15, 1.05, size=15, color=CREAM, bold=True, line=1.45)
    rows = [
        ("01", "目标 / 学科", "先看方法是否服务这个目标"),
        ("02", "时间 / 难度", "超出预算或认知负荷，降权"),
        ("03", "证据 / 偏好", "A/B/C 分级，不把 C 说成 A"),
        ("04", "历史 / 失败", "试过且无效的方法，不重复推荐"),
    ]
    for i, (n, k, v) in enumerate(rows):
        y = 3.82 + i * 0.47
        tx(s, n, 1.00, y, 0.32, 0.2, size=7.5, color=CORAL, bold=True, font=SERIF)
        tx(s, k, 1.35, y - 0.01, 1.25, 0.22, size=9.5, color=CREAM, bold=True)
        tx(s, v, 2.72, y - 0.01, 3.15, 0.22, size=8.2, color=RGBColor(0xBF, 0xCB, 0xC3))
    tx(s, "LLM 只解释，不负责打分。", 0.98, 5.55, 4.2, 0.24, size=8.5, color=GOLD, bold=True)

    # chart
    rect(s, 6.62, 2.12, 5.98, 3.82, fill=CREAM, line=LINE, radius=0.10)
    tx(s, "候选方法 · 示例用户", 6.86, 2.30, 3.0, 0.25, size=9.5, bold=True)
    tx(s, "4 周英文面试 / 每天 30 分钟 / 5.5 起点", 6.86, 2.56, 4.6, 0.22, size=7.8, color=MUTED2)
    bar_chart(s, 6.82, 2.85, 5.55, 2.72, ["情景角色扮演", "语块串联", "影子跟读"], [69, 74, 79], color=CORAL)

    # bottom chips
    for i, (t, fill, fg) in enumerate([
        ("可解释：每条推荐都有理由", MINT_SOFT, MINT_DARK),
        ("可复现：同一输入同一结果", GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("可退出：3 天不达标就换", CORAL_SOFT, CORAL_DARK),
    ]):
        rect(s, 0.72 + i * 4.02, 6.20, 3.82, 0.46, fill=fill, line=None, radius=0.10)
        tx(s, t, 0.90 + i * 4.02, 6.32, 3.5, 0.22, size=9.2, color=fg, bold=True)

    footer(s, 7)
    s.notes_slide.notes_text_frame.text = "评分公式不需要在答辩里逐项算，但要讲清四层：目标、时间、证据、历史。重点是 LLM 不参与打分，避免不可解释。"


# ------------------------------------------------------------------ 08 memory
def slide_08():
    s = slide()
    bg(s, CREAM)
    kicker(s, "07 / MEMORY")
    title(s, "记忆不是聊天记录，是下一次决策的变量。", size=30)
    subtitle(s, "用户档案、方法试验、每日反馈、洞察规则，四层共同决定「下一步」。")

    layers = [
        ("01", "用户档案", "目标 / 起点 / 时间 / 环境 / 偏好", MINT),
        ("02", "方法试验", "方法、起止、完成率、效果、换法原因", GOLD),
        ("03", "每日反馈", "完成度 / 难度 / 自测 / 状态 / 原话", CORAL),
        ("04", "洞察规则", "什么有效、什么无效、何时该换", RGBColor(0xDB, 0xEA, 0xF8)),
    ]
    for i, (n, head, desc, tint) in enumerate(layers):
        y = 2.24 + i * 0.88
        rect(s, 0.72, y, 5.95, 0.74, fill=CREAM, line=LINE, radius=0.10)
        oval(s, 0.92, y + 0.15, 0.42, 0.42, fill=tint)
        tx(s, n, 0.92, y + 0.24, 0.42, 0.2, size=8, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, head, 1.50, y + 0.12, 1.35, 0.26, size=11.5, bold=True)
        tx(s, desc, 2.92, y + 0.14, 3.55, 0.3, size=8.6, color=MUTED)
        if i < len(layers) - 1:
            line(s, 1.13, y + 0.60, 1.13, y + 0.86, color=LINE, width=1.0)

    # example card
    rect(s, 6.98, 2.24, 5.55, 3.35, fill=INK, line=None, radius=0.10)
    tx(s, "EXAMPLE / 第 3 天", 7.22, 2.28, 3.0, 0.22, size=8, color=MINT, bold=True, font=SERIF)
    tx(s, "完成率 55%  ·  自测 48  ·  难度 5/5", 7.22, 2.58, 4.9, 0.3, size=12.5, color=CREAM, bold=True)
    tx(s, "系统判断：不是「再坚持一下」，\n而是方法没有转化为输出。", 7.22, 3.02, 4.8, 0.62, size=11.5, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.55)
    line(s, 7.22, 3.82, 12.10, 3.82, color=RGBColor(0x3E, 0x5B, 0x4F), width=0.8)
    tx(s, "→ 触发换法：影子跟读 → 语块串联", 7.22, 3.98, 4.8, 0.3, size=11.5, color=MINT, bold=True)
    tx(s, "→ 次日任务：摘 10 个语块 / 每个造 2 句 / 串 1 分钟", 7.22, 4.38, 4.9, 0.3, size=9.5, color=RGBColor(0xBF, 0xCB, 0xC3))
    tx(s, "→ 3 天后复判：有效则保留，无效继续换", 7.22, 4.74, 4.9, 0.3, size=9.5, color=RGBColor(0xBF, 0xCB, 0xC3))

    # schema
    rect(s, 6.98, 5.65, 5.55, 0.95, fill=PAPER, line=LINE, radius=0.10)
    tx(s, "DATA SCHEMA", 7.18, 5.78, 1.5, 0.2, size=7.2, color=MUTED2, bold=True, font=SERIF)
    for i, name in enumerate(["profile", "trial", "daily_log", "insight"]):
        tx(s, name, 7.18 + i * 1.30, 6.02, 1.15, 0.22, size=8.5, color=INK2, bold=True, font=SERIF)
        if i < 3:
            tx(s, "→", 8.28 + i * 1.30, 6.02, 0.2, 0.2, size=9, color=CORAL, bold=True)

    # privacy strip
    rect(s, 0.72, 6.02, 5.95, 0.58, fill=MINT_SOFT, line=None, radius=0.10)
    tx(s, "🔒 本地优先 · 最小化 · 可导出/删除 · 不训练用户数据", 0.92, 6.16, 5.55, 0.25, size=8.8, color=MINT_DARK, bold=True)
    tx(s, "“100% 售后”在我们的定义里 = 每次反馈都有回应；不承诺提分，承诺不消失。", 0.72, 6.76, 11.8, 0.22, size=7.8, color=MUTED2)
    footer(s, 8)
    s.notes_slide.notes_text_frame.text = "记忆有四个层次，不是把所有聊天都存下来。隐私边界要主动讲：本地优先、可删除、不训练。100% 售后改成可兑现的承诺。"


# ------------------------------------------------------------------ 09 daily loop
def slide_09():
    s = slide()
    bg(s, PAPER)
    kicker(s, "08 / DAILY LOOP")
    title(s, "一张今天能执行、晚上能验收的任务卡。", size=30)
    subtitle(s, "从「学什么」到「怎么证明学会了」，中间只隔一张卡。")

    # timeline
    events = [
        ("09:00", "学情判断", "目标清晰度 / 起点 / 风险", MINT),
        ("09:03", "方法匹配", "只推 1 个主方法 + 2 个备选", GOLD),
        ("09:05", "今日任务", "3 件事 / 25 分钟 / 可检查产出", CORAL),
        ("20:30", "完成打卡", "完成度 / 难度 / 自测 / 卡点", RGBColor(0xDB, 0xEA, 0xF8)),
        ("20:35", "今日总结", "有效保留 / 无效换法 / 次日内容", MINT),
    ]
    for i, (time, head, desc, tint) in enumerate(events):
        y = 2.18 + i * 0.86
        tx(s, time, 0.74, y, 0.65, 0.24, size=9, color=CORAL_DARK, bold=True, font=SERIF)
        oval(s, 1.50, y + 0.05, 0.16, 0.16, fill=tint, line=INK)
        if i < len(events) - 1:
            line(s, 1.58, y + 0.22, 1.58, y + 0.84, color=LINE, width=1.0)
        tx(s, head, 1.82, y - 0.02, 1.55, 0.24, size=11.5, bold=True)
        tx(s, desc, 3.38, y, 2.65, 0.24, size=8.8, color=MUTED)

    # screenshot
    pic_fit(s, ASSETS / "ui_plan.png", 6.35, 2.02, 6.25, 4.75, border=True, label="UI 实录 · 今日任务卡")
    # annotation
    badge(s, "3 件事", 9.20, 2.20, w=0.72, fill=CORAL, color=WHITE, size=7.5)
    badge(s, "可检查产出", 10.95, 3.46, w=1.0, fill=INK, color=MINT, size=7.2)
    badge(s, "晚上反馈", 11.95, 5.88, w=0.82, fill=GOLD, color=INK, size=7.2)

    tx(s, "“任务卡不是待办清单，是实验记录。”", 0.74, 6.45, 5.0, 0.3, size=10, color=MUTED, italic=True)
    footer(s, 9)
    s.notes_slide.notes_text_frame.text = "这一天的时间轴是关键：早上给判断和方法，晚上收反馈，立刻总结并排次日。用户不需要自己记住下一步。"


# ------------------------------------------------------------------ 10 switch
def slide_10():
    s = slide()
    bg(s, CREAM)
    kicker(s, "09 / SWITCH")
    title(s, "效果不好就换法，但先判断是哪一种不好。", size=30)
    subtitle(s, "换法不是情绪反应，是一个有阈值、有原因、有记录的状态迁移。")

    cards = [
        ("执行阻力", "完成率 < 60%", "先降门槛：拆任务、缩时长、换时段。不要急着换法。", GOLD),
        ("方法不匹配", "完成率高 + 自测 < 60%", "做了但没有转化为输出：换一个反馈更快的方法。", CORAL),
        ("认知过载", "难度 5/5 + 效果 < 65", "方法太难：换更轻、更熟悉、步骤更少的方法。", RGBColor(0xDB, 0xEA, 0xF8)),
        ("方法有效", "完成率高 + 自测高", "保留方法，只加一个变量：素材难度或自测严格度。", MINT),
    ]
    for i, (head, trigger, action, tint) in enumerate(cards):
        row, col = divmod(i, 2)
        x = 0.72 + col * 6.08
        y = 2.20 + row * 1.55
        rect(s, x, y, 5.80, 1.35, fill=CREAM, line=LINE, radius=0.10)
        plain_rect(s, x, y, 0.10, 1.35, fill=tint)
        tx(s, head, x + 0.28, y + 0.15, 1.25, 0.26, size=12.5, bold=True)
        tx(s, trigger, x + 1.52, y + 0.16, 2.0, 0.24, size=8.2, color=CORAL_DARK, bold=True)
        tx(s, action, x + 0.28, y + 0.57, 5.2, 0.55, size=9.2, color=MUTED, line=1.5)

    # case strip
    rect(s, 0.72, 5.25, 11.90, 1.18, fill=INK, line=None, radius=0.10)
    tx(s, "案例：第 3 天触发换法", 0.96, 5.42, 2.2, 0.25, size=8.2, color=MINT, bold=True, font=SERIF)
    tx(s, "影子跟读", 0.96, 5.72, 1.0, 0.26, size=11, color=CREAM, bold=True)
    tx(s, "完成 60 / 65 / 55    自测 52 / 55 / 48", 1.98, 5.74, 3.15, 0.24, size=9, color=RGBColor(0xD6, 0xDF, 0xD8))
    arrow(s, 5.18, 5.76, 0.42, 0.18, color=CORAL)
    tx(s, "语块串联", 5.78, 5.72, 1.0, 0.26, size=11, color=MINT, bold=True)
    tx(s, "完成 85 / 88 / 92    效果 68 / 74 / 80", 6.82, 5.74, 3.55, 0.24, size=9, color=RGBColor(0xD6, 0xDF, 0xD8))
    badge(s, "换法后 +24 分", 10.72, 5.70, w=1.45, fill=MINT, color=INK, size=8)

    tx(s, "“换法不是失败，是控制变量。”", 0.72, 6.65, 5.8, 0.3, size=10, color=MUTED, italic=True)
    footer(s, 10)
    s.notes_slide.notes_text_frame.text = "这一页回答评委最可能问的问题：效果不好怎么办？先区分执行阻力和方法不匹配，避免把什么都归因于方法。"
