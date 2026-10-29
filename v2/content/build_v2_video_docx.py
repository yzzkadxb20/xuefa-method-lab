# -*- coding: utf-8 -*-
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(r"D:\deepseek-harness\default-workspace\deliverables-v2\6分钟答辩视频脚本-v2.docx")
INK = RGBColor(0x10, 0x23, 0x1E)
CORAL = RGBColor(0xD9, 0x4E, 0x31)
MUTED = RGBColor(0x6F, 0x75, 0x6C)

doc = Document()
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.top_margin = Cm(1.7)
sec.bottom_margin = Cm(1.5)
sec.left_margin = Cm(1.8)
sec.right_margin = Cm(1.8)

style = doc.styles["Normal"]
style.font.name = "Microsoft YaHei"
style.font.size = Pt(10)
style.element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
style.paragraph_format.line_spacing = 1.3
style.paragraph_format.space_after = Pt(4)


def rf(run, size=10, bold=False, color=None):
    run.font.name = "Microsoft YaHei"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color or RGBColor(0x26, 0x35, 0x2F)


def h(text, size=14):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(4)
    rf(p.add_run(text), size, True, INK)


def body(text, size=10):
    p = doc.add_paragraph()
    rf(p.add_run(text), size, False, RGBColor(0x26, 0x35, 0x2F))


def bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    rf(p.add_run(text), 9.5)


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color)
    tcPr.append(shd)


def table(headers, rows, widths):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, htext in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ""
        rf(c.paragraphs[0].add_run(htext), 8.5, True, RGBColor(0xFF, 0xFD, 0xF8))
        shade(c, "10231E")
    for ri, row in enumerate(rows):
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            rf(cells[i].paragraphs[0].add_run(str(val)), 7.8)
            if ri % 2 == 1:
                shade(cells[i], "F7F3E9")
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)


# header/footer
hp = sec.header.paragraphs[0]
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
rf(hp.add_run("学法实验室 v2 · 6 分钟答辩视频脚本"), 8, False, MUTED)
fp = sec.footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
rf(fp.add_run("不承诺提分，承诺不消失。 · Method Lab"), 8, False, MUTED)

# cover
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(24)
rf(p.add_run("学法实验室 v2"), 30, True, INK)
p = doc.add_paragraph()
rf(p.add_run("6 分钟答辩视频脚本"), 19, True, CORAL)
p = doc.add_paragraph()
rf(p.add_run("登录一次，让教练记住你。"), 11, False, MUTED)

meta = [
    ("目标时长", "5:50–5:58（硬上限 6:00）"),
    ("规格", "1920×1080，16:9，MP4 / H.264，≤300MB"),
    ("演示账号", "用户 demo / demo12345；管理员 admin / admin12345（本地）"),
]
t = doc.add_table(rows=len(meta), cols=2)
t.autofit = False
for i, (k, v) in enumerate(meta):
    c0, c1 = t.rows[i].cells
    c0.text = ""
    c1.text = ""
    rf(c0.paragraphs[0].add_run(k), 9, True, INK)
    shade(c0, "E7F9EE")
    rf(c1.paragraphs[0].add_run(v), 9)
    c0.width = Cm(3.0)
    c1.width = Cm(14.2)
doc.add_paragraph()

h("一、录制前准备")
for x in [
    "启动 v2：cd method-lab-pro && npm start；打开 http://localhost:4180/login.html。",
    "浏览器缩放 100%，隐藏书签栏；窗口 1440×900 或 1920×1080。",
    "先用 demo / demo12345 登录，确认第 7 天任务卡与记忆；另开无痕窗口验证 admin 后台。",
    "录屏 OBS / Xbox Game Bar；麦克风先试录 10 秒；BGM ≤ -28dB。",
    "全程建议上中文字幕；画面内不要出现学校、姓名、真实密码。",
]:
    bullet(x)

