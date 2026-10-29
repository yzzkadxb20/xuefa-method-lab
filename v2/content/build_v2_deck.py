# -*- coding: utf-8 -*-
"""Build 学法实验室 v2 competition deck (20 slides)."""
from pathlib import Path
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION

ROOT = Path(r"D:\deepseek-harness\default-workspace")
DECK_DIR = ROOT / "deliverables-v2"
ASSETS = ROOT / "method-lab-pro" / "content" / "assets"
DECK_DIR.mkdir(parents=True, exist_ok=True)

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
BLUE_SOFT = RGBColor(0xDB, 0xEA, 0xF8)

YAHEI = "Microsoft YaHei"
SERIF = "Georgia"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def sld():
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


def txr(s, runs, x, y, w, h, size=14, font=YAHEI, align=PP_ALIGN.LEFT,
        anchor=MSO_ANCHOR.TOP, line=1.15):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
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


def rect(s, x, y, w, h, fill=CREAM, line=None, lw=0.8, radius=0.08, dash=None):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(lw)
        if dash:
            shp.line.dash_style = dash
    shp.shadow.inherit = False
    try:
        shp.adjustments[0] = radius
    except Exception:
        pass
    return shp


def plain_rect(s, x, y, w, h, fill=CREAM, line=None, lw=0.8):
    shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(lw)
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
    tx(s, text.upper(), x, y, 8, 0.25, size=8.5, color=color, bold=True, font=SERIF)


def title(s, text, x=0.72, y=0.72, w=11.3, size=30, color=INK):
    tx(s, text, x, y, w, 1.2, size=size, color=color, bold=True, line=1.05)


def subtitle(s, text, x=0.72, y=1.72, w=11.6, color=MUTED):
    tx(s, text, x, y, w, 0.4, size=11.5, color=color, line=1.35)


def footer(s, n, dark=False):
    c = RGBColor(0x8F, 0x96, 0x8C) if not dark else RGBColor(0x7E, 0x8B, 0x82)
    line(s, 0.72, 7.02, 12.62, 7.02, color=(RGBColor(0x2E, 0x4A, 0x3F) if dark else LINE2), width=0.7)
    tx(s, "学法实验室 v2 · Method Lab", 0.72, 7.10, 3.5, 0.22, size=8, color=c)
    tx(s, "第二届全国人工智能应用创新大赛 · 智能体应用", 4.45, 7.10, 5.2, 0.22, size=8, color=c)
    tx(s, f"{n:02d}", 11.95, 7.08, 0.65, 0.24, size=9, color=c, font=SERIF, align=PP_ALIGN.RIGHT)


def pic(s, path, x, y, w, h, border=True, label=None):
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


def num_circle(s, n, x, y, d=0.42, fill=INK, color=MINT, size=10):
    oval(s, x, y, d, d, fill=fill)
    tx(s, str(n), x, y + 0.08, d, 0.24, size=size, color=color, bold=True, align=PP_ALIGN.CENTER)


def bar(s, x, y, w, h, value, color=CORAL, label="", max_value=100):
    rect(s, x, y, w, h, fill=RGBColor(0xF1, 0xEC, 0xE1), line=None, radius=0.2)
    rect(s, x, y, max(0.1, w * value / max_value), h, fill=color, line=None, radius=0.2)
    if label:
        tx(s, label, x + w + 0.08, y - 0.02, 0.8, 0.22, size=9, color=INK, bold=True)


# ------------------------------------------------------------------ 01 cover
def s01():
    s = sld()
    bg(s, INK)
    oval(s, 9.6, -1.8, 6.2, 6.2, fill=RGBColor(0x18, 0x3A, 0x30))
    oval(s, 11.0, 4.1, 3.8, 3.8, fill=RGBColor(0x22, 0x3C, 0x33))
    badge(s, "AI 学习教练 · v2 全栈版", 0.78, 0.62, w=2.35, fill=RGBColor(0x1D, 0x3B, 0x31), color=MINT, size=8.5)
    oval(s, 0.78, 1.22, 0.54, 0.54, fill=MINT)
    tx(s, "法", 0.78, 1.30, 0.54, 0.3, size=13, color=INK, bold=True, align=PP_ALIGN.CENTER)
    tx(s, "METHOD LAB · V2", 0.78, 1.94, 3.2, 0.25, size=9, color=MINT, bold=True, font=SERIF)
    tx(s, "学法实验室", 0.78, 2.24, 6.2, 0.9, size=44, color=CREAM, bold=True, line=1.0)
    tx(s, "登录一次，\n让教练记住你。", 0.78, 3.32, 6.1, 1.2, size=25, color=CREAM, bold=True, line=1.28)
    tx(s, "账号、服务端记忆、用户/管理员双角色；\n不是一次性 Demo，是一个会持续记得你的学习系统。", 0.80, 4.80, 5.8, 0.8, size=11.5, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.55)
    for i, (t, fg) in enumerate([("账号体系", MINT), ("跨设备记忆", GOLD), ("双角色协作", CORAL)]):
        badge(s, t, 0.80 + i * 1.62, 5.80, w=1.45, fill=RGBColor(0x1D, 0x3B, 0x31), color=fg, size=9)

    cards = [
        (9.02, 1.05, "01", "登录", "用户名 + 密码 · 会话", MINT),
        (9.52, 2.52, "02", "记忆", "服务端用户状态 · 跨设备", GOLD),
        (9.02, 3.99, "03", "管理", "工单 · 方法库发布", CORAL),
    ]
    for x, y, n, head, sub, accent in cards:
        rect(s, x, y, 3.55, 1.28, fill=CREAM, line=None, radius=0.10)
        tx(s, n, x + 0.22, y + 0.16, 0.5, 0.3, size=9, color=accent, bold=True, font=SERIF)
        tx(s, head, x + 0.22, y + 0.43, 2.0, 0.34, size=18, color=INK, bold=True)
        tx(s, sub, x + 0.22, y + 0.88, 3.0, 0.25, size=9.5, color=MUTED)
    line(s, 10.80, 1.6, 10.80, 5.35, color=RGBColor(0x3F, 0x62, 0x52), width=1.2, dash=MSO_LINE_DASH_STYLE.DASH)
    badge(s, "MEMORY · 账号归属", 9.40, 5.55, w=3.2, fill=RGBColor(0x1D, 0x3B, 0x31), color=MINT, size=8)

    line(s, 0.78, 6.58, 7.4, 6.58, color=RGBColor(0x3A, 0x55, 0x49), width=0.8)
    tx(s, "2026.10  /  V2.0  /  METHOD LAB", 0.78, 6.70, 5.0, 0.25, size=8.5, color=RGBColor(0xBF, 0xCB, 0xC3), font=SERIF)
    footer(s, 1, dark=True)
    s.notes_slide.notes_text_frame.text = "v2 的起点不是再加功能，而是补上身份层和记忆层：登录让数据有归属，服务端让记忆跨设备，双角色让反馈有闭环。"


