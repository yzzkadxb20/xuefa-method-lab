# -*- coding: utf-8 -*-
"""Rebuild the v2 deck to the official 20-page review outline."""
import importlib.util
import os
from pathlib import Path

from pptx.chart.data import ChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

ROOT = Path(r"D:\deepseek-harness\default-workspace")
BASE = ROOT / "method-lab-pro" / "content" / "build_v2_deck.py"
spec = importlib.util.spec_from_file_location("deckbase", BASE)
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)

OUT = ROOT / "deliverables-v2" / "学法实验室v2-参赛PPT-评审版.pptx"
PUBLIC_URL = os.environ.get("PUBLIC_URL", d.PUBLIC_URL)


def set_kicker(slide, old, new):
    for sh in slide.shapes:
        if not getattr(sh, "has_text_frame", False):
            continue
        if sh.text_frame.text.strip() == old:
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    r.text = new
            return


def replace_text(slide, old, new):
    for sh in slide.shapes:
        if not getattr(sh, "has_text_frame", False):
            continue
        if sh.text_frame.text.strip() == old:
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    r.text = new
            return


def remap_sections():
    mapping = {
        "01 / WHY V2": "01 / BACKGROUND",
        "04 / KNOWLEDGE BASE": "03 / KNOWLEDGE BASE",
        "03 / KNOWLEDGE BASE": "04 / CARD SCHEMA",
        "04 / PREPROCESS": "05 / PREPROCESS",
        "05 / ANALYSIS METHOD": "06 / ANALYSIS METHOD",
        "06 / BEHAVIOR DATA": "07 / BEHAVIOR DATA",
        "07 / ANALYSIS FLOW": "08 / ANALYSIS FLOW",
        "08 / DATA EXAMPLE": "09 / DATA EXAMPLE",
        "09 / DESIGN RULES": "10 / DESIGN RULES",
        "10 / INNOVATION 1": "11 / INNOVATION 1",
        "11 / INNOVATION 2": "12 / INNOVATION 2",
        "12 / RESULTS": "13 / RESULTS",
        "13 / PROBLEMS": "14 / PROBLEMS",
        "14 / RECOMMENDATIONS": "15 / RECOMMENDATIONS",
        "15 / SECURITY RISK": "16 / SECURITY RISK",
        "16 / AI RISK": "17 / AI RISK",
        "17 / APPLICATION": "18 / APPLICATION",
        "18 / PROMPTS & LINK": "19 / PROMPTS & LINK",
    }
    for slide in d.prs.slides:
        for sh in slide.shapes:
            if not getattr(sh, "has_text_frame", False):
                continue
            text = sh.text_frame.text.strip()
            if text in mapping:
                for p in sh.text_frame.paragraphs:
                    for r in p.runs:
                        r.text = mapping[text]


def renumber(slide, n):
    for sh in slide.shapes:
        if not getattr(sh, "has_text_frame", False):
            continue
        try:
            text = sh.text_frame.text.strip()
            if text.isdigit() and len(text) == 2 and sh.left > Inches(11.4) and sh.top > Inches(6.8):
                for p in sh.text_frame.paragraphs:
                    for r in p.runs:
                        r.text = f"{n:02d}"
                return
        except Exception:
            pass