h("二、分镜与旁白")
rows = [
    ("0:00–0:12", "黑底一句话，切入旧版/浏览器", "你收藏了一百种学习方法，但换一台设备，教练就把你忘了。", "换一台设备，它还认识你吗？"),
    ("0:12–0:30", "展示 v1 localStorage 局限", "纯前端 Demo 的“记忆”，只存在这台浏览器：换设备、清缓存、换浏览器，目标、方法、反馈全部归零。", "localStorage ≠ 用户记忆"),
    ("0:30–0:48", "切到 v2 登录页", "所以我们做了 v2：先登录，再开始。账号不是多一步，是让记忆有归属。", "登录一次，让教练记住你"),
    ("0:48–1:15", "demo 登录，出现任务卡", "登录后，它直接回到第 7 天：昨天的方法、今天的任务、过去的反馈，都在。", "同一账号 · 跨设备记忆"),
    ("1:15–1:40", "点“我的记忆”，展示 6 次反馈/换法", "这些不是聊天记录，是服务端用户状态：目标、方法试验、每日反馈、洞察规则。", "服务端 user_state"),
    ("1:40–2:05", "点“今日教练”，滚动到三问卡", "账号解决“记得你”，三问解决“从哪开始”。目标、起点、时间与环境，答完才进入匹配。", "三问硬门槛"),
    ("2:05–2:35", "展示方法卡 / 任务卡", "然后只推一个主方法，配一张今天能执行、晚上能验收的任务卡：三件事、25 分钟。", "3 件事 / 25 分钟"),
    ("2:35–3:10", "完成打卡：85 / 难度 5 / 自测 48 / 卡点", "晚上反馈四件事：完成度、难度、自测、卡点。完成率高但自测低，系统判断：不是再坚持，而是方法不匹配。", "效果分 → 换法"),
    ("3:10–3:40", "展示今日总结、换法建议、新任务卡", "换法不是失败，是控制变量；旧方法不是没用，只是不适合现在的你。明日内容已经排好。", "影子跟读 → 语块串联"),
    ("3:40–4:05", "点“提建议/报错”，提交一条方法建议", "用户还可以把系统里没有的方法、使用卡点直接提交，进入管理员工单。", "用户提交建议"),
    ("4:05–4:35", "退出，admin 登录；管理后台工单", "管理员登录后，看到待处理、处理中、已解决；点开一条，写回复、改状态。", "管理员工单"),
    ("4:35–5:05", "方法库 → 编辑一张卡 → 保存并发布", "管理员还能编辑方法库：草稿不会进入匹配，发布后用户端刷新可见。内容能迭代，但不绕过证据与边界。", "编辑 → 发布"),
    ("5:05–5:30", "用户概况：账号/最近同步/建议数", "管理员只看必要信息，不显示密码；每个管理 API 都校验角色。", "角色隔离"),
    ("5:30–5:48", "切 PPT 安全页/架构页", "密码 scrypt 加盐，会话 HttpOnly，跨站写操作校验 Origin；SQLite 先跑通闭环，部署时换持久化磁盘或 Postgres。", "密码哈希 / 会话 / 角色"),
    ("5:48–5:58", "回到登录页/品牌", "学法实验室 v2：登录一次，让教练记住你。", "不承诺提分，承诺不消失。"),
]
table(["时间", "画面 / 操作", "旁白", "屏幕文字"], rows, [1.4, 5.0, 8.8, 3.0])

doc.add_page_break()
h("三、旁白完整版（可直接照着念）")
narration = [
    "你收藏了一百种学习方法，但换一台设备，教练就把你忘了。",
    "纯前端 Demo 的“记忆”，只存在这台浏览器：换设备、清缓存、换浏览器，目标、方法、反馈全部归零。",
    "所以我们做了 v2：先登录，再开始。账号不是多一步，是让记忆有归属。",
    "登录后，它直接回到第 7 天：昨天的方法、今天的任务、过去的反馈，都在。",
    "这些不是聊天记录，是服务端用户状态：目标、方法试验、每日反馈、洞察规则。换一台电脑登录，读的是同一份。",
    "账号解决“记得你”，三问解决“从哪开始”。目标、起点、时间与环境，三个问题没答完，不进入匹配。",
    "然后只推一个主方法，配一张今天能执行、晚上能验收的任务卡：三件事、25 分钟、每件事都有可检查产出。",
    "晚上反馈四件事：完成度、难度、自测、卡点。完成率高但自测低，系统会判断：不是再坚持，而是方法不匹配。",
    "换法不是失败，是控制变量；旧方法不是没用，只是不适合现在的你。明日内容已经排好。",
    "用户还可以把系统里没有的方法、使用卡点直接提交，进入管理员工单。",
    "管理员登录后，看到待处理、处理中、已解决；点开一条，写回复、改状态。",
    "管理员还能编辑方法库：草稿不会进入匹配，发布后用户端刷新可见。内容能迭代，但不绕过证据与边界。",
    "管理员只看必要信息，不显示密码；每个管理 API 都校验角色。",
    "密码 scrypt 加盐，会话 HttpOnly，跨站写操作校验 Origin；SQLite 先跑通闭环，部署时换持久化磁盘或 Postgres。",
    "学法实验室 v2：登录一次，让教练记住你。",
    "不承诺提分，承诺不消失。",
]
for i, line in enumerate(narration, 1):
    p = doc.add_paragraph()
    rf(p.add_run(f"{i:02d}  {line}"), 10)
    p.paragraph_format.space_after = Pt(5)

h("四、剪辑与交付")
for x in [
    "总时长 5:50–5:58，不要卡 6:00。",
    "字幕全程；关键句放大：“localStorage ≠ 用户记忆”“换法不是失败，是控制变量”。",
    "登录/输入可加速，但“三问拒绝”“反馈换法”“管理员处理”三个镜头不要跳过。",
    "导出：H.264，1080p，8–12 Mbps，AAC 192kbps，MP4，≤300MB。",
    "画面内不要出现学校/姓名/真实密码。",
]:
    bullet(x)

h("五、录制备忘")
for x in [
    "登录页 + demo 登录",
    "第 7 天任务卡 + 我的记忆",
    "三问门槛 / 方法卡 / 今日任务",
    "完成打卡 → 今日总结 → 换法",
    "用户提交建议 + 管理员处理",
    "管理员编辑方法并发布",
    "安全/架构页 + 结尾“不承诺提分，承诺不消失”",
]:
    bullet(x)

doc.save(OUT)
print(OUT)