# ------------------------------------------------------------------ 02 problem
def s02():
    s = sld()
    bg(s, PAPER)
    kicker(s, "01 / WHY V2")
    title(s, "没有账号的“记忆”，只是浏览器记得你。", size=27)
    subtitle(s, "v1 是纯前端 Demo：换设备、清缓存、换浏览器，记忆就断了。用户要的不是‘上次聊到哪’，而是‘换一台设备，你仍然知道我’。")

    cards = [
        ("换设备", "电脑 → 手机", "localStorage 不会跟着账号走。", CORAL_SOFT, CORAL_DARK),
        ("清缓存", "浏览器一清", "目标、方法试验、反馈全部丢失。", GOLD_SOFT, RGBColor(0x7A, 0x5A, 0x10)),
        ("换浏览器", "Chrome → Edge", "同一个用户，变成两个陌生人。", BLUE_SOFT, RGBColor(0x2E, 0x6F, 0x9E)),
    ]
    for i, (h, sub, body, tint, fg) in enumerate(cards):
        x = 0.72 + i * 4.0
        rect(s, x, 2.10, 3.75, 2.22, fill=CREAM, line=LINE, radius=0.10)
        oval(s, x + 0.20, 2.30, 0.46, 0.46, fill=tint)
        tx(s, f"0{i+1}", x + 0.20, 2.40, 0.46, 0.2, size=8, color=fg, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, h, x + 0.82, 2.28, 2.4, 0.3, size=14, bold=True)
        tx(s, sub, x + 0.82, 2.64, 2.4, 0.22, size=8.5, color=MUTED2)
        tx(s, body, x + 0.22, 3.15, 3.25, 0.6, size=10, color=MUTED, line=1.55)
        tx(s, "memory = ∅", x + 0.22, 3.92, 2.6, 0.22, size=8.5, color=fg, bold=True, font=SERIF)

    rect(s, 0.72, 4.72, 11.9, 0.9, fill=INK, line=None, radius=0.10)
    tx(s, "v1：浏览器状态", 0.96, 4.93, 2.2, 0.24, size=9, color=MINT, bold=True)
    tx(s, "→", 2.85, 4.90, 0.3, 0.3, size=14, color=CORAL, bold=True)
    tx(s, "v2：用户 ID + 服务端状态", 3.25, 4.93, 3.8, 0.24, size=9, color=CREAM, bold=True)
    tx(s, "→", 6.90, 4.90, 0.3, 0.3, size=14, color=CORAL, bold=True)
    tx(s, "换设备仍然记得", 7.30, 4.93, 2.8, 0.24, size=9, color=GOLD, bold=True)
    tx(s, "不是把 localStorage 换大一点，是换一层数据架构。", 10.05, 4.93, 2.3, 0.24, size=7.5, color=RGBColor(0xBF, 0xCB, 0xC3))

    tx(s, "“记忆不是聊天记录，而是下一次决策的变量。”", 0.72, 6.30, 11.8, 0.3, size=11, color=MUTED)
    footer(s, 2)
    s.notes_slide.notes_text_frame.text = "先承认 v1 的不足：localStorage 不是用户记忆，只是浏览器缓存。v2 必须加账号和服务端状态。"


# ------------------------------------------------------------------ 03 v2 architecture
def s03():
    s = sld()
    bg(s, CREAM)
    plain_rect(s, 0, 0, 13.333, 0.12, fill=INK)
    kicker(s, "02 / V2 OVERVIEW")
    title(s, "v2 = 身份层 + 记忆层 + 协作层。", size=31)
    subtitle(s, "不是加两个页面，而是让‘用户’成为系统的一等公民。")

    layers = [
        ("01", "身份层", "账号 / 登录 / 会话", ["用户名 + 密码", "scrypt 加盐哈希", "HttpOnly 会话", "角色：user / admin"], MINT),
        ("02", "记忆层", "用户 ID 下的状态", ["目标 / 起点 / 约束", "方法试验 / 每日反馈", "跨设备读取同一份", "localStorage 只做缓存"], GOLD),
        ("03", "协作层", "反馈进入产品", ["用户提交问题 / 方法建议", "管理员分诊 / 回复 / 状态", "方法库编辑 / 发布", "用户端刷新可见"], CORAL),
    ]
    for i, (n, head, sub, bullets, tint) in enumerate(layers):
        x = 0.72 + i * 4.02
        rect(s, x, 2.08, 3.78, 3.75, fill=CREAM, line=LINE, radius=0.10)
        oval(s, x + 0.20, 2.28, 0.44, 0.44, fill=tint)
        tx(s, n, x + 0.20, 2.38, 0.44, 0.2, size=8, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, head, x + 0.78, 2.28, 2.5, 0.3, size=16, bold=True)
        tx(s, sub, x + 0.78, 2.64, 2.6, 0.22, size=8.5, color=MUTED2)
        for j, b in enumerate(bullets):
            dot(s, x + 0.24, 3.18 + j * 0.47, tint if tint != MINT else MINT_DARK, d=0.08)
            tx(s, b, x + 0.42, 3.12 + j * 0.47, 3.1, 0.28, size=9, color=INK2, line=1.4)

    rect(s, 0.72, 6.10, 11.90, 0.58, fill=INK, line=None, radius=0.10)
    tx(s, "用户态", 0.96, 6.25, 0.8, 0.22, size=9, color=MINT, bold=True)
    tx(s, "教练台 / 任务卡 / 我的记忆 / 提建议", 1.90, 6.25, 4.0, 0.22, size=9, color=CREAM)
    line(s, 6.00, 6.18, 6.00, 6.60, color=RGBColor(0x3E, 0x5B, 0x4F), width=0.7)
    tx(s, "管理员态", 6.25, 6.25, 1.0, 0.22, size=9, color=GOLD, bold=True)
    tx(s, "工单 / 方法库 / 用户概况", 7.35, 6.25, 3.6, 0.22, size=9, color=CREAM)
    tx(s, "同一套数据，不同权限。", 10.55, 6.25, 1.8, 0.22, size=8, color=RGBColor(0xBF, 0xCB, 0xC3), align=PP_ALIGN.RIGHT)

    footer(s, 3)
    s.notes_slide.notes_text_frame.text = "v2 的三层：身份层解决归属，记忆层解决跨设备，协作层解决反馈闭环。用户态和管理员态共用数据，但权限隔离。"


# ------------------------------------------------------------------ 04 user flow
def s04():
    s = sld()
    bg(s, PAPER)
    kicker(s, "03 / USER FLOW")
    title(s, "登录不是多一步，是让记忆有归属。", size=31)
    subtitle(s, "注册 / 登录 → 三问 → 方法 → 任务卡 → 反馈 → 总结 → 次日；每一步都写进同一个用户 ID。")

    steps = [
        ("01", "登录", "账号 / 会话", MINT),
        ("02", "三问", "目标 / 起点 / 约束", GOLD),
        ("03", "匹配", "1 主 + 2 备选", CORAL),
        ("04", "今日任务", "3 件事 / 25 分钟", BLUE_SOFT),
        ("05", "打卡", "完成 / 难度 / 自测", MINT),
        ("06", "总结", "保留 / 换法", GOLD),
        ("07", "次日", "自动排好", CORAL),
    ]
    x0, y0, w, gap = 0.72, 2.25, 1.55, 0.20
    for i, (n, head, sub, tint) in enumerate(steps):
        x = x0 + i * (w + gap)
        rect(s, x, y0, w, 1.72, fill=CREAM, line=LINE, radius=0.10)
        oval(s, x + 0.14, y0 + 0.14, 0.38, 0.38, fill=tint)
        tx(s, n, x + 0.14, y0 + 0.22, 0.38, 0.2, size=7.5, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, head, x + 0.14, y0 + 0.68, w - 0.24, 0.28, size=12.5, bold=True)
        tx(s, sub, x + 0.14, y0 + 1.06, w - 0.24, 0.4, size=7.5, color=MUTED, line=1.4)
        if i < len(steps) - 1:
            arrow(s, x + w + 0.02, y0 + 0.74, 0.15, 0.16, color=CORAL)

    line(s, 11.55, 4.15, 11.55, 4.75, color=CORAL, width=1.4)
    line(s, 1.50, 4.75, 11.55, 4.75, color=CORAL, width=1.4)
    line(s, 1.50, 4.75, 1.50, 4.15, color=CORAL, width=1.4)
    tx(s, "每次反馈都写回 user_state；下次登录从断开处继续", 4.20, 4.86, 6.0, 0.24, size=9, color=CORAL_DARK, bold=True)

    rect(s, 0.72, 5.40, 11.90, 1.05, fill=INK, line=None, radius=0.10)
    tx(s, "一次登录", 0.96, 5.62, 1.0, 0.25, size=9, color=MINT, bold=True)
    tx(s, "用户档案", 2.05, 5.60, 1.2, 0.25, size=10, color=CREAM, bold=True)
    tx(s, "→ 方法试验", 3.45, 5.60, 1.2, 0.25, size=9, color=RGBColor(0xD6, 0xDF, 0xD8))
    tx(s, "→ 每日反馈", 4.95, 5.60, 1.2, 0.25, size=9, color=RGBColor(0xD6, 0xDF, 0xD8))
    tx(s, "→ 洞察规则", 6.45, 5.60, 1.2, 0.25, size=9, color=RGBColor(0xD6, 0xDF, 0xD8))
    tx(s, "→ 下一次判断", 7.95, 5.60, 1.5, 0.25, size=9, color=GOLD, bold=True)
    tx(s, "换设备也一样", 10.35, 5.60, 1.8, 0.25, size=8.5, color=MINT, align=PP_ALIGN.RIGHT)

    footer(s, 4)
    s.notes_slide.notes_text_frame.text = "用户流程只多了一步登录，但从这一刻起，所有状态都归属于用户 ID，而不是某个浏览器。"


