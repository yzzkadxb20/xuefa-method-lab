# -*- coding: utf-8 -*-
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(r"D:\deepseek-harness\default-workspace\deliverables\6分钟答辩视频脚本.docx")
INK = RGBColor(0x10, 0x23, 0x1E)
CORAL = RGBColor(0xD9, 0x4E, 0x31)
MUTED = RGBColor(0x6F, 0x75, 0x6C)

doc = Document()
section = doc.sections[0]
section.page_width = Cm(21.0)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.8)
section.bottom_margin = Cm(1.6)
section.left_margin = Cm(1.9)
section.right_margin = Cm(1.9)

style = doc.styles["Normal"]
style.font.name = "Microsoft YaHei"
style.font.size = Pt(10)
style.element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
style.paragraph_format.line_spacing = 1.3
style.paragraph_format.space_after = Pt(4)


def set_run_font(run, size=10, bold=False, color=None, name="Microsoft YaHei"):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color


def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def add_heading(text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10 if level == 1 else 6)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    set_run_font(r, 14 if level == 1 else 11.5, True, INK if level == 1 else CORAL)
    return p


def add_body(text, size=10, color=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run_font(r, size, False, color or RGBColor(0x26, 0x35, 0x2F))
    return p


def add_bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    r = p.add_run(text)
    set_run_font(r, 9.5, False, RGBColor(0x26, 0x35, 0x2F))
    return p


def add_table(headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ""
        p = hdr[i].paragraphs[0]
        r = p.add_run(h)
        set_run_font(r, 8.5, True, RGBColor(0xFF, 0xFD, 0xF8))
        shade(hdr[i], "10231E")
    for ri, row in enumerate(rows):
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            r = p.add_run(str(val))
            set_run_font(r, 8.2, False, RGBColor(0x26, 0x35, 0x2F))
            if ri % 2 == 1:
                shade(cells[i], "F7F3E9")
    for row in table.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)
    return table


# header / footer
header = section.header.paragraphs[0]
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r = header.add_run("学法实验室 · 6 分钟答辩视频脚本")
set_run_font(r, 8, False, MUTED)

footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = footer.add_run("不承诺提分，承诺不消失。 · Method Lab")
set_run_font(r, 8, False, MUTED)

# cover
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(30)
r = p.add_run("学法实验室")
set_run_font(r, 30, True, INK)
p = doc.add_paragraph()
r = p.add_run("6 分钟答辩视频脚本")
set_run_font(r, 20, True, CORAL)
p = doc.add_paragraph()
r = p.add_run("不是给你一个方法，而是把方法调试到适合你。")
set_run_font(r, 11, False, MUTED)

meta = doc.add_table(rows=3, cols=2)
meta.autofit = False
meta_rows = [
    ("目标时长", "5:50–5:58（硬上限 6:00）"),
    ("规格", "1920×1080，16:9，MP4 / H.264，≤300MB"),
    ("合规", "不出现学校、姓名、指导教师、真实 API Key；模拟数据需标注"),
]
for i, (k, v) in enumerate(meta_rows):
    c0, c1 = meta.rows[i].cells
    c0.text = ""
    c1.text = ""
    r = c0.paragraphs[0].add_run(k)
    set_run_font(r, 9, True, INK)
    shade(c0, "E7F9EE")
    r = c1.paragraphs[0].add_run(v)
    set_run_font(r, 9, False, RGBColor(0x26, 0x35, 0x2F))
    c0.width = Cm(3.0)
    c1.width = Cm(14.0)

doc.add_paragraph()

add_heading("一、录制前准备", 1)
for t in [
    "启动服务：cd method-lab && npm start；浏览器打开 http://localhost:4173/?demo=gate。",
    "浏览器缩放 100%，隐藏书签栏；窗口 1440×900 或 1920×1080。",
    "使用干净的浏览器用户目录，避免旧记忆干扰；演示档案为模拟数据。",
    "录屏：OBS / Xbox Game Bar；麦克风先试录 10 秒，BGM 音量 ≤ -28dB。",
    "全程建议上中文字幕；专有名词保留英文，如 Method Lab、Shadowing。",
]:
    add_bullet(t)

add_heading("二、分镜与旁白", 1)
rows = [
    ("0:00–0:05", "黑底一句话，0:03 切入首屏", "你收藏了一百种学习方法，但今天晚上，还是不知道先做哪一个。", "收藏了 100 种方法，今晚先做哪一个？"),
    ("0:05–0:15", "首屏，鼠标停在“先回答 3 个问题”", "问题不是方法不够多，而是：没有起点，没有反馈，也没有人为结果负责。", "方法过载 / 无法验证 / 无人负责"),
    ("0:15–0:25", "镜头拉近品牌与三问卡片", "我们做了一个不一样的学习智能体——学法实验室。", "学法实验室 · Method Lab"),
    ("0:25–0:45", "依次高亮三个问题", "它不急着推荐。它先问你三个问题：你具体要解决什么？你的真实起点是什么？你每天能投入多少时间、在什么环境？", "目标与期限 / 当前起点 / 时间与环境"),
    ("0:45–1:00", "输入“直接给我方案，别问那么多”；出现拒绝回复", "三个问题没答完，它不会给最终方案。你甚至可以故意要它直接给方案——它会拒绝。", "“还差第 1 问，我先不给你方案。”"),
    ("1:00–1:10", "镜头停在“硬门槛”与状态机示意", "这不是提示词，是状态机。因为负责，不能靠模型自觉。", "不是提示词，是状态机"),
    ("1:10–1:30", "依次输入三问答案；出现学情判断卡", "答完之后，它先做学情判断：目标清晰度、当前起点、主要风险、匹配准备度。", "学情判断 · 76/100"),
    ("1:30–1:55", "滚动到方法卡，停在证据/时间/换法条件", "然后只推一个主方法，和两个备选。每个方法都有证据等级、时间成本、成功指标、失败模式，以及——什么时候该换。", "主方法 + 2 个备选 / 可解释 · 可退出"),
    ("1:55–2:10", "滚动到任务卡，依次指 3 个任务", "今天不让你学一整天，只给你一张任务卡：三件事，二十五分钟，每件事都有可检查的产出。", "3 件事 / 25 分钟 / 可验收"),
    ("2:10–2:25", "完成打卡：85 / 难度 5 / 自测 48 / 卡点", "晚上，你点完成打卡，反馈四件事：完成度、难度、自测分、今天最卡的地方。", "完成度 / 难度 / 自测 / 卡点"),
    ("2:25–2:45", "提交；出现今日总结，停在 61 分与“认知过载”", "系统会算出效果分。完成率低，先降门槛；完成率高但自测低，才换方法；难度太高，换更轻的。", "效果分 61 · 触发换法"),
    ("2:45–3:05", "滚动到换法建议与新任务卡", "比如这个用户：影子跟读三天，完成率不低，但自测一直上不去。系统没有让他再坚持一下，而是换成语块串联，并把明天的任务重新排好。", "影子跟读 → 语块串联"),
    ("3:05–3:20", "镜头停在“不是失败，是调试”", "注意，换法不是失败，是控制变量。旧方法不是没用，只是不适合现在的他。", "换法不是失败，是控制变量"),
    ("3:20–3:40", "点“我的记忆”，展示时间线与试验表", "这些反馈会进入记忆：用户档案、方法试验、每日反馈、洞察规则。第二天再进来，它记得你走过哪条弯路。", "记忆不是聊天记录，是决策变量"),
    ("3:40–4:00", "切学习报告，展示完成率/效果曲线", "它也记得你适合什么：有人需要真题逆向，有人需要先做概念图；有人上台紧张，有人底妆卡粉。", "用反馈，而不是感觉，判断效果"),
    ("4:00–4:25", "切方法库，滚过审计、口头表达、化妆", "所以它不局限在语文数学英语。审计期末、英文面试、课堂展示、通勤妆，背后是同一套能力坐标：记忆、理解、解题、输出、实操、审美、元认知。", "43 张卡 / 9 个领域"),
    ("4:25–4:45", "打开方法卡详情，高亮模板/练习/评估", "方法库现在有 43 张方法卡，9 个领域，每张卡至少配 3 件套资料：模板、练习、评估。资料不是链接堆，而是为了验证这个方法。", "资料三件套：模板 / 练习 / 评估"),
    ("4:45–5:05", "切 PPT 架构页或回到状态 pill", "技术上，我们把边界做在规则引擎里：三问、匹配、换法都是确定性的；大模型只负责把理由讲清楚。这样它不会聊着聊着，忘了原则。", "规则引擎保底 · LLM 增强表达"),
    ("5:05–5:25", "切 PPT 数据来源页", "数据来自三类：学习科学文献、专业训练体系、公开方法内容。每张卡都有来源和证据等级，A 是实验支持，C 是实践者经验，需要微试验验证。", "A / B / C 证据分级"),
    ("5:25–5:35", "切 PPT 风险页", "隐私上，本地优先，可导出、可删除，不训练用户数据。我们也不承诺提分。", "本地优先 · 可删除 · 不训练"),
    ("5:35–5:45", "回到今日总结/明日内容", "我们承诺的是：每一次反馈都有回应；效果不好就换法；明天学什么，今晚就排好。", "每次反馈都有回应"),
    ("5:45–5:55", "收束到首屏/品牌", "学法实验室，让每个用户，都有一个懂自己的学习教练。", "懂自己的学习教练"),
    ("5:55–6:00", "黑底一句话", "不承诺提分，承诺不消失。", "不承诺提分，承诺不消失。"),
]
add_table(["时间", "画面 / 操作", "旁白", "屏幕文字"], rows, [1.5, 5.0, 8.2, 3.3])

doc.add_page_break()
add_heading("三、旁白完整版（可直接照着念）", 1)
narration = [
    "你收藏了一百种学习方法，但今天晚上，还是不知道先做哪一个。",
    "问题不是方法不够多，而是：没有起点，没有反馈，也没有人为结果负责。",
    "我们做了一个不一样的学习智能体——学法实验室。",
    "它不急着推荐。它先问你三个问题：你具体要解决什么？你的真实起点是什么？你每天能投入多少时间、在什么环境？",
    "三个问题没答完，它不会给最终方案。你甚至可以故意要它直接给方案——它会拒绝。",
    "这不是提示词，是状态机。因为负责，不能靠模型自觉。",
    "答完之后，它先做学情判断：目标清晰度、当前起点、主要风险、匹配准备度。",
    "然后只推一个主方法，和两个备选。每个方法都有证据等级、时间成本、成功指标、失败模式，以及——什么时候该换。",
    "今天不让你学一整天，只给你一张任务卡：三件事，二十五分钟，每件事都有可检查的产出。",
    "晚上，你点完成打卡，反馈四件事：完成度、难度、自测分、今天最卡的地方。",
    "系统会算出效果分。完成率低，先降门槛；完成率高但自测低，才换方法；难度太高，换更轻的。",
    "比如这个用户：影子跟读三天，完成率不低，但自测一直上不去。系统没有让他再坚持一下，而是换成语块串联，并把明天的任务重新排好。",
    "注意，换法不是失败，是控制变量。旧方法不是没用，只是不适合现在的他。",
    "这些反馈会进入记忆：用户档案、方法试验、每日反馈、洞察规则。第二天再进来，它记得你走过哪条弯路。",
    "它也记得你适合什么：有人需要真题逆向，有人需要先做概念图；有人上台紧张，有人底妆卡粉。",
    "所以它不局限在语文数学英语。审计期末、英文面试、课堂展示、通勤妆，背后是同一套能力坐标：记忆、理解、解题、输出、实操、审美、元认知。",
    "方法库现在有 43 张方法卡，9 个领域，每张卡至少配 3 件套资料：模板、练习、评估。资料不是链接堆，而是为了验证这个方法。",
    "技术上，我们把边界做在规则引擎里：三问、匹配、换法都是确定性的；大模型只负责把理由讲清楚。这样它不会聊着聊着，忘了原则。",
    "数据来自三类：学习科学文献、专业训练体系、公开方法内容。每张卡都有来源和证据等级，A 是实验支持，C 是实践者经验，需要微试验验证。",
    "隐私上，本地优先，可导出、可删除，不训练用户数据。我们也不承诺提分。",
    "我们承诺的是：每一次反馈都有回应；效果不好就换法；明天学什么，今晚就排好。",
    "学法实验室，让每个用户，都有一个懂自己的学习教练。",
    "不承诺提分，承诺不消失。",
]
for i, line in enumerate(narration, 1):
    p = doc.add_paragraph()
    r = p.add_run(f"{i:02d}  {line}")
    set_run_font(r, 10, False, RGBColor(0x26, 0x35, 0x2F))
    p.paragraph_format.space_after = Pt(5)

add_heading("四、剪辑与交付", 1)
for t in [
    "总时长控制在 5:50–5:58，不要卡 6:00。",
    "开头 3 秒必须有钩子；不要放长 Logo 动画。",
    "字幕全程；关键句放大，如“不是提示词，是状态机”“换法不是失败，是控制变量”。",
    "BGM 用轻鼓点/Lo-fi，音量低；旁白优先。",
    "演示操作可 1.5×，但不要跳过“拒绝给方案”的镜头。",
    "导出：H.264，1080p，8–12 Mbps，AAC 192kbps，MP4，≤300MB。",
    "视频画面内不要出现学校/姓名；文件名按赛事要求命名。",
]:
    add_bullet(t)

add_heading("五、录制备忘", 1)
for t in [
    "三问拒绝镜头录到了",
    "三问完成 → 学情判断 → 方法卡 → 任务卡 链路完整",
    "反馈提交 → 今日总结 → 换法 → 新任务卡 链路完整",
    "记忆时间线 / 学习报告 至少各 3 秒",
    "方法库出现审计、口头表达、化妆三个领域",
    "没有学校、姓名、教师、真实 API Key",
    "结尾有“不承诺提分，承诺不消失”",
]:
    add_bullet(t)

doc.save(OUT)
print(OUT)
