# -*- coding: utf-8 -*-
"""Append slides 6-20 to the five-slide base deck."""
import json
from pathlib import Path
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.chart.data import ChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION, XL_MARKER_STYLE

ROOT = Path(r"D:\deepseek-harness\default-workspace")
DECK_DIR = ROOT / "deliverables"
ASSETS = DECK_DIR / "assets"
DATA = json.loads((ROOT / "method-lab" / "public" / "data" / "methods.json").read_text(encoding="utf-8"))
METHODS = DATA["methods"]
DOMAIN_STATS = DATA["domainStats"]

INK = RGBColor(0x10, 0x23, 0x1E)
INK2 = RGBColor(0x18, 0x34, 0x2C)
INK3 = RGBColor(0x24, 0x47, 0x3C)
PAPER = RGBColor(0xF3, 0xEE, 0xE4)
CREAM = RGBColor(0xFF, 0xFD, 0xF8)
CORAL = RGBColor(0xFF, 0x6B, 0x4A)
CORAL_DARK = RGBColor(0xD9, 0x4E, 0x31)
CORAL_SOFT = RGBColor(0xFF, 0xE8, 0xE1)
MINT = RGBColor(0xB9, 0xF2, 0xD0)
MINT_SOFT = RGBColor(0xE7, 0xF9, 0xEE)
MINT_DARK = RGBColor(0x2B, 0x8A, 0x5B)
GOLD = RGBColor(0xF2, 0xC1, 0x5B)
GOLD_SOFT = RGBColor(0xFF, 0xF3, 0xD4)
MUTED = RGBColor(0x6F, 0x75, 0x6C)
MUTED2 = RGBColor(0x92, 0x98, 0x8F)
LINE = RGBColor(0xDE, 0xD6, 0xC7)
LINE2 = RGBColor(0xEB, 0xE4, 0xD8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK_SOFT = RGBColor(0x2A, 0x3F, 0x36)

YAHEI = "Microsoft YaHei"
SERIF = "Georgia"

BASE = ASSETS / "base5.pptx"
prs = Presentation(str(BASE))
BLANK = prs.slide_layouts[6]


# ------------------------------------------------------------------ helpers
def slide():
    return prs.slides.add_slide(BLANK)


def bg(s, color=PAPER):
    fill = s.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def tx(s, text, x, y, w, h, size=14, color=INK, bold=False, font=YAHEI,
       align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line=1.15, margin=0, italic=False):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = anchor
    for i, line_text in enumerate(str(text).split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line_text
        p.alignment = align
        p.line_spacing = line
        p.space_after = Pt(0)
        p.space_before = Pt(0)
        for r in p.runs:
            r.font.name = font
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.italic = italic
            r.font.color.rgb = color
    return box


def tx_runs(s, runs, x, y, w, h, size=14, font=YAHEI, align=PP_ALIGN.LEFT,
            anchor=MSO_ANCHOR.TOP, line=1.15, margin=0):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line
    for text, color, bold in runs:
        r = p.add_run()
        r.text = text
        r.font.name = font
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
    return box


def rect(s, x, y, w, h, fill=CREAM, line=None, line_w=0.8, radius=0.08, dash=None):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(line_w)
        if dash:
            shp.line.dash_style = dash
    shp.shadow.inherit = False
    try:
        shp.adjustments[0] = radius
    except Exception:
        pass
    return shp


def plain_rect(s, x, y, w, h, fill=CREAM, line=None, line_w=0.8):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp


def oval(s, x, y, w, h, fill=CORAL, line=None):
    shp = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.8)
    shp.shadow.inherit = False
    return shp


def line(s, x1, y1, x2, y2, color=LINE, width=1.0, dash=None):
    conn = s.shapes.add_connector(1, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    conn.line.color.rgb = color
    conn.line.width = Pt(width)
    if dash:
        conn.line.dash_style = dash
    return conn


def arrow(s, x, y, w, h, color=CORAL):
    shp = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def badge(s, text, x, y, w=None, fill=MINT_SOFT, color=MINT_DARK, size=9, bold=True):
    if w is None:
        w = max(0.65, len(text) * 0.075 + 0.28)
    rect(s, x, y, w, 0.27, fill=fill, line=None, radius=0.5)
    tx(s, text, x, y + 0.035, w, 0.2, size=size, color=color, bold=bold, align=PP_ALIGN.CENTER)


def kicker(s, text, x=0.72, y=0.43, color=CORAL_DARK):
    tx(s, text.upper(), x, y, 8.0, 0.25, size=8.5, color=color, bold=True, font=SERIF)


def title(s, text, x=0.72, y=0.72, w=10.8, size=30, color=INK):
    tx(s, text, x, y, w, 1.2, size=size, color=color, bold=True, line=1.05)


def subtitle(s, text, x=0.72, y=1.72, w=11.6, color=MUTED):
    tx(s, text, x, y, w, 0.40, size=11.5, color=color, line=1.35)


def footer(s, n, dark=False):
    c = RGBColor(0x8F, 0x96, 0x8C) if not dark else RGBColor(0x7E, 0x8B, 0x82)
    line(s, 0.72, 7.02, 12.62, 7.02, color=(RGBColor(0x2E, 0x4A, 0x3F) if dark else LINE2), width=0.7)
    tx(s, "学法实验室 · Method Lab", 0.72, 7.10, 3.5, 0.22, size=8, color=c)
    tx(s, "第二届全国人工智能应用创新大赛 · 智能体应用", 4.45, 7.10, 5.2, 0.22, size=8, color=c)
    tx(s, f"{n:02d}", 11.95, 7.08, 0.65, 0.24, size=9, color=c, font=SERIF, align=PP_ALIGN.RIGHT)


def pic_fit(s, path, x, y, w, h, border=True, label=None):
    im = Image.open(path)
    ar = im.width / im.height
    if w / h > ar:
        h2 = h
        w2 = h * ar
        x2 = x + (w - w2) / 2
        y2 = y
    else:
        w2 = w
        h2 = w / ar
        x2 = x
        y2 = y + (h - h2) / 2
    p = s.shapes.add_picture(str(path), Inches(x2), Inches(y2), Inches(w2), Inches(h2))
    if border:
        p.line.color.rgb = LINE
        p.line.width = Pt(0.8)
    if label:
        tx(s, label, x, y - 0.23, w, 0.18, size=8, color=MUTED2, bold=True, font=SERIF)
    return p


def dot(s, x, y, color=CORAL, d=0.09):
    return oval(s, x, y, d, d, fill=color)


def num_circle(s, n, x, y, d=0.42, fill=INK, color=MINT, size=11):
    oval(s, x, y, d, d, fill=fill)
    tx(s, str(n), x, y + 0.08, d, 0.24, size=size, color=color, bold=True, align=PP_ALIGN.CENTER)


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
    va.major_unit = max(1, max_value // 5)
    va.has_major_gridlines = False
    va.visible = False
    ca = chart.category_axis
    ca.tick_labels.font.name = YAHEI
    ca.tick_labels.font.size = Pt(10)
    ca.tick_labels.font.color.rgb = INK2
    ca.format.line.color.rgb = LINE
    ca.has_major_gridlines = False
    return chart


def line_chart(s, x, y, w, h, categories, series):
    cd = ChartData()
    cd.categories = categories
    for name, values in series:
        cd.add_series(name, values)
    chart = s.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS, Inches(x), Inches(y), Inches(w), Inches(h), cd).chart
    chart.has_title = False
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(9)
    chart.legend.font.name = YAHEI
    chart.legend.font.color.rgb = MUTED
    chart.font.name = YAHEI
    chart.font.size = Pt(9)
    chart.font.color.rgb = MUTED
    plot = chart.plots[0]
    plot.has_data_labels = False
    plot.gap_width = 80
    colors = [INK, CORAL]
    for i, ser in enumerate(plot.series):
        ser.smooth = False
        ser.format.line.color.rgb = colors[i % len(colors)]
        ser.format.line.width = Pt(2.2)
        ser.marker.style = XL_MARKER_STYLE.CIRCLE
        ser.marker.size = 7
        ser.marker.format.fill.solid()
        ser.marker.format.fill.fore_color.rgb = colors[i % len(colors)]
        ser.marker.format.line.color.rgb = colors[i % len(colors)]
    va = chart.value_axis
    va.minimum_scale = 0
    va.maximum_scale = 100
    va.major_unit = 20
    va.has_major_gridlines = True
    va.major_gridlines.format.line.color.rgb = LINE2
    va.major_gridlines.format.line.width = Pt(0.6)
    va.tick_labels.font.size = Pt(8)
    va.tick_labels.font.color.rgb = MUTED2
    ca = chart.category_axis
    ca.tick_labels.font.size = Pt(8)
    ca.tick_labels.font.color.rgb = MUTED
    ca.format.line.color.rgb = LINE
    return chart


# ------------------------------------------------------------------ load 6-10 from previous file
exec(compile((Path(__file__).parent / "build_deck.py").read_text(encoding="utf-8"), "build_deck.py", "exec"), globals())


# ------------------------------------------------------------------ 11 resources
def slide_11():
    s = slide()
    bg(s, CREAM)
    kicker(s, "10 / MATERIALS")
    title(s, "资料不是链接堆，是和方法绑定的三件套。", size=30)
    subtitle(s, "第二步不是「给资料」，而是给能验证方法的模板、练习和评估。")

    layers = [
        ("01", "模板", "可打印 / 可复制", "空白回忆纸、案例-规则对照表、半脸记录表、3 分钟结构卡", MINT),
        ("02", "练习", "可提交 / 可录音 / 可拍照", "1 分钟录音、10 道自测题、1 分钟独白、半脸对比", GOLD),
        ("03", "评估", "可打分 / 可对比", "成功指标、失败模式、换法条件、前后对比", CORAL),
    ]
    for i, (n, head, tag, desc, tint) in enumerate(layers):
        y = 2.20 + i * 1.12
        rect(s, 0.72, y, 5.55, 0.96, fill=CREAM, line=LINE, radius=0.10)
        oval(s, 0.92, y + 0.20, 0.44, 0.44, fill=tint)
        tx(s, n, 0.92, y + 0.30, 0.44, 0.2, size=8, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, head, 1.52, y + 0.14, 0.9, 0.28, size=12.5, bold=True)
        tx(s, tag, 2.42, y + 0.17, 1.6, 0.22, size=8, color=MUTED2)
        tx(s, desc, 1.52, y + 0.52, 4.45, 0.3, size=8.2, color=MUTED, line=1.35)

    # four domain examples
    examples = [
        ("🗣️", "英语口语", "1 分钟录音 + 3 点回听表", "产出：录音 + 3 个卡点", RGBColor(0xDB, 0xEA, 0xF8)),
        ("📚", "审计 / 专业课", "案例-准则对照表 + 10 道回忆题", "产出：判断 + 依据", MINT_SOFT),
        ("🎤", "口头表达", "3-2-1 题卡 + 录像回看表", "产出：2 分钟录像 + 1 条改进", CORAL_SOFT),
        ("💄", "审美 / 化妆", "半脸记录 + 三光检查表", "产出：对比图 + 1 个差异", GOLD_SOFT),
    ]
    for i, (emoji, head, body, out, tint) in enumerate(examples):
        row, col = divmod(i, 2)
        x = 6.62 + col * 3.02
        y = 2.20 + row * 1.82
        rect(s, x, y, 2.85, 1.62, fill=CREAM, line=LINE, radius=0.10)
        oval(s, x + 0.16, y + 0.14, 0.38, 0.38, fill=tint)
        tx(s, emoji, x + 0.16, y + 0.20, 0.38, 0.25, size=11, align=PP_ALIGN.CENTER)
        tx(s, head, x + 0.62, y + 0.14, 2.0, 0.24, size=10.2, bold=True)
        tx(s, body, x + 0.16, y + 0.60, 2.5, 0.42, size=8.0, color=INK2, line=1.45)
        tx(s, out, x + 0.16, y + 1.18, 2.5, 0.22, size=7.2, color=MUTED2)

    rect(s, 0.72, 5.78, 11.90, 0.72, fill=INK, line=None, radius=0.10)
    tx(s, "版权边界", 0.96, 5.96, 0.9, 0.22, size=8.5, color=MINT, bold=True)
    tx(s, "原创模板 + 开放资源 + 来源标注；不搬运付费课程，不复制个人 IP。", 1.95, 5.96, 10.2, 0.22, size=9.2, color=CREAM)
    tx(s, "“资料的价值，不在于多，而在于能让你今天晚上交出一个可检查的产出。”", 0.72, 6.72, 11.8, 0.24, size=8.5, color=MUTED2, italic=True)
    footer(s, 11)
    s.notes_slide.notes_text_frame.text = "第二步资料要和第一步方法绑定：模板、练习、评估。四个领域各给一个具体例子，证明跨学科不是口号。"


# ------------------------------------------------------------------ 12 cross-disciplinary
def slide_12():
    s = slide()
    bg(s, PAPER)
    kicker(s, "11 / CROSS-DISCIPLINARY")
    title(s, "跨学科不是科目堆叠，是复用同一种学习机制。", size=29)
    subtitle(s, "把「记忆 / 理解 / 解题 / 输出 / 实操 / 审美 / 元认知」作为能力坐标，换领域只换素材和评分标准。")

    cols = ["考试", "英语口语", "口头表达", "专业课", "编程/理工", "写作", "审美/化妆"]
    rows = ["记忆", "理解", "解题", "输出", "实操", "审美", "元认知"]
    matrix = [
        [3, 2, 1, 3, 1, 1, 0],
        [2, 1, 2, 3, 3, 2, 1],
        [3, 0, 0, 3, 2, 1, 0],
        [0, 3, 3, 1, 1, 2, 1],
        [0, 1, 1, 1, 3, 1, 3],
        [0, 0, 2, 0, 0, 1, 3],
        [2, 2, 2, 2, 2, 2, 1],
    ]
    cell_w, cell_h = 0.90, 0.42
    ox, oy = 1.62, 2.48
    for j, c in enumerate(cols):
        tx(s, c, ox + j * cell_w - 0.10, oy - 0.32, cell_w + 0.2, 0.22, size=7.2, color=MUTED, align=PP_ALIGN.CENTER)
    colors = {3: MINT, 2: GOLD_SOFT, 1: RGBColor(0xF1, 0xEC, 0xE1), 0: RGBColor(0xFA, 0xF7, 0xF0)}
    for i, r in enumerate(rows):
        tx(s, r, 0.72, oy + i * cell_h + 0.12, 0.8, 0.22, size=8.2, color=INK2, bold=True)
        for j in range(len(cols)):
            v = matrix[i][j]
            rect(s, ox + j * cell_w, oy + i * cell_h, cell_w - 0.05, cell_h - 0.06, fill=colors[v], line=None, radius=0.18)
            if v == 3:
                dot(s, ox + j * cell_w + cell_w / 2 - 0.09, oy + i * cell_h + cell_h / 2 - 0.10, MINT_DARK, d=0.14)
            elif v == 2:
                dot(s, ox + j * cell_w + cell_w / 2 - 0.07, oy + i * cell_h + cell_h / 2 - 0.08, GOLD, d=0.10)
            elif v == 1:
                dot(s, ox + j * cell_w + cell_w / 2 - 0.045, oy + i * cell_h + cell_h / 2 - 0.06, RGBColor(0xC9, 0xBE, 0xAD), d=0.06)

    # legend
    for i, (label, color) in enumerate([("强", MINT_DARK), ("中", GOLD), ("弱", RGBColor(0xC9, 0xBE, 0xAD))]):
        dot(s, 0.74 + i * 0.86, 6.02, color, d=0.11)
        tx(s, label, 0.89 + i * 0.86, 5.98, 0.5, 0.2, size=7.5, color=MUTED)

    # transfer cards
    transfers = [
        ("影子跟读", "→", "演讲节奏", "同步模仿 → 停顿/语速控制"),
        ("半脸对比", "→", "实验对照", "控制变量 → 同光/单手改一个变量"),
        ("错题尸检", "→", "调试日志", "错误分类 → 根因/复现条件"),
    ]
    for i, (a, arr, b, note) in enumerate(transfers):
        y = 2.18 + i * 1.18
        rect(s, 8.34, y, 4.24, 0.98, fill=CREAM, line=LINE, radius=0.10)
        tx(s, a, 8.52, y + 0.14, 1.25, 0.24, size=10.5, color=INK, bold=True)
        tx(s, arr, 9.78, y + 0.14, 0.28, 0.24, size=12, color=CORAL, bold=True)
        tx(s, b, 10.08, y + 0.14, 1.25, 0.24, size=10.5, color=INK, bold=True)
        tx(s, note, 8.52, y + 0.53, 3.8, 0.22, size=7.5, color=MUTED)

    tx(s, "同一套能力 taxonomy，换领域只换素材和评分标准。", 8.34, 5.78, 4.2, 0.3, size=9, color=CORAL_DARK, bold=True)
    footer(s, 12)
    s.notes_slide.notes_text_frame.text = "跨学科视角是比赛的加分项：不是把语文数学英语换成化妆，而是说明这些领域共享记忆、输出、实操、审美等学习机制。"


# ------------------------------------------------------------------ 13 architecture
def slide_13():
    s = slide()
    bg(s, CREAM)
    kicker(s, "12 / ARCHITECTURE")
    title(s, "规则引擎保底，LLM 增强表达。", size=30)
    subtitle(s, "门槛、匹配、换法由确定性状态机保证；语言表达可以交给模型，但不能交给模型自觉。")

    # main flow boxes
    boxes = [
        ("用户", "目标 / 反馈", 0.82, 2.18, MINT_SOFT),
        ("Web UI", "对话 / 任务卡 / 记忆", 2.52, 2.18, CREAM),
        ("三问状态机", "未完成 → 拒绝", 4.52, 2.18, CORAL_SOFT),
        ("诊断 + 匹配", "4 层打分", 6.52, 2.18, CREAM),
        ("今日任务", "3 件事", 8.52, 2.18, GOLD_SOFT),
        ("反馈", "完成 / 难度 / 自测", 10.52, 2.18, MINT_SOFT),
    ]
    for i, (head, sub, x, y, tint) in enumerate(boxes):
        rect(s, x, y, 1.72, 1.05, fill=tint, line=LINE, radius=0.10)
        tx(s, head, x + 0.12, y + 0.16, 1.5, 0.26, size=10.2, bold=True)
        tx(s, sub, x + 0.12, y + 0.55, 1.5, 0.3, size=7.3, color=MUTED)
        if i < len(boxes) - 1:
            arrow(s, x + 1.74, y + 0.42, 0.20, 0.16, color=CORAL)

    # loop
    line(s, 11.38, 3.38, 11.38, 3.88, color=CORAL, width=1.4)
    line(s, 3.36, 3.88, 11.38, 3.88, color=CORAL, width=1.4)
    line(s, 3.36, 3.88, 3.36, 3.32, color=CORAL, width=1.4)
    tx(s, "反馈写入记忆 → 下一次判断", 6.20, 3.96, 3.6, 0.24, size=8.2, color=CORAL_DARK, bold=True)

    # memory band
    rect(s, 0.82, 4.30, 7.45, 0.72, fill=INK, line=None, radius=0.10)
    tx(s, "记忆层", 1.04, 4.48, 0.75, 0.22, size=8, color=MINT, bold=True)
    for i, name in enumerate(["profile", "trial", "daily_log", "insight"]):
        tx(s, name, 1.95 + i * 1.48, 4.46, 1.2, 0.24, size=8.8, color=CREAM, bold=True, font=SERIF)

    # side panel
    rect(s, 8.62, 4.30, 3.95, 1.18, fill=PAPER, line=LINE, radius=0.10)
    tx(s, "可选增强", 8.82, 4.44, 1.2, 0.22, size=8, color=MUTED2, bold=True, font=SERIF)
    tx(s, "LLM adapter", 8.82, 4.66, 1.8, 0.28, size=11, bold=True)
    tx(s, "DeepSeek / OpenAI-compatible\n只接收结构化上下文，只返回语言解释", 8.82, 4.98, 3.4, 0.40, size=7.0, color=MUTED, line=1.3)

    # bottom chips
    chips = [
        ("零依赖前端", "原生 JS + CSS，打开即用"),
        ("Node 轻服务", "静态 + /api/coach"),
        ("可静态部署", "Netlify / Render / 本地"),
    ]
    for i, (h, sub) in enumerate(chips):
        x = 0.82 + i * 4.02
        rect(s, x, 5.60, 3.78, 0.70, fill=CREAM, line=LINE, radius=0.10)
        tx(s, h, x + 0.16, 5.72, 1.2, 0.24, size=9.5, bold=True)
        tx(s, sub, x + 1.35, 5.74, 2.2, 0.22, size=7.5, color=MUTED)

    tx(s, "为什么不是纯 Prompt：三问门槛、记忆、换法必须是确定性状态，不能靠模型「记得」。", 0.82, 6.48, 11.8, 0.24, size=8.5, color=CORAL_DARK, bold=True)
    footer(s, 13)
    s.notes_slide.notes_text_frame.text = "架构页回答两个问题：怎么保证不乱说？怎么接大模型？答案是规则引擎做边界，LLM 做表达。部署成本低，评审容易打开。"


# ------------------------------------------------------------------ 14 data sources
def slide_14():
    s = slide()
    bg(s, PAPER)
    kicker(s, "13 / DATA & PIPELINE")
    title(s, "数据不是越多越好，而是能被追溯和分级。", size=30)
    subtitle(s, "三类来源、七个预处理步骤、三级证据；每张卡都能回答「凭什么」。")

    sources = [
        ("01", "学习科学文献", "Dunlosky 2013 · Roediger & Karpicke 2006\nCepeda 2006 · Ericsson 1993 · Bjork 2011", "用于证据分级与边界", MINT_SOFT),
        ("02", "专业训练体系", "Cambridge English · Toastmasters\nCPA/ACCA 案例 · 临床推理 · 专业化妆训练", "用于领域步骤与评分", GOLD_SOFT),
        ("03", "公开方法内容", "书籍 / 公开演讲 / B站 / 知乎 / 播客\n只提炼结构，不复制个人表达", "用于方法原型与场景", CORAL_SOFT),
    ]
    for i, (n, head, body, use, tint) in enumerate(sources):
        y = 2.20 + i * 1.50
        rect(s, 0.72, y, 5.78, 1.16, fill=CREAM, line=LINE, radius=0.10)
        oval(s, 0.92, y + 0.18, 0.40, 0.40, fill=tint)
        tx(s, n, 0.92, y + 0.27, 0.40, 0.2, size=7.5, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, head, 1.48, y + 0.12, 2.0, 0.24, size=10.5, bold=True)
        tx(s, body, 1.48, y + 0.46, 4.15, 0.48, size=7.3, color=INK2, line=1.35)
        tx(s, use, 1.48, y + 0.92, 4.2, 0.18, size=7.0, color=MUTED2)

    # pipeline
    tx(s, "PREPROCESS", 6.90, 2.02, 2.4, 0.22, size=8, color=CORAL_DARK, bold=True, font=SERIF)
    steps = ["采集", "去重", "结构化", "证据分级", "边界标注", "人工复核", "版本管理"]
    for i, st in enumerate(steps):
        y = 2.36 + i * 0.58
        rect(s, 6.90, y, 2.35, 0.42, fill=(CREAM if i % 2 == 0 else MINT_SOFT), line=LINE, radius=0.12)
        tx(s, st, 7.02, y + 0.10, 1.9, 0.22, size=8.2, color=INK2, bold=True)
        if i < len(steps) - 1:
            line(s, 8.07, y + 0.42, 8.07, y + 0.57, color=CORAL, width=1.0)

    # quality panel
    rect(s, 9.60, 2.36, 3.0, 3.74, fill=INK, line=None, radius=0.10)
    tx(s, "QUALITY", 9.82, 2.54, 1.4, 0.22, size=8, color=MINT, bold=True, font=SERIF)
    stats = [("43", "方法卡"), ("9", "领域"), ("129+", "资料模板"), ("3", "证据等级")]
    for i, (n, label) in enumerate(stats):
        y = 2.86 + i * 0.72
        tx(s, n, 9.82, y, 0.8, 0.32, size=18, color=CREAM, bold=True, font=SERIF)
        tx(s, label, 10.68, y + 0.06, 1.2, 0.24, size=8.2, color=RGBColor(0xD6, 0xDF, 0xD8))
    tx(s, "复核周期：3 个月\n来源变更可追溯", 9.82, 5.72, 2.5, 0.3, size=7.0, color=RGBColor(0xBF, 0xCB, 0xC3), line=1.4)

    tx(s, "证据分级：A 多项实验/元分析 · B 单项研究/专业共识 · C 实践者经验，需微试验验证。", 0.72, 6.44, 11.8, 0.24, size=8.2, color=MUTED2)
    footer(s, 14)
    s.notes_slide.notes_text_frame.text = "数据来源要讲权威性和时效性。三类来源分别解决证据、领域步骤、场景原型。预处理流程强调人工复核和边界标注。"


# ------------------------------------------------------------------ 15 analysis
def slide_15():
    s = slide()
    bg(s, CREAM)
    kicker(s, "14 / ANALYSIS")
    title(s, "从 43 张卡到 4 个匹配维度。", size=30)
    subtitle(s, "分析不是展示数据，而是把数据变成可解释、可复现的规则。")

    # domain bar
    rect(s, 0.72, 2.20, 6.35, 3.86, fill=CREAM, line=LINE, radius=0.10)
    tx(s, "方法库结构 · 领域分布（可多选）", 0.96, 2.36, 3.6, 0.24, size=9.2, bold=True)
    cats = ["时间管理", "审美/化妆", "写作", "编程/理工", "英语口语", "口头表达", "考试", "专业课", "通用"]
    vals = [5, 7, 6, 8, 11, 12, 15, 19, 15]
    bar_chart(s, 0.94, 2.64, 5.90, 3.30, cats, vals, color=INK, max_value=20)

    # rule table
    tx(s, "数据 → 规则 → 设计", 7.40, 2.04, 2.8, 0.24, size=9.2, bold=True)
    rules = [
        ("时间成本 > 预算", "降权", "推荐更短的方法，或拆成 2 次"),
        ("截止 ≤ 21 天", "加权考试策略", "真题逆向 / 限时模考优先"),
        ("起步 + 难度 ≥ 4", "降权", "先给低门槛、反馈快的方法"),
        ("历史失败", "排除", "不重复推荐，换路径"),
    ]
    for i, (a, b, c) in enumerate(rules):
        y = 2.42 + i * 0.86
        rect(s, 7.40, y, 5.22, 0.72, fill=CREAM, line=LINE, radius=0.10)
        tx(s, a, 7.56, y + 0.10, 1.85, 0.22, size=7.8, color=INK2, bold=True)
        tx(s, b, 9.42, y + 0.10, 1.0, 0.22, size=7.5, color=CORAL_DARK, bold=True)
        tx(s, c, 10.44, y + 0.10, 2.0, 0.22, size=7.0, color=MUTED)

    tx(s, "示例：同样是「2 周期末」，有真题的人优先真题逆向；没有真题的人先做概念图 + 主动回忆。", 7.40, 6.02, 5.2, 0.5, size=8.2, color=MUTED, line=1.45)
    tx(s, "规则不是拍脑袋，是把「用户约束」翻译成「权重 / 排除 / 优先级」。", 0.72, 6.30, 11.8, 0.24, size=8.8, color=MUTED2)
    footer(s, 15)
    s.notes_slide.notes_text_frame.text = "分析页把方法库统计和匹配规则连起来：领域分布说明覆盖，四条规则说明如何从数据到决策。"


# ------------------------------------------------------------------ 16 case
def slide_16():
    s = slide()
    bg(s, PAPER)
    kicker(s, "15 / 7-DAY CASE")
    title(s, "第 3 天换法后，效果分从 52 到 80。", size=30)
    subtitle(s, "这不是「方法越换越好」的证明，而是一次控制变量的调试记录。")

    rect(s, 0.72, 2.20, 7.55, 4.00, fill=CREAM, line=LINE, radius=0.10)
    tx(s, "演示案例 · 6 次反馈（原型内置模拟数据）", 0.96, 2.36, 4.6, 0.24, size=8.5, color=MUTED2, bold=True)
    line_chart(s, 0.86, 2.62, 7.20, 3.42, ["10/20", "10/21", "10/22", "10/23", "10/24", "10/25"], [
        ("完成率", [60, 65, 55, 85, 88, 92]),
        ("效果分", [52, 55, 48, 68, 74, 80]),
    ])
    # annotation
    badge(s, "第 3 天：换法", 5.58, 2.32, w=1.35, fill=CORAL, color=WHITE, size=7.5)

    # stats
    stats = [
        ("完成率", "60% → 88%", "任务拆分 + 语块更可执行"),
        ("效果分", "52 → 80", "自测从「说不清」到「能说完整」"),
        ("单次投入", "30 → 28 min", "去掉无效的逐句跟读"),
        ("方法", "影子跟读 → 语块串联", "3 天微试验触发换法"),
    ]
    for i, (k, v, note) in enumerate(stats):
        y = 2.02 + i * 1.02
        rect(s, 8.55, y, 4.08, 0.86, fill=CREAM, line=LINE, radius=0.10)
        tx(s, k, 8.72, y + 0.12, 0.9, 0.22, size=8, color=MUTED2, bold=True)
        tx(s, v, 9.55, y + 0.10, 2.8, 0.28, size=11.5, color=INK, bold=True)
        tx(s, note, 9.55, y + 0.46, 2.8, 0.22, size=7.2, color=MUTED)

    tx(s, "注意：这是原型内置演示数据，用于验证流程，不作为效果承诺；下一步做 30 人可用性测试，预注册指标。", 0.72, 6.42, 11.8, 0.24, size=8.0, color=CORAL_DARK, bold=True)
    tx(s, "提升来自任务拆分 + 方法更换 + 反馈闭环，不能只归因于「换了一个更厉害的方法」。", 0.72, 6.70, 11.8, 0.22, size=8.0, color=MUTED2)
    footer(s, 16)
    s.notes_slide.notes_text_frame.text = "案例页要诚实：这是模拟数据。重点讲分析严谨性——提升可能来自任务拆分，不能只归因于方法。这种自我怀疑会加分。"


# ------------------------------------------------------------------ 17 innovation
def slide_17():
    s = slide()
    bg(s, INK)
    oval(s, 10.8, -1.4, 4.0, 4.0, fill=RGBColor(0x18, 0x3A, 0x30))
    kicker(s, "16 / INNOVATION", color=MINT)
    title(s, "三个创新，不是三个功能。", size=32, color=CREAM)
    tx(s, "创新点不在「又做了一个聊天机器人」，而在把学习方法的推荐变成可验证、可退出、可记忆的闭环。", 0.72, 1.72, 11.3, 0.45, size=11, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.5)

    cards = [
        ("01", "方法试衣间", "推荐不是终点，是 3 天微试验。", [
            "每个方法都有成功指标与失败模式",
            "不达标就换，不把「坚持」当美德",
            "用户可主动选方法，系统负责解释代价",
        ], MINT),
        ("02", "三问硬门槛", "把负责写进状态机，而不是提示词。", [
            "未答完 3 问，不进入匹配",
            "模型无权跳过边界",
            "起点可验证，方案才可解释",
        ], GOLD),
        ("03", "记忆驱动换法", "反馈成为下一次决策的变量。", [
            "完成率 / 难度 / 自测 / 状态四信号",
            "换法留下原因，避免情绪化",
            "次日内容自动排好",
        ], CORAL),
    ]
    for i, (n, head, sub, bullets, accent) in enumerate(cards):
        x = 0.72 + i * 4.02
        rect(s, x, 2.42, 3.78, 3.55, fill=CREAM, line=None, radius=0.10)
        tx(s, n, x + 0.22, 2.62, 0.6, 0.3, size=9, color=accent, bold=True, font=SERIF)
        tx(s, head, x + 0.22, 2.96, 3.3, 0.34, size=17, bold=True)
        tx(s, sub, x + 0.22, 3.40, 3.25, 0.5, size=9.5, color=MUTED, line=1.45)
        for j, b in enumerate(bullets):
            dot(s, x + 0.24, 4.12 + j * 0.44, accent, d=0.08)
            tx(s, b, x + 0.42, 4.06 + j * 0.44, 3.0, 0.3, size=8.5, color=INK2, line=1.4)

    rect(s, 0.72, 6.28, 11.90, 0.48, fill=RGBColor(0x1D, 0x3B, 0x31), line=None, radius=0.10)
    tx(s, "不是又一个套壳 ChatGPT：确定性边界 + 结构化方法资产 + 可测量闭环。", 0.94, 6.40, 11.2, 0.22, size=10, color=MINT, bold=True)
    footer(s, 17, dark=True)
    s.notes_slide.notes_text_frame.text = "创新点不要讲成功能列表。三个创新分别对应：方法试衣间（产品形态）、三问硬门槛（可信边界）、记忆驱动换法（长期价值）。"


# ------------------------------------------------------------------ 18 risks
def slide_18():
    s = slide()
    bg(s, CREAM)
    kicker(s, "17 / RISKS & NEXT")
    title(s, "先承认边界，再谈价值。", size=31)
    subtitle(s, "教育产品最大的风险不是「不够智能」，而是「说得很确定，却做错了」。")

    # risk matrix
    tx(s, "风险矩阵", 0.74, 2.18, 2.0, 0.24, size=9, color=MUTED2, bold=True, font=SERIF)
    mx, my, mw, mh = 1.28, 2.42, 4.55, 3.55
    rect(s, mx, my, mw, mh, fill=CREAM, line=LINE, radius=0.02)
    line(s, mx + mw / 2, my, mx + mw / 2, my + mh, color=LINE, width=0.8)
    line(s, mx, my + mh / 2, mx + mw, my + mh / 2, color=LINE, width=0.8)
    tx(s, "影响高", mx - 0.58, my + 0.1, 0.5, 0.2, size=7, color=MUTED2, align=PP_ALIGN.RIGHT)
    tx(s, "影响低", mx - 0.58, my + mh - 0.3, 0.5, 0.2, size=7, color=MUTED2, align=PP_ALIGN.RIGHT)
    tx(s, "概率低", mx + 0.06, my + mh + 0.08, 0.6, 0.2, size=7, color=MUTED2)
    tx(s, "概率高", mx + mw - 0.6, my + mh + 0.08, 0.6, 0.2, size=7, color=MUTED2)
    risks = [
        ("错误建议 / 过度依赖", 1.46, 2.56, CORAL_SOFT, CORAL_DARK),
        ("隐私与记忆", 3.42, 3.00, GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("内容版权", 1.46, 4.48, MINT_SOFT, MINT_DARK),
        ("LLM 幻觉", 3.42, 4.70, CORAL_SOFT, CORAL_DARK),
    ]
    for text, x, y, fill, fg in risks:
        rect(s, x, y, 1.65, 0.42, fill=fill, line=None, radius=0.15)
        tx(s, text, x + 0.06, y + 0.11, 1.55, 0.2, size=6.8, color=fg, bold=True, align=PP_ALIGN.CENTER)

    # mitigations
    tx(s, "应对策略", 7.05, 2.02, 2.0, 0.24, size=9, color=MUTED2, bold=True, font=SERIF)
    items = [
        ("证据分级 + 人工复核 + 明确转介", "不把 C 级经验说成 A 级证据；遇到心理/医疗问题转介。"),
        ("本地优先 + 最小化 + 可删除", "不训练用户数据；导出/删除入口可见。"),
        ("原创模板 + 开放资源 + 来源标注", "不搬运付费课程；引用可追溯。"),
        ("结构化输出 + 规则校验 + 引用", "LLM 不直接决定门槛、匹配和换法。"),
    ]
    for i, (h, d) in enumerate(items):
        y = 2.36 + i * 0.92
        rect(s, 7.05, y, 5.58, 0.78, fill=CREAM, line=LINE, radius=0.10)
        num_circle(s, f"0{i+1}", 7.22, y + 0.18, d=0.34, fill=MINT_SOFT, color=INK, size=7)
        tx(s, h, 7.68, y + 0.10, 3.9, 0.24, size=9.2, bold=True)
        tx(s, d, 7.68, y + 0.40, 4.7, 0.22, size=7.2, color=MUTED)

    # bottom suggestions
    rect(s, 0.72, 6.35, 11.90, 0.55, fill=INK, line=None, radius=0.10)
    tx(s, "优化建议：30 人可用性测试 · 学科专家审阅 · 学校/企业 API · 预注册效果指标", 0.94, 6.48, 11.2, 0.22, size=8.8, color=MINT, bold=True)
    footer(s, 18)
    s.notes_slide.notes_text_frame.text = "风险页不要念清单，讲两个最关键的：错误建议和隐私。然后给可执行应对。最后用一句「不承诺提分，承诺不消失」收束。"


# ------------------------------------------------------------------ 19 UI + prompts
def slide_19():
    s = slide()
    bg(s, PAPER)
    kicker(s, "18 / DEMO")
    title(s, "三种场景，同一个闭环。", size=31)
    subtitle(s, "界面是原型实录；三个提示词分别覆盖英语口语、审计期末、通勤妆。")

    pic_fit(s, ASSETS / "ui_plan.png", 0.72, 2.20, 3.35, 3.80, border=True)
    pic_fit(s, ASSETS / "ui_gate.png", 4.30, 2.20, 1.85, 1.85, border=True)
    pic_fit(s, ASSETS / "ui_memory.png", 4.30, 4.18, 1.85, 1.65, border=True)

    prompts = [
        ("🗣️", "英语口语", "4 周后英文面试，每天 30 分钟，雅思 5.5，开口就卡。", "影子跟读 → 语块串联", "1 分钟录音 + 3 个卡点"),
        ("📚", "审计期末", "2 周后期末，模考 58，案例题丢分最多，每天 1 小时。", "真题逆向 → 主动回忆", "错题分类 + 10 道自测"),
        ("💄", "通勤妆", "2 周学会 15 分钟通勤妆，底妆卡粉，眼影总画脏。", "半脸对比 → 仿妆拆解", "同光对比 + 1 个差异"),
    ]
    for i, (emoji, head, prompt, method, output) in enumerate(prompts):
        y = 2.20 + i * 1.36
        rect(s, 6.88, y, 5.72, 1.18, fill=CREAM, line=LINE, radius=0.10)
        tx(s, emoji, 7.06, y + 0.14, 0.35, 0.28, size=14)
        tx(s, head, 7.42, y + 0.12, 0.9, 0.24, size=9.5, bold=True)
        tx(s, f"“{prompt}”", 8.28, y + 0.12, 4.05, 0.38, size=7.2, color=MUTED, line=1.35)
        tx(s, method, 7.42, y + 0.68, 1.9, 0.22, size=7.5, color=CORAL_DARK, bold=True)
        tx(s, output, 9.36, y + 0.68, 2.9, 0.22, size=7.2, color=MUTED2)

    # link box
    rect(s, 0.72, 6.14, 11.90, 0.62, fill=INK, line=None, radius=0.10)
    tx(s, "智能体体验入口", 0.94, 6.30, 1.8, 0.22, size=8.2, color=MINT, bold=True)
    tx(s, "提交前替换为公网链接  /  demo 账号：体验用户（无需密码）", 2.75, 6.30, 7.4, 0.22, size=8.2, color=CREAM)
    rect(s, 11.48, 6.19, 0.50, 0.50, fill=CREAM, line=None, radius=0.10)
    tx(s, "→", 11.48, 6.24, 0.50, 0.3, size=15, color=INK, bold=True, align=PP_ALIGN.CENTER)

    footer(s, 19)
    s.notes_slide.notes_text_frame.text = "这页是作品呈现：三张真实界面 + 三个提示词。注意：正式提交前必须把链接和二维码替换成公网入口。"


# ------------------------------------------------------------------ 20 closing
def slide_20():
    s = slide()
    bg(s, INK)
    oval(s, -2.0, -2.2, 6.0, 6.0, fill=RGBColor(0x18, 0x3A, 0x30))
    oval(s, 11.0, 4.2, 4.0, 4.0, fill=RGBColor(0x22, 0x3C, 0x33))
    kicker(s, "19 / WHAT'S NEXT", color=MINT)
    tx(s, "让每个用户，\n都有一个懂自己的学习教练。", 0.78, 1.35, 10.4, 1.8, size=40, color=CREAM, bold=True, line=1.2)
    tx(s, "不是给一个更厉害的方法，而是让方法在用户的真实生活里，被验证、被调整、被留下。", 0.82, 3.35, 9.2, 0.5, size=12, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.6)

    roadmap = [
        ("现在", "已验证", ["43 张方法卡 / 9 领域", "4 个演示场景", "三问硬门槛 / 换法 / 记忆", "本地可运行原型"], MINT),
        ("3 个月", "做深", ["300+ 方法卡 / 10 领域", "30 人可用性测试", "教师/教练工作台", "内容审核与版本管理"], GOLD),
        ("6 个月", "规模化", ["学校 / 企业 API", "效果追踪与对照研究", "多模态资料（录音/视频）", "开放方法创作者生态"], CORAL),
    ]
    for i, (period, tag, bullets, accent) in enumerate(roadmap):
        x = 0.78 + i * 4.02
        rect(s, x, 4.22, 3.75, 2.28, fill=RGBColor(0x1B, 0x35, 0x2C), line=RGBColor(0x35, 0x51, 0x44), radius=0.10)
        tx(s, period, x + 0.20, 4.40, 1.1, 0.3, size=13, color=accent, bold=True, font=SERIF)
        tx(s, tag, x + 1.26, 4.44, 0.9, 0.22, size=7.5, color=RGBColor(0xBF, 0xCB, 0xC3))
        for j, b in enumerate(bullets):
            tx(s, f"· {b}", x + 0.20, 4.86 + j * 0.36, 3.3, 0.28, size=7.8, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.35)

    line(s, 0.78, 6.72, 12.55, 6.72, color=RGBColor(0x3A, 0x55, 0x49), width=0.8)
    tx(s, "不承诺提分，承诺不消失。", 0.78, 6.84, 5.0, 0.28, size=11, color=MINT, bold=True)
    tx(s, "2026.10", 7.70, 6.86, 4.8, 0.24, size=8, color=RGBColor(0x7E, 0x8B, 0x82), font=SERIF, align=PP_ALIGN.RIGHT)
    footer(s, 20, dark=True)
    s.notes_slide.notes_text_frame.text = "结尾只留一句话：不承诺提分，承诺不消失。路线图说明从原型到规模化的路径，不要过度承诺。"


# ------------------------------------------------------------------ build
def main():
    slide_06()
    slide_07()
    slide_08()
    slide_09()
    slide_10()
    slide_11()
    slide_12()
    slide_13()
    slide_14()
    slide_15()
    slide_16()
    slide_17()
    slide_18()
    slide_19()
    slide_20()
    out = DECK_DIR / "学法实验室-参赛PPT.pptx"
    prs.save(out)
    print(out, "slides:", len(prs.slides))


if __name__ == "__main__":
    main()