# ------------------------------------------------------------------ 05 login
def s05():
    s = sld()
    bg(s, CREAM)
    kicker(s, "04 / ACCOUNT & SECURITY")
    title(s, "登录页：把“记住你”变成可验证的承诺。", size=28)
    subtitle(s, "用户名 + 密码；密码只存哈希；会话 HttpOnly；管理员接口逐条鉴权。")

    pic(s, ASSETS / "v2_ui_login.png", 0.72, 2.16, 6.75, 4.28, border=True)
    facts = [
        ("密码", "scrypt + 随机 salt，只存哈希，不存明文。"),
        ("会话", "HttpOnly Cookie，7 天过期，退出即失效。"),
        ("权限", "每个 /api/admin/* 都先校验 role=admin。"),
        ("最小化", "管理员只看必要信息，不返回密码字段。"),
    ]
    for i, (k, v) in enumerate(facts):
        y = 2.18 + i * 1.00
        rect(s, 7.82, y, 4.78, 0.86, fill=CREAM, line=LINE, radius=0.10)
        tx(s, k, 8.02, y + 0.13, 0.8, 0.22, size=9.5, color=CORAL_DARK, bold=True)
        tx(s, v, 8.75, y + 0.12, 3.65, 0.55, size=8.8, color=INK2, line=1.45)

    rect(s, 7.82, 6.22, 4.78, 0.44, fill=GOLD_SOFT, line=None, radius=0.10)
    tx(s, "演示：demo / demo12345   ·   管理员账号见提交说明", 7.98, 6.33, 4.5, 0.22, size=7.4, color=RGBColor(0x7A, 0x5A, 0x10), bold=True)

    footer(s, 5)
    s.notes_slide.notes_text_frame.text = "登录页不是装饰：密码哈希、HttpOnly 会话、管理员角色校验，都是可验证的安全边界。演示账号只用于本地评审，部署前改密码。"


# ------------------------------------------------------------------ 06 memory architecture
def s06():
    s = sld()
    bg(s, INK)
    oval(s, 10.8, -1.4, 4.0, 4.0, fill=RGBColor(0x18, 0x3A, 0x30))
    kicker(s, "05 / SERVER MEMORY", color=MINT)
    title(s, "记忆不在浏览器，在用户 ID 下。", size=31, color=CREAM)
    tx(s, "浏览器只做缓存；服务端 user_state 才是源数据。换设备登录，读取同一份状态。", 0.72, 1.72, 11.5, 0.35, size=11, color=RGBColor(0xD6, 0xDF, 0xD8))

    # flow
    boxes = [
        ("Web / 手机", "登录后携带会话", 0.78, 2.42, MINT_SOFT),
        ("Node API", "校验会话 / 角色", 3.18, 2.42, BLUE_SOFT),
        ("user_state", "目标 / 方法 / 反馈", 5.58, 2.42, GOLD_SOFT),
        ("跨设备继续", "同一用户 ID", 8.30, 2.42, CORAL_SOFT),
    ]
    for i, (h, sub, x, y, tint) in enumerate(boxes):
        rect(s, x, y, 2.05, 0.98, fill=tint, line=None, radius=0.10)
        tx(s, h, x + 0.14, y + 0.14, 1.75, 0.26, size=10.5, color=INK, bold=True)
        tx(s, sub, x + 0.14, y + 0.50, 1.75, 0.24, size=7.5, color=MUTED)
        if i < len(boxes) - 1:
            arrow(s, x + 2.08, y + 0.40, 0.22, 0.16, color=CORAL)

    # schema
    tables = [
        ("users", "id · username · password_hash · role", 0.78, 3.98, 2.75),
        ("sessions", "token_hash · user_id · expires_at", 3.72, 3.98, 2.75),
        ("user_states", "user_id · state_json · updated_at", 6.66, 3.98, 2.75),
        ("suggestions", "type · status · admin_reply", 9.60, 3.98, 2.75),
    ]
    for name, cols, x, y, w in tables:
        rect(s, x, y, w, 0.90, fill=RGBColor(0x1D, 0x3B, 0x31), line=RGBColor(0x3A, 0x55, 0x49), radius=0.10)
        tx(s, name, x + 0.14, y + 0.13, w - 0.2, 0.24, size=9, color=MINT, bold=True, font=SERIF)
        tx(s, cols, x + 0.14, y + 0.45, w - 0.2, 0.28, size=6.8, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.3)
    tx(s, "methods", 9.60, 5.12, 1.6, 0.22, size=8, color=GOLD, bold=True, font=SERIF)
    tx(s, "data_json · published · updated_by", 9.60, 5.38, 2.7, 0.22, size=6.8, color=RGBColor(0xD6, 0xDF, 0xD8))

    badge(s, "1 个账号 = 1 份学习记忆", 0.78, 5.05, w=2.55, fill=RGBColor(0x1D, 0x3B, 0x31), color=MINT, size=8)
    tx(s, "登出只清会话，不删学习记录；换设备重新登录即可恢复。", 0.78, 5.48, 7.0, 0.25, size=8.5, color=RGBColor(0xBF, 0xCB, 0xC3))
    tx(s, "localStorage = 可选缓存", 9.60, 5.82, 2.8, 0.25, size=8, color=GOLD, bold=True)

    footer(s, 6, dark=True)
    s.notes_slide.notes_text_frame.text = "服务端记忆是 v2 的核心：用户表、会话表、状态表、建议表、方法表。浏览器只缓存，不是数据源。"


# ------------------------------------------------------------------ 07 user app + prompts
def s07():
    s = sld()
    bg(s, PAPER)
    kicker(s, "06 / USER APP")
    title(s, "用户端：任务卡、记忆、建议，都在一个账号里。", size=29)
    subtitle(s, "登录后直接从第 7 天继续；同一账号换设备，不重新问三问。")

    pic(s, ASSETS / "v2_ui_plan.png", 0.72, 2.16, 5.55, 4.55, border=True)
    prompts = [
        ("🗣️", "英语口语", "4 周后英文面试，每天 30 分钟，雅思 5.5，开口就卡。", "影子跟读 → 语块串联"),
        ("📚", "审计期末", "2 周后期末，模考 58，案例题丢分最多，每天 1 小时。", "真题逆向 → 主动回忆"),
        ("💄", "通勤妆", "2 周学会 15 分钟通勤妆，底妆卡粉，眼影总画脏。", "半脸对比 → 仿妆拆解"),
    ]
    for i, (emoji, head, prompt, method) in enumerate(prompts):
        y = 2.16 + i * 1.45
        rect(s, 6.60, y, 5.98, 1.25, fill=CREAM, line=LINE, radius=0.10)
        tx(s, emoji, 6.78, y + 0.14, 0.4, 0.3, size=15)
        tx(s, head, 7.20, y + 0.12, 0.95, 0.22, size=9.5, bold=True)
        tx(s, f"“{prompt}”", 8.12, y + 0.10, 4.25, 0.48, size=7.4, color=MUTED, line=1.35)
        tx(s, method, 7.20, y + 0.78, 2.4, 0.24, size=8.2, color=CORAL_DARK, bold=True)
        tx(s, "3 天微试验 · 反馈可换", 9.85, y + 0.78, 2.4, 0.24, size=7.2, color=MUTED2)

    tx(s, "登录后仍先过三问；三问、匹配、换法都不因账号而跳过。", 6.60, 6.48, 5.9, 0.25, size=8.2, color=MUTED2)
    footer(s, 7)
    s.notes_slide.notes_text_frame.text = "这页同时展示用户端和三个提示词。重点：登录后从第 7 天继续，但三问门槛仍然保留。"