def p3_sources():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "02 / DATA SOURCES")
    d.title(s, "三类数据源：权威性、时效性、可用性一起看。", size=28)
    d.subtitle(s, "不是“多抓一点”，而是每条来源都能回答：谁写的、什么时候、能支撑哪一级证据。")
    cards = [
        ("01", "学习科学文献", "同行评议论文 / 元分析", "Dunlosky 2013\nRoediger & Karpicke 2006\nCepeda 2006 · Bjork 2011", "权威性最高；用于证据分级与方法边界。", d.MINT_SOFT, d.MINT_DARK),
        ("02", "专业训练体系", "课程标准 / 考试大纲 / 训练手册", "Cambridge English\nToastmasters\nCPA/ACCA · 临床推理 · 专业化妆", "时效性强；用于步骤、评分与常见失败模式。", d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("03", "公开方法内容", "书籍 / 演讲 / 播客 / 视频", "B站 · 知乎 · 播客\n公开课程 / 教练访谈\n2023–2026 内容", "覆盖新场景；只提炼结构，不复制个人表达。", d.CORAL_SOFT, d.CORAL_DARK),
    ]
    for i, (n, head, sub, body, use, tint, fg) in enumerate(cards):
        x = 0.72 + i * 4.02
        d.rect(s, x, 2.10, 3.78, 3.55, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.oval(s, x + 0.20, 2.28, 0.40, 0.40, fill=tint)
        d.tx(s, n, x + 0.20, 2.37, 0.40, 0.2, size=7.5, color=fg, bold=True, align=PP_ALIGN.CENTER)
        d.tx(s, head, x + 0.74, 2.27, 2.8, 0.28, size=13, bold=True)
        d.tx(s, sub, x + 0.74, 2.60, 2.8, 0.22, size=7.4, color=d.MUTED2)
        d.tx(s, body, x + 0.22, 3.02, 3.2, 0.85, size=7.6, color=d.INK2, line=1.45)
        d.line(s, x + 0.22, 4.02, x + 3.54, 4.02, color=d.LINE2)
        d.tx(s, use, x + 0.22, 4.14, 3.2, 0.55, size=7.4, color=d.MUTED, line=1.45)
        d.tx(s, ["证据权重：高", "证据权重：中高", "证据权重：中低"][i], x + 0.22, 5.12, 2.0, 0.22, size=7.0, color=fg, bold=True)
    d.rect(s, 0.72, 5.96, 11.90, 0.55, fill=d.INK, radius=0.10)
    d.tx(s, "采集边界", 0.94, 6.10, 1.1, 0.22, size=7.4, color=d.MINT, bold=True)
    d.tx(s, "只取公开内容；不抓用户隐私；LLM 只做抽取，人工复核后再入库。", 1.95, 6.10, 9.0, 0.22, size=8.2, color=d.CREAM)
    d.tx(s, "参考：Dunlosky et al. 2013 · Roediger & Karpicke 2006 · Bjork 2011；课程与考试大纲以公开版本为准。", 0.72, 6.66, 11.9, 0.2, size=7.2, color=d.MUTED2)
    d.footer(s, 3)
    s.notes_slide.notes_text_frame.text = "数据来源分三类：文献给证据，专业体系给步骤/评分，公开内容给新场景。采集边界是不抓用户隐私，LLM 只做抽取。"


def p5_knowledge():
    s = d.sld()
    d.bg(s, d.CREAM)
    d.kicker(s, "03 / KNOWLEDGE BASE")
    d.title(s, "知识库不是文章库：一张卡就是一次可执行实验。", size=27)
    d.subtitle(s, "43 张卡、9 个领域；每张卡都有适用目标、证据、时间、步骤、指标、失败模式和换法条件。")
    rows = [
        ("适用目标", "这个方法解决哪类问题，不解决哪类"),
        ("证据等级", "A 多项实验 / B 专业共识 / C 实践者经验"),
        ("时间成本", "分钟数与难度 1–5，超预算直接降权"),
        ("执行步骤", "3–5 步，每步有可检查产出"),
        ("成功指标", "能验收，不靠“感觉有效”"),
        ("失败模式", "什么时候该停，而不是硬扛"),
        ("换法条件", "什么信号出现时换下一个方法"),
    ]
    d.rect(s, 0.72, 2.06, 7.10, 4.28, fill=d.PAPER, line=d.LINE, radius=0.08)
    d.tx(s, "METHOD CARD / 结构", 0.96, 2.24, 2.6, 0.22, size=7.8, color=d.MUTED2, bold=True)
    for i, (k, v) in enumerate(rows):
        y = 2.58 + i * 0.50
        d.tx(s, k, 0.98, y, 0.95, 0.22, size=8.4, color=d.CORAL_DARK, bold=True)
        d.tx(s, v, 1.98, y, 5.5, 0.22, size=8.4, color=d.INK2)
        if i < len(rows) - 1:
            d.line(s, 0.98, y + 0.35, 7.45, y + 0.35, color=d.LINE2, width=0.5)
    right = [
        ("43", "方法卡", d.CORAL_DARK),
        ("9", "领域", d.MINT_DARK),
        ("129+", "资料模板", d.GOLD),
        ("7", "C 级卡片（不直接承诺效果）", d.MUTED),
    ]
    for i, (n, label, color) in enumerate(right):
        y = 2.10 + i * 1.02
        d.rect(s, 8.18, y, 4.44, 0.82, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.tx(s, n, 8.38, y + 0.10, 1.2, 0.34, size=21, color=color, bold=True, font=d.SERIF)
        d.tx(s, label, 9.65, y + 0.24, 2.7, 0.24, size=8.2, color=d.MUTED)
    d.rect(s, 8.18, 6.12, 4.44, 0.42, fill=d.INK, radius=0.10)
    d.tx(s, "复核周期 3 个月 · 来源变更可追溯", 8.38, 6.22, 4.0, 0.2, size=7.2, color=d.MINT, bold=True)
    d.footer(s, 5)
    s.notes_slide.notes_text_frame.text = "知识库是结构化卡片，不是文章集合。每张卡必须有目标、证据、时间、步骤、指标、失败模式、换法条件。"


def p6_pipeline():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "04 / PREPROCESS")
    d.title(s, "从一条公开方法，到一张可匹配的卡。", size=29)
    d.subtitle(s, "七个步骤；LLM 负责抽取，人负责证据与边界。运行时不抓取、不训练用户数据。")
    steps = ["采集", "去重", "结构化", "证据分级", "边界标注", "人工复核", "版本管理"]
    for i, st in enumerate(steps):
        x = 0.72 + i * 1.75
        d.rect(s, x, 2.28, 1.55, 1.02, fill=(d.MINT_SOFT if i % 2 == 0 else d.CREAM), line=d.LINE, radius=0.10)
        d.num_circle(s, str(i + 1), x + 0.14, 2.42, d=0.30, fill=d.INK, color=d.MINT, size=7)
        d.tx(s, st, x + 0.48, 2.46, 1.0, 0.24, size=9, color=d.INK2, bold=True)
        d.tx(s, ["公开内容", "同一方法", "字段统一", "A/B/C", "不适用场景", "专家/编辑", "可回滚"][i], x + 0.14, 2.94, 1.25, 0.22, size=6.6, color=d.MUTED)
        if i < len(steps) - 1:
            d.arrow(s, x + 1.57, 2.70, 0.14, 0.14, color=d.CORAL)
    tools = [
        ("抽取", "LLM 辅助读长文 / 访谈", "只产出候选字段，不直接发布"),
        ("清洗", "去重、统一术语、补来源", "保留原始链接与抓取日期"),
        ("存储", "JSON → SQLite / Postgres", "结构稳定，可版本化"),
        ("复核", "人工看证据、边界、可执行性", "C 级卡不进入默认推荐"),
    ]
    for i, (h, body, note) in enumerate(tools):
        x = 0.72 + i * 3.02
        d.rect(s, x, 3.86, 2.80, 1.22, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.tx(s, h, x + 0.16, 4.00, 0.9, 0.22, size=8.6, color=d.CORAL_DARK, bold=True)
        d.tx(s, body, x + 0.16, 4.32, 2.4, 0.24, size=7.8, color=d.INK2)
        d.tx(s, note, x + 0.16, 4.64, 2.4, 0.22, size=6.8, color=d.MUTED2)
    d.rect(s, 0.72, 5.42, 11.90, 0.78, fill=d.INK, radius=0.10)
    d.tx(s, "技术手段", 0.94, 5.62, 1.2, 0.22, size=7.6, color=d.MINT, bold=True)
    d.tx(s, "LLM 抽取 + 人工复核 + JSON / SQLite / Postgres；Agent 运行时只读知识库，不做实时爬取。", 2.08, 5.62, 9.9, 0.22, size=7.8, color=d.CREAM)
    d.tx(s, "“方法卡不是文案，是可执行、可验证、可退出的资产。”", 0.72, 6.52, 11.8, 0.26, size=9, color=d.MUTED)
    d.footer(s, 6)
    s.notes_slide.notes_text_frame.text = "预处理七步：采集、去重、结构化、证据分级、边界标注、人工复核、版本管理。LLM 只做抽取，人工负责证据与边界。"


def p8_trend():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "06 / BEHAVIOR DATA")
    d.title(s, "6 天数据：完成率先上去，效果分晚一天跟上。", size=27)
    d.subtitle(s, "demo 用户的真实反馈序列：D1–D3 影子跟读，D4 换成语块串联。")
    cd = ChartData()
    cd.categories = ["10/23", "10/24", "10/25", "10/26", "10/27", "10/28"]
    cd.add_series("完成率", (60, 65, 55, 85, 88, 92))
    cd.add_series("效果分", (52, 55, 48, 68, 74, 80))
    gf = s.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS, Inches(0.72), Inches(2.02), Inches(7.65), Inches(4.45), cd)
    ch = gf.chart
    ch.has_title = False
    ch.has_legend = True
    ch.legend.position = XL_LEGEND_POSITION.BOTTOM
    ch.legend.include_in_layout = False
    ch.font.name = d.YAHEI
    ch.font.size = Pt(8.5)
    ch.font.color.rgb = d.INK2
    ch.value_axis.minimum_scale = 0
    ch.value_axis.maximum_scale = 100
    ch.value_axis.major_unit = 20
    ch.value_axis.has_major_gridlines = True
    ch.value_axis.major_gridlines.format.line.color.rgb = d.LINE2
    ch.value_axis.format.line.color.rgb = d.LINE2
    ch.category_axis.format.line.color.rgb = d.LINE2
    ch.value_axis.tick_labels.font.size = Pt(7.5)
    ch.category_axis.tick_labels.font.size = Pt(7.5)
    colors = [d.MINT_DARK, d.CORAL]
    for i, ser in enumerate(ch.series):
        ser.format.line.color.rgb = colors[i]
        ser.format.line.width = Pt(2.4)
        ser.smooth = False
        ser.marker.style = 8
        ser.marker.size = 6
        ser.marker.format.fill.solid()
        ser.marker.format.fill.fore_color.rgb = colors[i]
        ser.marker.format.line.color.rgb = d.CREAM
    d.tx(s, "D4 换法：影子跟读 → 语块串联", 0.92, 6.40, 3.6, 0.24, size=8.2, color=d.CORAL_DARK, bold=True)
    insights = [
        ("完成率高 + 自测低", "D1–D3 完成率不低，但自测 48–55；不是不努力，是方法没转成输出。", d.CORAL_SOFT, d.CORAL_DARK),
        ("效果分滞后一天", "D4 完成率 85，效果 68；换法后需要 1–2 天才能看到结果。", d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("单点不决策", "至少 3 次反馈才触发换法；避免一次状态差就否定方法。", d.MINT_SOFT, d.MINT_DARK),
    ]
    for i, (h, body, tint, fg) in enumerate(insights):
        y = 2.08 + i * 1.32
        d.rect(s, 8.72, y, 3.90, 1.16, fill=tint, line=None, radius=0.10)
        d.tx(s, h, 8.92, y + 0.13, 3.4, 0.24, size=9.4, color=fg, bold=True)
        d.tx(s, body, 8.92, y + 0.45, 3.45, 0.55, size=7.4, color=d.INK2, line=1.45)
    d.tx(s, "数据来自 demo 用户 6 次打卡；用于验证换法逻辑，不代表人群结论。", 8.72, 6.62, 4.0, 0.2, size=6.8, color=d.MUTED2)
    d.footer(s, 8)
    s.notes_slide.notes_text_frame.text = "这条曲线是最重要的分析证据：D1-D3 完成率不低但自测低，D4 换法后完成率和效果都上升。说明问题不在执行力，而在方法匹配。"


def p9_mindmap():
    s = d.sld()
    d.bg(s, d.CREAM)
    d.kicker(s, "07 / ANALYSIS FLOW")
    d.title(s, "分析不是描述，是把行为写成 agent 的决策链。", size=27)
    d.subtitle(s, "从输入到记忆，每一环都对应一个可实现的状态与规则。")
    nodes = [
        ("输入", "3 问 + 打卡", d.MINT_SOFT),
        ("诊断", "目标 / 起点 / 约束", d.GOLD_SOFT),
        ("匹配", "4 层评分", d.BLUE_SOFT),
        ("试验", "3 天微试验", d.CORAL_SOFT),
        ("反馈", "完成 / 难度 / 自测", d.MINT_SOFT),
        ("决策", "保留 / 换法", d.GOLD_SOFT),
    ]
    for i, (h, sub, tint) in enumerate(nodes):
        x = 0.72 + i * 2.05
        d.rect(s, x, 2.28, 1.82, 0.86, fill=tint, line=None, radius=0.10)
        d.tx(s, h, x + 0.12, 2.40, 1.55, 0.24, size=10.5, color=d.INK, bold=True)
        d.tx(s, sub, x + 0.12, 2.72, 1.55, 0.2, size=7.2, color=d.MUTED)
        if i < len(nodes) - 1:
            d.arrow(s, x + 1.84, 2.62, 0.16, 0.14, color=d.CORAL)
    d.line(s, 11.62, 3.20, 11.62, 3.72, color=d.CORAL, width=1.2)
    d.line(s, 1.62, 3.72, 11.62, 3.72, color=d.CORAL, width=1.2)
    d.line(s, 1.62, 3.72, 1.62, 3.20, color=d.CORAL, width=1.2)
    d.tx(s, "每次反馈写回 user_state，下一次诊断直接读历史", 3.45, 3.80, 7.4, 0.24, size=8.4, color=d.CORAL_DARK, bold=True)
    rules = [
        ("完成率 < 60", "先降门槛：拆任务、缩时长；不要急着换法。", d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("完成率高 + 自测 < 60", "方法不匹配：换一个反馈更快的方法。", d.CORAL_SOFT, d.CORAL_DARK),
        ("难度 5/5 + 效果 < 65", "认知过载：换更轻、更熟悉的方法。", d.BLUE_SOFT, RGBColor(0x2E, 0x6F, 0x9E)),
    ]
    for i, (h, body, tint, fg) in enumerate(rules):
        x = 0.72 + i * 4.02
        d.rect(s, x, 4.72, 3.78, 1.05, fill=tint, line=None, radius=0.10)
        d.tx(s, h, x + 0.18, 4.88, 3.2, 0.24, size=8.8, color=fg, bold=True)
        d.tx(s, body, x + 0.18, 5.18, 3.35, 0.42, size=7.4, color=d.INK2, line=1.4)
    d.tx(s, "分析结论必须能落成 if / else，而不是停在“建议多练习”。", 0.72, 6.22, 11.8, 0.26, size=9.5, color=d.MUTED, bold=True)
    d.footer(s, 9)
    s.notes_slide.notes_text_frame.text = "分析流程：输入、诊断、匹配、试验、反馈、决策，再写回记忆。下面三条规则是从数据直接推出的 agent 决策。"


def p11_rules():
    s = s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "09 / DESIGN RULES")
    d.title(s, "把洞察写成硬规则，而不是一段总结。", size=29)
    d.subtitle(s, "规则进入 decideOutcome()，每次打卡后自动执行；LLM 只负责解释，不负责改阈值。")
    cards = [
        ("01", "执行阻力", "completion < 60", "先降门槛：拆任务、缩时长、换时段；不换法。", d.GOLD),
        ("02", "方法不匹配", "completion ≥ 60\nselfTest < 60", "换一个反馈更快的方法；记录换法原因。", d.CORAL),
        ("03", "认知过载", "difficulty = 5\neffect < 65", "换更轻、更熟悉、步骤更少的方法。", d.BLUE_SOFT),
        ("04", "方法有效", "effect ≥ 70\ncompletion ≥ 70", "保留方法，只加一个变量：素材或自测严格度。", d.MINT_DARK),
    ]
    for i, (n, h, trigger, action, color) in enumerate(cards):
        row, col = divmod(i, 2)
        x = 0.72 + col * 6.05
        y = 2.08 + row * 1.56
        d.rect(s, x, y, 5.80, 1.34, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.plain_rect(s, x, y, 0.10, 1.34, fill=color)
        d.tx(s, n, x + 0.28, y + 0.13, 0.4, 0.2, size=7.5, color=color, bold=True, font=d.SERIF)
        d.tx(s, h, x + 0.70, y + 0.12, 1.4, 0.24, size=12, bold=True)
        d.tx(s, trigger, x + 2.18, y + 0.12, 2.2, 0.5, size=8.2, color=d.CORAL_DARK, bold=True, line=1.35)
        d.tx(s, action, x + 0.28, y + 0.76, 5.2, 0.45, size=8.2, color=d.MUTED, line=1.45)
    d.rect(s, 0.72, 5.36, 11.90, 0.72, fill=d.INK, radius=0.10)
    d.tx(s, "decideOutcome(log) → keep / switch / lower", 0.94, 5.56, 5.2, 0.24, size=9, color=d.MINT, bold=True, font=d.SERIF)
    d.tx(s, "同一套规则同时用于：今日总结、换法提示、次日任务、管理员复盘。", 6.25, 5.56, 6.1, 0.24, size=7.6, color=d.CREAM)
    d.tx(s, "“方法不是信仰，是待验证的假设。”", 0.72, 6.42, 8.0, 0.26, size=10, color=d.MUTED)
    d.footer(s, 11)
    s.notes_slide.notes_text_frame.text = "把分析结论落成四条硬规则：执行阻力降门槛；方法不匹配换法；认知过载降难度；有效则只加一个变量。"


def p14_results():
    s = d.sld()
    d.bg(s, d.CREAM)
    d.kicker(s, "12 / RESULTS")
    d.title(s, "结果：6 天、1 次换法、+24 分。", size=30)
    d.subtitle(s, "不是“提分承诺”，是一个可复盘的个体实验；同一套数据同时服务用户总结和管理员复盘。")
    d.pic(s, d.ASSETS / "v2_ui_report.png", 0.72, 2.18, 6.80, 4.38, border=True)
    stats = [
        ("6", "天反馈", "连续记录，没断"),
        ("74%", "平均完成率", "执行层面稳定"),
        ("64", "平均效果分", "需要继续调试"),
        ("+24", "换法后提升", "影子跟读 → 语块串联"),
    ]
    for i, (n, label, note) in enumerate(stats):
        row, col = divmod(i, 2)
        x = 7.82 + col * 2.40
        y = 2.05 + row * 1.38
        d.rect(s, x, y, 2.22, 1.18, fill=d.PAPER, line=d.LINE, radius=0.10)
        d.tx(s, n, x + 0.14, y + 0.12, 1.2, 0.36, size=21, color=(d.CORAL_DARK if n == "+24" else d.INK), bold=True, font=d.SERIF)
        d.tx(s, label, x + 0.14, y + 0.55, 1.9, 0.2, size=7.6, color=d.MUTED2)
        d.tx(s, note, x + 0.14, y + 0.80, 1.95, 0.22, size=6.7, color=d.MUTED)
    d.rect(s, 7.82, 5.05, 4.44, 1.02, fill=d.INK, radius=0.10)
    d.tx(s, "管理员视角", 8.02, 5.18, 1.4, 0.22, size=7.4, color=d.MINT, bold=True)
    d.tx(s, "2 条建议进入工单 · 43 张卡可编辑/发布", 8.02, 5.46, 4.0, 0.22, size=7.4, color=d.CREAM)
    d.tx(s, "“效果不好就换法，但先判断是哪一种不好。”", 7.82, 6.34, 4.4, 0.25, size=7.8, color=d.MUTED)
    d.footer(s, 14)
    s.notes_slide.notes_text_frame.text = "结果页用 demo 的 6 天数据：74% 平均完成率、64 平均效果分、换法后 +24。强调是个体实验，不是提分承诺。"


def p15_problems():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "13 / PROBLEMS")
    d.title(s, "三个还没解决的问题，比三个卖点更重要。", size=28)
    d.subtitle(s, "来自本地 + 公网双角色验收，而不是“拍脑袋的不足”。")
    cards = [
        ("01", "诊断依赖自述", "三问靠用户自己描述目标、起点和约束；没有客观基线，用户可能高估或低估自己。", "风险：方案看起来合理，但起点判断偏了。", d.CORAL_SOFT, d.CORAL_DARK),
        ("02", "匹配权重未校准", "4 层评分的权重是人工设定；43 张卡、C 级 7 张，样本不足以证明权重最优。", "风险：换法规则有效，但排序未必最优。", d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("03", "内容运营太重", "管理员能编辑/发布，但没有版本 diff、回滚和批量复核；每次改动靠人盯。", "风险：内容一多，质量和效率都会掉。", d.BLUE_SOFT, RGBColor(0x2E, 0x6F, 0x9E)),
    ]
    for i, (n, h, body, risk, tint, fg) in enumerate(cards):
        x = 0.72 + i * 4.02
        d.rect(s, x, 2.10, 3.78, 3.60, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.tx(s, n, x + 0.20, 2.28, 0.4, 0.2, size=7.5, color=fg, bold=True, font=d.SERIF)
        d.tx(s, h, x + 0.20, 2.54, 3.2, 0.26, size=12.5, bold=True)
        d.tx(s, body, x + 0.20, 3.02, 3.2, 1.15, size=8.2, color=d.INK2, line=1.55)
        d.rect(s, x + 0.20, 4.34, 3.35, 0.72, fill=tint, line=None, radius=0.10)
        d.tx(s, risk, x + 0.34, 4.47, 3.05, 0.48, size=7.3, color=fg, bold=True, line=1.35)
    d.tx(s, "已修：移动端账号入口与横向上下文；未解：诊断基线、权重校准、内容版本化。", 0.72, 6.30, 11.8, 0.24, size=8.2, color=d.CORAL_DARK, bold=True)
    d.footer(s, 15)
    s.notes_slide.notes_text_frame.text = "问题页讲三个真实问题：诊断靠自述、权重未校准、内容运营重。移动端账号入口已经修了，但另外三个没解决。"


def p16_suggestions():
    s = d.sld()
    d.bg(s, d.CREAM)
    d.kicker(s, "14 / RECOMMENDATIONS")
    d.title(s, "优化建议：先补证据，再谈智能。", size=29)
    d.subtitle(s, "每条建议都有可行性、验证指标和优先级，不是“加强 AI”。")
    cols = [
        ("诊断", "加一个客观基线", ["60 秒录音 / 5 道诊断题", "记录“自评 vs 实测”偏差", "偏差大时降低方案置信度"], "自评-实测偏差", d.MINT_SOFT, d.MINT_DARK),
        ("匹配", "30 人 A/B 校准", ["同目标随机分到两套权重", "看 7 天完成率 / 效果 / 留存", "每 30 人重算一次权重"], "7 天效果分", d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("运营", "版本 + 回滚", ["方法卡保留 diff 与发布人", "C 级卡默认不进推荐", "每 3 个月复核证据"], "回滚耗时 / C 卡占比", d.CORAL_SOFT, d.CORAL_DARK),
    ]
    for i, (tag, head, items, metric, tint, fg) in enumerate(cols):
        x = 0.72 + i * 4.02
        d.rect(s, x, 2.08, 3.78, 3.55, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.badge(s, tag, x + 0.20, 2.24, w=0.72, fill=tint, color=fg, size=7.4)
        d.tx(s, head, x + 0.20, 2.62, 3.2, 0.26, size=11.8, bold=True)
        for j, item in enumerate(items):
            d.dot(s, x + 0.24, 3.10 + j * 0.48, (d.MINT_DARK if i == 0 else (d.GOLD if i == 1 else d.CORAL)), d=0.08)
            d.tx(s, item, x + 0.42, 3.04 + j * 0.48, 3.1, 0.38, size=7.7, color=d.INK2, line=1.4)
        d.tx(s, f"验证指标：{metric}", x + 0.20, 4.78, 3.3, 0.22, size=6.8, color=fg, bold=True)
    d.rect(s, 0.72, 5.88, 11.90, 0.62, fill=d.INK, radius=0.10)
    d.tx(s, "90 天路线", 0.94, 6.04, 1.0, 0.22, size=7.6, color=d.MINT, bold=True)
    d.tx(s, "30 人测试 → 权重校准 → 版本化内容 → 教师/教练工作台", 1.95, 6.04, 10.2, 0.22, size=8.2, color=d.CREAM)
    d.tx(s, "“不承诺提分，承诺不消失；不承诺完美，承诺可验证。”", 0.72, 6.68, 11.8, 0.22, size=7.6, color=d.MUTED2)
    d.footer(s, 16)
    s.notes_slide.notes_text_frame.text = "建议三条：诊断加客观基线；匹配做 30 人 A/B 校准；内容做版本和回滚。每条都有验证指标。"


def p18_ai_risk():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "16 / AI RISK")
    d.title(s, "AI 的风险，不是答错一道题，是把错的方法说得很确定。", size=26)
    d.subtitle(s, "内容风险与依赖风险分开处理；每条风险都要有可执行的产品动作。")
    risks = [
        ("风险 A", "方法幻觉 / 过度承诺", "把 C 级经验说成 A 级证据；把“有人有效”说成“你也一定有效”。", ["证据等级直接显示，不隐藏 C", "不做提分/治愈承诺", "3 天微试验 + 失败模式"], d.CORAL_SOFT, d.CORAL_DARK),
        ("风险 B", "依赖与情绪风险", "用户把教练当唯一决策者；遇到焦虑、抑郁、医疗问题时，AI 不适合继续给方案。", ["明确“不是医疗/心理诊断”", "高风险信号转人工/专业渠道", "每次只改一个变量，保留用户决定权"], d.GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
    ]
    for i, (tag, head, body, actions, tint, fg) in enumerate(risks):
        x = 0.72 + i * 6.05
        d.rect(s, x, 2.08, 5.80, 3.85, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.badge(s, tag, x + 0.22, 2.24, w=0.70, fill=tint, color=fg, size=7.2)
        d.tx(s, head, x + 0.22, 2.62, 5.2, 0.28, size=13, bold=True)
        d.tx(s, body, x + 0.22, 3.08, 5.2, 0.75, size=8.4, color=d.INK2, line=1.55)
        for j, a in enumerate(actions):
            d.dot(s, x + 0.26, 4.00 + j * 0.40, (d.CORAL if i == 0 else d.GOLD), d=0.08)
            d.tx(s, a, x + 0.44, 3.94 + j * 0.40, 4.8, 0.24, size=7.6, color=d.MUTED)
    d.rect(s, 0.72, 6.18, 11.90, 0.48, fill=d.INK, radius=0.10)
    d.tx(s, "原则：先承认边界，再谈“记住你”；先给可验证的动作，再给解释。", 0.94, 6.31, 11.2, 0.22, size=8, color=d.MINT, bold=True)
    d.footer(s, 18)
    s.notes_slide.notes_text_frame.text = "AI 风险两条：方法幻觉/过度承诺，依赖与情绪风险。对应动作：证据分级、不承诺提分、3 天试验、转人工。"


def p19_app():
    s = d.sld()
    d.bg(s, d.CREAM)
    d.kicker(s, "17 / APPLICATION")
    d.title(s, "应用界面：从一句话，到一张今天能做的卡。", size=27)
    d.subtitle(s, "同一套账号体系：用户端做诊断/任务/反馈，管理员端处理工单/方法库。")
    d.pic(s, d.ASSETS / "v2_ui_login.png", 0.72, 2.02, 4.55, 3.15, border=True)
    d.pic(s, d.ASSETS / "v2_ui_plan_clean.png", 5.55, 2.02, 6.95, 4.55, border=True)
    d.badge(s, "登录", 0.92, 5.30, w=0.62, fill=d.MINT_SOFT, color=d.MINT_DARK, size=7)
    d.tx(s, "账号 / 会话 / 角色", 1.62, 5.30, 3.4, 0.22, size=7.2, color=d.MUTED)
    d.tx(s, "用户端：三问 → 方法 → 任务卡 → 打卡 → 总结", 5.72, 6.58, 6.8, 0.22, size=7.4, color=d.MUTED)
    d.rect(s, 0.72, 6.12, 4.55, 0.42, fill=d.INK, radius=0.10)
    d.tx(s, "管理员端：工单 → 回复 → 方法发布", 0.90, 6.22, 4.2, 0.2, size=7.2, color=d.MINT, bold=True)
    d.tx(s, f"公网：{PUBLIC_URL}", 0.72, 6.76, 11.8, 0.2, size=7.2, color=d.CORAL_DARK, bold=True)
    d.footer(s, 19)
    s.notes_slide.notes_text_frame.text = "应用界面：登录页与用户任务卡。同一套账号体系下还有管理员工单与方法库。"


def p20_prompts():
    s = d.sld()
    d.bg(s, d.PAPER)
    d.kicker(s, "18 / PROMPTS & LINK")
    d.title(s, "3 个提示词，3 种真实场景。", size=29)
    d.subtitle(s, "每个提示词都先过三问；输出不是文章，是方法 + 今日任务 + 可检查产出。")
    prompts = [
        ("🗣️ 英语口语", "“4 周后英文面试，每天 30 分钟，雅思 5.5，开口就卡。”", "影子跟读 → 语块串联", "验收：1 分钟录音 + 3 个语块脱稿", "今日：盲听 1 段 / 跟读 3 遍 / 回听标 3 个卡点", d.MINT_SOFT),
        ("📚 审计期末", "“2 周后期末，模考 58，案例题丢分最多，每天 1 小时。”", "真题逆向 → 主动回忆", "验收：10 道真题 + 错题归类", "今日：10 道真题 / 错题归类 / 主动回忆 3 个考点", d.GOLD_SOFT),
        ("💄 通勤妆", "“2 周学会 15 分钟通勤妆，底妆卡粉，眼影总画脏。”", "半脸对比 → 仿妆拆解", "验收：半脸对比照 + 1 个变量", "今日：半脸底妆 / 单眼眼影 / 同光对比照", d.CORAL_SOFT),
    ]
    for i, (head, prompt, method, output, today, tint) in enumerate(prompts):
        x = 0.72 + i * 4.02
        d.rect(s, x, 2.08, 3.78, 2.65, fill=d.CREAM, line=d.LINE, radius=0.10)
        d.rect(s, x, 2.08, 3.78, 0.12, fill=tint)
        d.tx(s, head, x + 0.20, 2.28, 3.2, 0.24, size=10.5, bold=True)
        d.tx(s, prompt, x + 0.20, 2.64, 3.35, 0.78, size=7.4, color=d.MUTED, line=1.5)
        d.tx(s, method, x + 0.20, 3.52, 3.2, 0.24, size=8.4, color=d.CORAL_DARK, bold=True)
        d.tx(s, output, x + 0.20, 3.86, 3.3, 0.24, size=7.0, color=d.INK2, bold=True)
        d.tx(s, today, x + 0.20, 4.22, 3.3, 0.36, size=6.7, color=d.MUTED, line=1.35)
    d.rect(s, 0.72, 5.02, 11.90, 1.12, fill=d.INK, radius=0.10)
    d.tx(s, "体验入口", 0.94, 5.18, 1.0, 0.22, size=7.6, color=d.MINT, bold=True)
    d.tx(s, PUBLIC_URL, 1.95, 5.14, 7.8, 0.3, size=14, color=d.CREAM, bold=True, font=d.SERIF)
    d.tx(s, "用户 demo / demo12345 · 管理员账号见提交说明", 1.95, 5.55, 7.0, 0.22, size=7.4, color=RGBColor(0xD6, 0xDF, 0xD8))
    d.tx(s, "扫码/打开链接 → 登录 → 回答三问", 9.55, 5.32, 2.8, 0.22, size=7.2, color=d.GOLD, bold=True)
    d.tx(s, "“不承诺提分，承诺不消失。”", 0.72, 6.48, 8.0, 0.26, size=9.4, color=d.MUTED)
    d.tx(s, "20 / 20", 11.55, 6.48, 1.0, 0.22, size=7.4, color=d.MUTED2, font=d.SERIF, align=PP_ALIGN.RIGHT)
    d.footer(s, 20)
    s.notes_slide.notes_text_frame.text = "最后一页：三个提示词对应三种场景，输出都是方法+任务+可检查产出；下面是公网链接和 demo 账号。"


def main():
    d.s01()
    d.s02()
    p2 = d.prs.slides[-1]
    d.tx(p2, "参考：Dunlosky et al. 2013 · Roediger & Karpicke 2006 · Bjork 2011；方法卡细节见《方法库手册》。", 0.72, 6.66, 11.8, 0.2, size=7.2, color=d.MUTED2)
    p3_sources()
    d.s14()  # p4
    set_kicker(d.prs.slides[-1], "13 / METHOD LIBRARY", "04 / KNOWLEDGE BASE")
    p5_knowledge()
    p6_pipeline()
    d.s11()  # p7
    p7 = d.prs.slides[-1]
    set_kicker(p7, "10 / MATCHING", "05 / ANALYSIS METHOD")
    replace_text(p7, "LLM 只解释，不负责打分；匹配必须可解释、可复现、可退出。", "选择依据：个体样本少、目标差异大；规则评分比端到端模型更稳、更可解释。")
    p8_trend()
    p9_mindmap()
    d.s13()  # p10
    set_kicker(d.prs.slides[-1], "12 / SWITCH", "08 / DATA EXAMPLE")
    p11_rules()
    d.s10()  # p12
    set_kicker(d.prs.slides[-1], "09 / HARD GATE", "10 / INNOVATION 1")
    d.s15()  # p13
    set_kicker(d.prs.slides[-1], "14 / CROSS-DISCIPLINARY", "11 / INNOVATION 2")
    p14_results()
    p15_problems()
    p16_suggestions()
    d.s18()  # p17
    p17 = d.prs.slides[-1]
    set_kicker(p17, "17 / SECURITY & RISK", "15 / SECURITY RISK")
    replace_text(p17, "SQLite 单机磁盘", "数据库凭证 / 备份")
    replace_text(p17, "改持久化磁盘/Postgres；做备份。", "凭证只放环境变量；定期导出备份。")
    p18_ai_risk()
    p19_app()
    p20_prompts()
    remap_sections()
    for i, s in enumerate(d.prs.slides, 1):
        renumber(s, i)
    d.prs.save(OUT)
    print(OUT, "slides", len(d.prs.slides))


if __name__ == "__main__":
    main()