# ------------------------------------------------------------------ 08 admin tickets
def s08():
    s = sld()
    bg(s, CREAM)
    kicker(s, "07 / ADMIN · TICKETS")
    title(s, "管理员态：反馈有地方去，也有人处理。", size=30)
    subtitle(s, "用户提交问题 / 方法建议；管理员分诊、回复、改状态；用户端能看到处理结果。")

    pic(s, ASSETS / "v2_ui_admin_tickets.png", 0.72, 2.18, 7.25, 4.60, border=True)
    steps = [
        ("01", "用户提交", "问题 / 方法建议 / 具体场景"),
        ("02", "管理员分诊", "待处理 → 处理中 → 已解决"),
        ("03", "回到用户", "“我的建议”看到状态与回复"),
    ]
    for i, (n, h, d) in enumerate(steps):
        y = 2.18 + i * 1.20
        rect(s, 8.22, y, 4.38, 1.02, fill=CREAM, line=LINE, radius=0.10)
        num_circle(s, n, 8.40, y + 0.28, d=0.38, fill=CORAL_SOFT, color=CORAL_DARK, size=7)
        tx(s, h, 8.92, y + 0.14, 3.4, 0.24, size=10.5, bold=True)
        tx(s, d, 8.92, y + 0.50, 3.4, 0.24, size=7.8, color=MUTED)
        if i < len(steps) - 1:
            line(s, 8.59, y + 1.00, 8.59, y + 1.20, color=CORAL, width=1.0)

    rect(s, 8.22, 5.92, 4.38, 0.48, fill=INK, line=None, radius=0.10)
    tx(s, "不是客服邮箱，是产品闭环。", 8.42, 6.05, 3.9, 0.22, size=9, color=MINT, bold=True)
    footer(s, 8)
    s.notes_slide.notes_text_frame.text = "管理员工单页：用户提交后进入待处理，管理员回复/改状态，用户在‘我的建议’看到。它让反馈真正进入产品，而不是沉在聊天里。"


# ------------------------------------------------------------------ 09 admin methods
def s09():
    s = sld()
    bg(s, PAPER)
    kicker(s, "08 / ADMIN · METHOD LIBRARY")
    title(s, "管理员态：方法库可编辑、可发布。", size=30)
    subtitle(s, "草稿不会进入匹配；发布后用户端刷新可见。管理员改内容，但不能绕开证据与边界。")

    pic(s, ASSETS / "v2_ui_admin_methods.png", 0.72, 2.18, 7.25, 4.60, border=True)
    points = [
        ("草稿 / 已发布", "publish 开关；未发布不进入 /api/methods。", MINT),
        ("结构化字段", "目标 / 证据 / 时间 / 步骤 / 指标 / 失败模式。", GOLD),
        ("版本与来源", "updated_at / updated_by / source 可追溯。", CORAL),
        ("用户端生效", "发布后刷新用户端即可看到新卡。", BLUE_SOFT),
    ]
    for i, (h, d, tint) in enumerate(points):
        y = 2.18 + i * 1.12
        plain_rect(s, 8.22, y, 0.10, 0.88, fill=tint)
        tx(s, h, 8.48, y + 0.10, 3.9, 0.24, size=10.2, bold=True)
        tx(s, d, 8.48, y + 0.45, 3.9, 0.34, size=7.8, color=MUTED, line=1.45)

    tx(s, "“内容运营不是改文案，是维护可执行资产。”", 8.24, 6.55, 4.2, 0.25, size=8.5, color=MUTED)
    footer(s, 9)
    s.notes_slide.notes_text_frame.text = "管理员可以编辑方法卡并发布/转草稿；用户端只读取已发布方法。这样内容能迭代，但不会把未验证内容推给用户。"


# ------------------------------------------------------------------ 10 gate
def s10():
    s = sld()
    bg(s, CREAM)
    kicker(s, "09 / HARD GATE")
    title(s, "账号解决“记得你”，三问解决“从哪开始”。", size=29)
    subtitle(s, "未答完 3 问，不进入匹配；这不是提示词，是状态机。")

    qs = [
        ("01", "目标与期限", "你具体想解决什么？多久要看到结果？", "4 周后英文面试，连续说 2 分钟"),
        ("02", "当前起点", "最近一次表现 / 分数 / 作品是什么？", "雅思 5.5，开口语法混乱"),
        ("03", "时间与环境", "每天能稳定投入多少？在哪、会被什么打断？", "每天 30 分钟，晚上 9 点后，宿舍"),
    ]
    for i, (n, head, q, ex) in enumerate(qs):
        y = 2.10 + i * 1.30
        rect(s, 0.72, y, 6.30, 1.10, fill=CREAM, line=LINE, radius=0.10)
        num_circle(s, n, 0.92, y + 0.25, d=0.40, fill=(MINT if i == 0 else (GOLD_SOFT if i == 1 else CORAL_SOFT)), color=INK, size=8)
        tx(s, head, 1.48, y + 0.14, 2.0, 0.26, size=11.5, bold=True)
        tx(s, q, 1.48, y + 0.45, 5.2, 0.25, size=8.8, color=MUTED)
        tx(s, f"例：{ex}", 1.48, y + 0.78, 5.2, 0.2, size=7.5, color=MUTED2)

    rect(s, 7.38, 2.10, 5.20, 3.90, fill=INK, line=None, radius=0.10)
    tx(s, "STATE MACHINE", 7.62, 2.30, 2.2, 0.22, size=7.5, color=MINT, bold=True, font=SERIF)
    states = [("WAITING Q1", 7.66, 2.72, 1.10), ("Q2", 9.02, 2.72, 0.60), ("Q3", 10.00, 2.72, 0.60), ("READY", 10.98, 2.72, 0.78)]
    for label, x, y, w in states:
        rect(s, x, y, w, 0.42, fill=(MINT if label == "READY" else RGBColor(0x2A, 0x4A, 0x3D)), line=None, radius=0.12)
        tx(s, label, x, y + 0.11, w, 0.2, size=7.2 if label == "WAITING Q1" else 7.8, color=(INK if label == "READY" else CREAM), bold=True, align=PP_ALIGN.CENTER)
        if label != "READY":
            arrow(s, x + w + 0.04, y + 0.13, 0.12, 0.14, color=CORAL)

    line(s, 8.20, 3.18, 8.20, 3.62, color=CORAL, width=1.2, dash=MSO_LINE_DASH_STYLE.DASH)
    rect(s, 7.66, 3.62, 2.05, 0.42, fill=CORAL_SOFT, line=None, radius=0.12)
    tx(s, "BLOCKED · 不给方案", 7.66, 3.73, 2.05, 0.2, size=7.2, color=CORAL_DARK, bold=True, align=PP_ALIGN.CENTER)
    tx(s, "用户提前要方案\n→ 回到当前问题", 9.90, 3.58, 2.2, 0.55, size=7.8, color=RGBColor(0xD6, 0xDF, 0xD8), line=1.4)
    tx(s, "“还差第 2 问，我先不给你方案。”", 7.62, 4.48, 4.5, 0.3, size=12, color=CREAM, bold=True)
    tx(s, "这句话不是客服话术，是系统状态。", 7.62, 4.92, 4.2, 0.22, size=8, color=MINT)

    tx(s, "账号只解决连续性；三问才解决适配性。", 0.72, 6.55, 11.8, 0.24, size=9, color=MUTED2)
    footer(s, 10)
    s.notes_slide.notes_text_frame.text = "三问门槛在 v2 中仍然保留。账号让用户不用重复讲，但每次重新诊断仍需要目标/起点/约束。"


# ------------------------------------------------------------------ 11 matching
def s11():
    s = sld()
    bg(s, PAPER)
    kicker(s, "10 / MATCHING")
    title(s, "4 层评分 + 3 天微试验。", size=31)
    subtitle(s, "LLM 只解释，不负责打分；匹配必须可解释、可复现、可退出。")

    rect(s, 0.72, 2.10, 6.00, 3.78, fill=INK, line=None, radius=0.10)
    tx(s, "FIT = 0.35 × GOAL + 0.25 × TIME", 0.98, 2.32, 5.4, 0.3, size=12.5, color=CREAM, bold=True)
    tx(s, "+ 0.20 × EVIDENCE + 0.20 × HISTORY − FRICTION", 0.98, 2.72, 5.5, 0.3, size=11.5, color=CREAM, bold=True)
    rows = [
        ("目标 / 学科", "方法是否服务这个目标"),
        ("时间 / 难度", "超出预算或认知负荷，降权"),
        ("证据 / 偏好", "A/B/C 分级，不把 C 说成 A"),
        ("历史 / 失败", "试过且无效的方法，不重复推荐"),
    ]
    for i, (k, v) in enumerate(rows):
        y = 3.34 + i * 0.52
        tx(s, f"0{i+1}", 0.98, y, 0.3, 0.2, size=7.5, color=CORAL, bold=True, font=SERIF)
        tx(s, k, 1.36, y - 0.01, 1.5, 0.22, size=9.5, color=CREAM, bold=True)
        tx(s, v, 2.95, y - 0.01, 3.4, 0.22, size=8.2, color=RGBColor(0xBF, 0xCB, 0xC3))
    tx(s, "LLM 只解释，不负责打分。", 0.98, 5.52, 4.6, 0.22, size=8.5, color=GOLD, bold=True)

    rect(s, 6.95, 2.10, 5.65, 3.78, fill=CREAM, line=LINE, radius=0.10)
    tx(s, "候选方法 · 4 周英文面试", 7.18, 2.28, 4.0, 0.24, size=9.5, bold=True)
    candidates = [("影子跟读", 79, CORAL), ("语块串联", 74, GOLD), ("情景角色扮演", 69, MINT_DARK)]
    for i, (name, value, color) in enumerate(candidates):
        y = 2.78 + i * 0.82
        tx(s, name, 7.18, y, 1.4, 0.22, size=9, color=INK2, bold=True)
        bar(s, 8.62, y + 0.02, 3.10, 0.22, value, color=color, label=str(value))

    for i, t in enumerate(["可解释", "可复现", "可退出"]):
        badge(s, t, 0.72 + i * 1.45, 6.12, w=1.25, fill=MINT_SOFT if i == 0 else (GOLD_SOFT if i == 1 else CORAL_SOFT), color=MINT_DARK if i == 0 else (RGBColor(0x7A,0x5A,0x10) if i == 1 else CORAL_DARK), size=8)
    tx(s, "3 天不达标就换，不把“坚持”当美德。", 5.55, 6.15, 5.5, 0.24, size=8.5, color=MUTED2)

    footer(s, 11)
    s.notes_slide.notes_text_frame.text = "匹配仍由规则/权重完成，LLM 只负责解释。3 天微试验是退出机制：不达标就换，不把坚持当目标。"


# ------------------------------------------------------------------ 12 daily loop
def s12():
    s = sld()
    bg(s, CREAM)
    kicker(s, "11 / DAILY LOOP")
    title(s, "一张今天能执行、晚上能验收的任务卡。", size=29)
    subtitle(s, "目标、方法、任务、反馈、总结、次日；每一步都写进同一个 user_state。")

    events = [
        ("09:00", "学情判断", "目标清晰度 / 起点 / 风险", MINT),
        ("09:03", "方法匹配", "1 个主方法 + 2 个备选", GOLD),
        ("09:05", "今日任务", "3 件事 / 25 分钟 / 可检查产出", CORAL),
        ("20:30", "完成打卡", "完成度 / 难度 / 自测 / 卡点", BLUE_SOFT),
        ("20:35", "今日总结", "保留 / 换法 / 次日内容", MINT),
    ]
    for i, (t, h, d, tint) in enumerate(events):
        y = 2.08 + i * 0.82
        tx(s, t, 0.74, y, 0.68, 0.22, size=8.5, color=CORAL_DARK, bold=True, font=SERIF)
        oval(s, 1.52, y + 0.04, 0.16, 0.16, fill=tint, line=INK)
        if i < len(events) - 1:
            line(s, 1.60, y + 0.20, 1.60, y + 0.80, color=LINE, width=1.0)
        tx(s, h, 1.82, y - 0.02, 1.6, 0.24, size=11, bold=True)
        tx(s, d, 3.42, y, 3.3, 0.24, size=8.5, color=MUTED)

    # task card mock
    rect(s, 7.15, 2.02, 5.45, 4.25, fill=CREAM, line=LINE, radius=0.10)
    tx(s, "TODAY / 第 7 天", 7.38, 2.20, 2.5, 0.22, size=7.8, color=MUTED2, bold=True, font=SERIF)
    tx(s, "今天只做这 3 件事", 7.38, 2.48, 4.0, 0.32, size=16, bold=True)
    tasks = [
        ("摘 10 个高频语块", "5 min · 产出：10 个语块卡"),
        ("每个语块造 2 句", "15 min · 产出：20 个句子"),
        ("串成 1 分钟独白", "5 min · 产出：1 分钟录音"),
    ]
    for i, (h, d) in enumerate(tasks):
        y = 2.98 + i * 0.86
        rect(s, 7.38, y, 5.0, 0.70, fill=RGBColor(0xFF, 0xFE, 0xFA), line=LINE2, radius=0.10)
        oval(s, 7.52, y + 0.22, 0.18, 0.18, fill=(MINT_DARK if i == 0 else RGBColor(0xEE,0xE8,0xDC)))
        tx(s, h, 7.82, y + 0.10, 3.0, 0.22, size=9.2, bold=True)
        tx(s, d, 7.82, y + 0.38, 4.0, 0.2, size=7.2, color=MUTED)

    tx(s, "“任务卡不是待办清单，是实验记录。”", 0.74, 6.48, 5.4, 0.3, size=9.5, color=MUTED)
    footer(s, 12)
    s.notes_slide.notes_text_frame.text = "用户每天看到的是 3 件可验收的事，而不是一篇文章。晚上反馈会写回 user_state，第二天继续。"


# ------------------------------------------------------------------ 13 switch
def s13():
    s = sld()
    bg(s, PAPER)
    kicker(s, "12 / SWITCH")
    title(s, "效果不好就换法，但先判断是哪一种不好。", size=29)
    subtitle(s, "换法不是情绪反应，是有阈值、有原因、有记录的状态迁移。")

    cards = [
        ("执行阻力", "完成率 < 60%", "先降门槛：拆任务、缩时长、换时段。不要急着换法。", GOLD),
        ("方法不匹配", "完成率高 + 自测 < 60%", "做了但没有转化为输出：换一个反馈更快的方法。", CORAL),
        ("认知过载", "难度 5/5 + 效果 < 65", "方法太难：换更轻、更熟悉、步骤更少的方法。", BLUE_SOFT),
        ("方法有效", "完成率高 + 自测高", "保留方法，只加一个变量：素材难度或自测严格度。", MINT),
    ]
    for i, (h, trigger, action, tint) in enumerate(cards):
        row, col = divmod(i, 2)
        x = 0.72 + col * 6.05
        y = 2.06 + row * 1.52
        rect(s, x, y, 5.80, 1.32, fill=CREAM, line=LINE, radius=0.10)
        plain_rect(s, x, y, 0.10, 1.32, fill=tint)
        tx(s, h, x + 0.28, y + 0.14, 1.25, 0.24, size=12, bold=True)
        tx(s, trigger, x + 1.55, y + 0.15, 2.3, 0.22, size=7.8, color=CORAL_DARK, bold=True)
        tx(s, action, x + 0.28, y + 0.58, 5.2, 0.52, size=8.8, color=MUTED, line=1.5)

    rect(s, 0.72, 5.30, 11.90, 1.05, fill=INK, line=None, radius=0.10)
    tx(s, "案例：第 3 天触发换法", 0.96, 5.46, 2.4, 0.22, size=7.8, color=MINT, bold=True, font=SERIF)
    tx(s, "影子跟读", 0.96, 5.75, 1.0, 0.24, size=10.5, color=CREAM, bold=True)
    tx(s, "完成 60/65/55 · 自测 52/55/48", 2.00, 5.77, 3.1, 0.22, size=8.3, color=RGBColor(0xD6, 0xDF, 0xD8))
    arrow(s, 5.20, 5.80, 0.38, 0.16, color=CORAL)
    tx(s, "语块串联", 5.74, 5.75, 1.0, 0.24, size=10.5, color=MINT, bold=True)
    tx(s, "完成 85/88/92 · 效果 68/74/80", 6.78, 5.77, 3.5, 0.22, size=8.3, color=RGBColor(0xD6, 0xDF, 0xD8))
    badge(s, "换法后 +24 分", 10.72, 5.75, w=1.45, fill=MINT, color=INK, size=7.5)

    tx(s, "“换法不是失败，是控制变量。”", 0.72, 6.62, 6.0, 0.28, size=9.5, color=MUTED)
    footer(s, 13)
    s.notes_slide.notes_text_frame.text = "换法页回答‘效果不好怎么办’。先区分执行阻力和方法不匹配，避免把所有问题都归因于方法。"


# ------------------------------------------------------------------ 14 library
def s14():
    s = sld()
    bg(s, CREAM)
    kicker(s, "13 / METHOD LIBRARY")
    title(s, "43 张方法卡，9 个领域，统一的结构。", size=29)
    subtitle(s, "方法不是文案，是可执行、可验证、可退出的资产；管理员可编辑，用户只看到已发布。")

    rect(s, 0.72, 2.10, 5.55, 4.38, fill=PAPER, line=LINE, radius=0.08)
    badge(s, "METHOD CARD / 示例", 0.96, 2.26, w=1.85, fill=INK, color=MINT, size=7.4)
    tx(s, "影子跟读", 0.96, 2.58, 2.5, 0.4, size=21, bold=True)
    tx(s, "Shadowing · 英语口语 / 口头表达", 0.96, 3.00, 4.7, 0.22, size=8.2, color=MUTED, font=SERIF)
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
        y = 3.34 + i * 0.42
        tx(s, k, 0.98, y, 0.9, 0.2, size=7.8, color=MUTED2, bold=True)
        tx(s, v, 1.95, y - 0.01, 4.05, 0.22, size=8.5, color=INK2)
        if i < len(rows) - 1:
            line(s, 0.98, y + 0.29, 4.98, y + 0.29, color=LINE2, width=0.5)

    tx(s, "9 个领域，按「能力 + 反馈方式」组织", 6.62, 2.06, 5.8, 0.26, size=9.5, bold=True)
    domains = [("通用",15),("考试",15),("专业课",19),("英语口语",11),("口头表达",12),("编程/理工",8),("写作",6),("审美/化妆",7),("时间管理",5)]
    for i, (name, count) in enumerate(domains):
        row, col = divmod(i, 3)
        x = 6.62 + col * 2.03
        y = 2.42 + row * 0.95
        rect(s, x, y, 1.88, 0.80, fill=CREAM, line=LINE, radius=0.10)
        tx(s, str(count), x + 0.12, y + 0.10, 0.5, 0.3, size=14, color=CORAL_DARK, bold=True, font=SERIF)
        tx(s, name, x + 0.58, y + 0.13, 1.2, 0.22, size=8.8, bold=True)
        tx(s, "已发布", x + 0.58, y + 0.45, 1.0, 0.18, size=6.5, color=MUTED2)

    rect(s, 6.62, 5.48, 5.98, 0.92, fill=INK, line=None, radius=0.10)
    stats = [("10", "证据 A", MINT), ("26", "证据 B", GOLD), ("7", "证据 C", CORAL), ("129+", "资料模板", CREAM)]
    for i, (n, label, color) in enumerate(stats):
        x = 6.84 + i * 1.42
        tx(s, n, x, 5.60, 0.7, 0.3, size=15, color=color, bold=True, font=SERIF)
        tx(s, label, x, 5.94, 0.9, 0.18, size=6.8, color=RGBColor(0xD6, 0xDF, 0xD8))

    tx(s, "来源：学习科学文献 + 专业训练体系 + 公开方法访谈；只提炼结构，不复制个人 IP。", 0.72, 6.72, 11.8, 0.2, size=7.5, color=MUTED2)
    footer(s, 14)
    s.notes_slide.notes_text_frame.text = "方法库 43 张卡、9 个领域；管理员可编辑/发布，用户端只读取已发布。每张卡都有证据等级、边界和换法条件。"


# ------------------------------------------------------------------ 15 cross-disciplinary
def s15():
    s = sld()
    bg(s, PAPER)
    kicker(s, "14 / CROSS-DISCIPLINARY")
    title(s, "账号 + 记忆 + 方法库，让跨领域不是口号。", size=29)
    subtitle(s, "不按学科切，按能力坐标切：记忆 / 理解 / 解题 / 输出 / 实操 / 审美 / 元认知。")

    cols = ["考试", "英语口语", "口头表达", "专业课", "编程/理工", "写作", "审美/化妆"]
    rows = ["记忆", "理解", "解题", "输出", "实操", "审美", "元认知"]
    matrix = [
        [3,2,1,3,1,1,0],
        [2,1,2,3,3,2,1],
        [3,0,0,3,2,1,0],
        [0,3,3,1,1,2,1],
        [0,1,1,1,3,1,3],
        [0,0,2,0,0,1,3],
        [2,2,2,2,2,2,1],
    ]
    cw, ch = 0.90, 0.42
    ox, oy = 1.62, 2.48
    for j, c in enumerate(cols):
        tx(s, c, ox + j * cw - 0.12, oy - 0.30, cw + 0.2, 0.2, size=7, color=MUTED, align=PP_ALIGN.CENTER)
    colors = {3: MINT, 2: GOLD_SOFT, 1: RGBColor(0xF1,0xEC,0xE1), 0: RGBColor(0xFA,0xF7,0xF0)}
    for i, r in enumerate(rows):
        tx(s, r, 0.72, oy + i * ch + 0.10, 0.8, 0.2, size=8, color=INK2, bold=True)
        for j in range(len(cols)):
            v = matrix[i][j]
            rect(s, ox + j * cw, oy + i * ch, cw - 0.05, ch - 0.05, fill=colors[v], line=None, radius=0.18)
            if v == 3:
                dot(s, ox + j * cw + cw / 2 - 0.08, oy + i * ch + ch / 2 - 0.10, MINT_DARK, d=0.13)
            elif v == 2:
                dot(s, ox + j * cw + cw / 2 - 0.06, oy + i * ch + ch / 2 - 0.08, GOLD, d=0.10)
            elif v == 1:
                dot(s, ox + j * cw + cw / 2 - 0.04, oy + i * ch + ch / 2 - 0.06, RGBColor(0xC9,0xBE,0xAD), d=0.06)

    for i, (label, color) in enumerate([("强", MINT_DARK), ("中", GOLD), ("弱", RGBColor(0xC9,0xBE,0xAD))]):
        dot(s, 0.74 + i * 0.86, 6.02, color, d=0.10)
        tx(s, label, 0.89 + i * 0.86, 5.98, 0.5, 0.2, size=7.2, color=MUTED)

    transfers = [
        ("影子跟读", "演讲节奏", "同步模仿 → 停顿/语速控制"),
        ("半脸对比", "实验对照", "控制变量 → 同光/单手改一个变量"),
        ("错题尸检", "调试日志", "错误分类 → 根因/复现条件"),
    ]
    for i, (a, b, note) in enumerate(transfers):
        y = 2.18 + i * 1.18
        rect(s, 8.34, y, 4.26, 0.96, fill=CREAM, line=LINE, radius=0.10)
        tx(s, a, 8.52, y + 0.13, 1.2, 0.22, size=10, bold=True)
        tx(s, "→", 9.70, y + 0.13, 0.25, 0.22, size=11, color=CORAL, bold=True)
        tx(s, b, 9.98, y + 0.13, 1.2, 0.22, size=10, bold=True)
        tx(s, note, 8.52, y + 0.52, 3.8, 0.2, size=7.2, color=MUTED)

    tx(s, "同一套能力 taxonomy，换领域只换素材和评分标准。", 8.34, 5.78, 4.2, 0.28, size=8.8, color=CORAL_DARK, bold=True)
    footer(s, 15)
    s.notes_slide.notes_text_frame.text = "跨学科视角：不是把科目堆在一起，而是复用记忆/理解/输出/实操/审美等学习机制。账号与记忆让跨领域积累成为可能。"


# ------------------------------------------------------------------ 16 data
def s16():
    s = sld()
    bg(s, CREAM)
    kicker(s, "15 / DATA & PIPELINE")
    title(s, "数据不是越多越好，而是能被追溯和分级。", size=29)
    subtitle(s, "三类来源、七个预处理步骤、三级证据；每张卡都能回答「凭什么」。")

    sources = [
        ("01", "学习科学文献", "Dunlosky 2013 · Roediger & Karpicke 2006\nCepeda 2006 · Ericsson 1993 · Bjork 2011", "证据分级与边界", MINT_SOFT),
        ("02", "专业训练体系", "Cambridge English · Toastmasters\nCPA/ACCA 案例 · 临床推理 · 专业化妆训练", "领域步骤与评分", GOLD_SOFT),
        ("03", "公开方法内容", "书籍 / 公开演讲 / B站 / 知乎 / 播客\n只提炼结构，不复制个人表达", "方法原型与场景", CORAL_SOFT),
    ]
    for i, (n, h, body, use, tint) in enumerate(sources):
        y = 2.16 + i * 1.38
        rect(s, 0.72, y, 5.80, 1.16, fill=CREAM, line=LINE, radius=0.10)
        oval(s, 0.92, y + 0.18, 0.38, 0.38, fill=tint)
        tx(s, n, 0.92, y + 0.26, 0.38, 0.2, size=7.2, color=INK, bold=True, align=PP_ALIGN.CENTER, font=SERIF)
        tx(s, h, 1.46, y + 0.10, 2.0, 0.22, size=10, bold=True)
        tx(s, body, 1.46, y + 0.40, 4.15, 0.48, size=6.9, color=INK2, line=1.35)
        tx(s, use, 1.46, y + 0.92, 4.0, 0.18, size=6.6, color=MUTED2)

    tx(s, "PREPROCESS", 6.92, 2.06, 2.2, 0.22, size=7.5, color=CORAL_DARK, bold=True, font=SERIF)
    steps = ["采集", "去重", "结构化", "证据分级", "边界标注", "人工复核", "版本管理"]
    for i, st in enumerate(steps):
        y = 2.38 + i * 0.55
        rect(s, 6.92, y, 2.35, 0.40, fill=(CREAM if i % 2 == 0 else MINT_SOFT), line=LINE, radius=0.12)
        tx(s, st, 7.04, y + 0.09, 1.9, 0.2, size=7.8, color=INK2, bold=True)
        if i < len(steps) - 1:
            line(s, 8.09, y + 0.40, 8.09, y + 0.54, color=CORAL, width=1.0)

    rect(s, 9.60, 2.38, 3.02, 3.62, fill=INK, line=None, radius=0.10)
    tx(s, "QUALITY", 9.82, 2.56, 1.4, 0.22, size=7.5, color=MINT, bold=True, font=SERIF)
    stats = [("43", "方法卡"), ("9", "领域"), ("129+", "资料模板"), ("3", "证据等级")]
    for i, (n, label) in enumerate(stats):
        y = 2.88 + i * 0.68
        tx(s, n, 9.82, y, 0.8, 0.3, size=17, color=CREAM, bold=True, font=SERIF)
        tx(s, label, 10.68, y + 0.05, 1.2, 0.22, size=7.8, color=RGBColor(0xD6,0xDF,0xD8))
    tx(s, "复核周期：3 个月\n来源变更可追溯", 9.82, 5.60, 2.5, 0.3, size=6.8, color=RGBColor(0xBF,0xCB,0xC3), line=1.4)

    tx(s, "证据分级：A 多项实验/元分析 · B 单项研究/专业共识 · C 实践者经验，需微试验验证。", 0.72, 6.48, 11.8, 0.22, size=7.8, color=MUTED2)
    footer(s, 16)
    s.notes_slide.notes_text_frame.text = "数据来源三类：文献、专业训练、公开方法。预处理七步，证据分三级；方法库不是随便抓文案。"


# ------------------------------------------------------------------ 17 tech
def s17():
    s = sld()
    bg(s, INK)
    kicker(s, "16 / ARCHITECTURE", color=MINT)
    title(s, "Node + SQLite：小团队也能维护的全栈闭环。", size=29, color=CREAM)
    tx(s, "前端保持原生 JS；后端用 Node 内置 http + node:sqlite；零外部依赖，先把闭环跑通，再换云数据库。", 0.72, 1.72, 11.6, 0.4, size=10.5, color=RGBColor(0xD6,0xDF,0xD8))

    boxes = [
        ("浏览器", "用户端 / 管理端", 0.78, 2.48, MINT_SOFT),
        ("Node API", "auth / state / suggestions", 3.10, 2.48, BLUE_SOFT),
        ("SQLite", "users / states / methods", 5.80, 2.48, GOLD_SOFT),
        ("管理员", "工单 / 方法库", 8.55, 2.48, CORAL_SOFT),
    ]
    for i, (h, sub, x, y, tint) in enumerate(boxes):
        rect(s, x, y, 2.10, 1.18, fill=tint, line=None, radius=0.10)
        tx(s, h, x + 0.16, y + 0.18, 1.8, 0.26, size=12, color=INK, bold=True)
        tx(s, sub, x + 0.16, y + 0.62, 1.8, 0.3, size=7.0, color=MUTED, line=1.35)
        if i < len(boxes) - 1:
            arrow(s, x + 2.12, y + 0.50, 0.20, 0.16, color=CORAL)

    line(s, 9.60, 3.66, 9.60, 4.12, color=CORAL, width=1.4)
    line(s, 3.10, 4.12, 9.60, 4.12, color=CORAL, width=1.4)
    line(s, 3.10, 4.12, 3.10, 3.68, color=CORAL, width=1.4)
    tx(s, "所有写操作回到 API，权限与数据校验在服务端", 5.50, 4.20, 5.2, 0.22, size=7.8, color=CORAL, bold=True)

    chips = [
        ("会话", "HttpOnly Cookie", "7 天过期"),
        ("密码", "scrypt + salt", "不存明文"),
        ("权限", "role guard", "每个 admin API"),
        ("数据", "SQLite WAL", "可换 Postgres"),
    ]
    for i, (h, v, s2) in enumerate(chips):
        x = 0.78 + i * 3.02
        rect(s, x, 4.72, 2.80, 0.78, fill=RGBColor(0x1D,0x3B,0x31), line=RGBColor(0x3A,0x55,0x49), radius=0.10)
        tx(s, h, x + 0.14, 4.83, 0.7, 0.2, size=7.2, color=MINT, bold=True)
        tx(s, v, x + 0.85, 4.82, 1.8, 0.22, size=8.8, color=CREAM, bold=True)
        tx(s, s2, x + 0.14, 5.14, 2.4, 0.18, size=6.8, color=RGBColor(0xBF,0xCB,0xC3))

    tx(s, "本地优先：npm start 即可演示；部署时把 SQLite 换成持久化磁盘或 Postgres。", 0.78, 6.08, 11.8, 0.3, size=9, color=GOLD, bold=True)
    tx(s, "为什么不是纯前端：账号、会话、角色、跨设备记忆，必须有服务端。", 0.78, 6.55, 11.8, 0.25, size=8.5, color=RGBColor(0xBF,0xCB,0xC3))
    footer(s, 17, dark=True)
    s.notes_slide.notes_text_frame.text = "技术架构不追求复杂：Node 内置模块 + SQLite 先把闭环跑通；账号/会话/角色必须在服务端。后续可换 Postgres。"


# ------------------------------------------------------------------ 18 security
def s18():
    s = sld()
    bg(s, CREAM)
    kicker(s, "17 / SECURITY & RISK")
    title(s, "先承认边界，再谈“记住你”。", size=31)
    subtitle(s, "账号系统最大的风险不是不够智能，而是密码泄露、越权和数据滥用。")

    rows = [
        ("密码", "scrypt + 随机 salt", "数据库不存明文；登录只比对哈希。"),
        ("会话", "HttpOnly / SameSite=Lax", "前端拿不到 token；退出即删除会话。"),
        ("权限", "role=admin 逐条校验", "用户无法调用管理 API；管理员不返回密码。"),
        ("输入", "长度 / 类型 / 同源校验", "防注入、防超长、防跨站写操作。"),
    ]
    for i, (k, v, d) in enumerate(rows):
        y = 2.08 + i * 1.02
        rect(s, 0.72, y, 6.75, 0.86, fill=CREAM, line=LINE, radius=0.10)
        tx(s, k, 0.92, y + 0.14, 0.7, 0.22, size=9, color=CORAL_DARK, bold=True)
        tx(s, v, 1.70, y + 0.12, 2.3, 0.24, size=10, bold=True)
        tx(s, d, 1.70, y + 0.46, 5.3, 0.22, size=7.5, color=MUTED)

    rect(s, 7.78, 2.08, 4.84, 3.62, fill=INK, line=None, radius=0.10)
    tx(s, "风险与应对", 8.00, 2.28, 2.6, 0.24, size=9, color=MINT, bold=True, font=SERIF)
    risks = [
        ("默认管理员密码", "部署前必须改 .env；生产禁用默认值。"),
        ("SQLite 单机磁盘", "改持久化磁盘/Postgres；做备份。"),
        ("XSS / CSRF", "转义输出；SameSite + Origin 校验。"),
        ("数据删除", "用户可清空记忆；删除请求需可执行。"),
    ]
    for i, (r, m) in enumerate(risks):
        y = 2.68 + i * 0.70
        tx(s, "•", 8.00, y, 0.2, 0.22, size=10, color=CORAL, bold=True)
        tx(s, r, 8.20, y - 0.01, 1.7, 0.22, size=8.6, color=CREAM, bold=True)
        tx(s, m, 9.95, y - 0.01, 2.45, 0.45, size=7.0, color=RGBColor(0xBF,0xCB,0xC3), line=1.35)

    tx(s, "“管理员能看到必要信息，但永远看不到密码。”", 0.72, 6.28, 7.0, 0.3, size=9.5, color=MUTED)
    tx(s, "“不承诺提分，承诺不消失；不承诺绝对安全，承诺持续加固。”", 7.78, 6.28, 4.9, 0.3, size=8.2, color=CORAL_DARK, bold=True)
    footer(s, 18)
    s.notes_slide.notes_text_frame.text = "安全页讲密码哈希、HttpOnly 会话、角色校验、输入校验；风险讲默认密码、SQLite 磁盘、XSS/CSRF、数据删除。"


# ------------------------------------------------------------------ 19 validation
def s19():
    s = sld()
    bg(s, PAPER)
    kicker(s, "18 / VALIDATION & NEXT")
    title(s, "不是“做完了”，是“跑通了”。", size=31)
    subtitle(s, "v2 已在本地完成用户/管理员双角色端到端验收，下一步是持久化部署与小样本测试。")

    checks = [
        ("注册 / 登录 / 退出", "会话写入、退出失效", MINT),
        ("三问 → 任务卡", "门槛与匹配保持", GOLD),
        ("刷新 / 换标签页", "服务端记忆恢复", BLUE_SOFT),
        ("退出再登录", "同一账号继续", MINT),
        ("用户提交建议", "进入管理员待处理", GOLD),
        ("管理员回复 / 改状态", "用户端可见", CORAL_SOFT),
        ("管理员编辑方法", "发布后用户端可见", MINT),
        ("密码哈希存储", "不存明文，登录只比对哈希", BLUE_SOFT),
    ]
    for i, (h, d, tint) in enumerate(checks):
        x = 0.72 + (i % 2) * 5.95
        y = 2.08 + (i // 2) * 0.86
        rect(s, x, y, 5.72, 0.72, fill=CREAM, line=LINE, radius=0.10)
        oval(s, x + 0.16, y + 0.22, 0.28, 0.28, fill=tint)
        tx(s, "✓", x + 0.16, y + 0.25, 0.28, 0.2, size=9, color=INK, bold=True, align=PP_ALIGN.CENTER)
        tx(s, h, x + 0.58, y + 0.12, 2.4, 0.22, size=9, bold=True)
        tx(s, d, x + 0.58, y + 0.42, 4.9, 0.2, size=7.2, color=MUTED)

    rect(s, 0.72, 5.70, 5.72, 0.62, fill=INK, line=None, radius=0.10)
    tx(s, "演示账号：demo / demo12345 · 管理员见提交说明", 0.94, 5.86, 5.2, 0.22, size=7.5, color=MINT, bold=True)
    tx(s, "测试环境：本地 Node 24 + SQLite ｜ 公网入口：部署后填入", 6.85, 5.86, 5.2, 0.22, size=7.6, color=CORAL_DARK, bold=True)

    tx(s, "下一步：部署持久化数据库 → 30 人可用性测试 → 教师/教练工作台", 0.72, 6.58, 11.8, 0.24, size=8.5, color=CORAL_DARK, bold=True)
    footer(s, 19)
    s.notes_slide.notes_text_frame.text = "验证页讲清不是 PPT 做完了，而是端到端跑通了：注册、三问、刷新、重登、建议、管理员处理、方法编辑。下一步是部署和测试。"


# ------------------------------------------------------------------ 20 closing
def s20():
    s = sld()
    bg(s, INK)
    oval(s, -2.0, -2.2, 6.0, 6.0, fill=RGBColor(0x18,0x3A,0x30))
    oval(s, 11.0, 4.2, 4.0, 4.0, fill=RGBColor(0x22,0x3C,0x33))
    kicker(s, "19 / CLOSING", color=MINT)
    tx(s, "登录一次，\n让教练记住你。", 0.78, 1.28, 10.4, 1.8, size=42, color=CREAM, bold=True, line=1.2)
    tx(s, "不是给一个更厉害的方法，而是让方法在用户的真实生活里，被记住、被验证、被调整。", 0.82, 3.30, 9.3, 0.5, size=12, color=RGBColor(0xD6,0xDF,0xD8), line=1.6)

    items = [
        ("现在", "v2 本地跑通", ["账号 / 服务端记忆", "用户 + 管理员双角色", "建议工单 / 方法发布"]),
        ("下一步", "持久化部署", ["云数据库 / 备份", "公网链接 / HTTPS", "30 人可用性测试"]),
        ("长期", "学习系统", ["教师/教练工作台", "效果追踪与对照", "方法创作者生态"]),
    ]
    for i, (head, tag, bullets) in enumerate(items):
        x = 0.78 + i * 4.02
        rect(s, x, 4.22, 3.75, 2.20, fill=RGBColor(0x1B,0x35,0x2C), line=RGBColor(0x35,0x51,0x44), radius=0.10)
        tx(s, head, x + 0.20, 4.40, 1.2, 0.28, size=12, color=(MINT if i == 0 else (GOLD if i == 1 else CORAL)), bold=True, font=SERIF)
        tx(s, tag, x + 1.52, 4.42, 1.9, 0.22, size=7.5, color=RGBColor(0xBF,0xCB,0xC3))
        for j, b in enumerate(bullets):
            tx(s, f"· {b}", x + 0.20, 4.86 + j * 0.36, 3.3, 0.26, size=8, color=RGBColor(0xD6,0xDF,0xD8), line=1.35)

    line(s, 0.78, 6.72, 12.55, 6.72, color=RGBColor(0x3A,0x55,0x49), width=0.8)
    tx(s, "不承诺提分，承诺不消失。", 0.78, 6.84, 5.0, 0.28, size=11, color=MINT, bold=True)
    tx(s, "2026.10 / V2.0", 7.70, 6.86, 4.8, 0.24, size=8, color=RGBColor(0x7E,0x8B,0x82), font=SERIF, align=PP_ALIGN.RIGHT)
    footer(s, 20, dark=True)
    s.notes_slide.notes_text_frame.text = "结尾：v2 让记忆有归属，让反馈有闭环。下一步是持久化部署和真实用户测试。不承诺提分，承诺不消失。"


def main():
    fns = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20]
    for fn in fns:
        fn()
    out = DECK_DIR / "学法实验室v2-参赛PPT.pptx"
    prs.save(out)
    print(out, "slides", len(prs.slides))


if __name__ == "__main__":
    main()
