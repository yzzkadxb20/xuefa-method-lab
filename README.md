# 学法实验室 · Method Lab

> 不是给你一个方法，而是把方法调试到适合你。

一个带**三问硬门槛、方法微试验、每日反馈闭环、长期记忆与换法机制**的学习教练智能体原型。

**公网体验**：<https://roaring-pixie-05f195.netlify.app/?demo=gate>  
**演示账号**：体验用户 / 无需密码

---

## 1. 这是什么

用户先回答 3 个问题（目标与期限 / 当前起点 / 时间与环境），系统才会进入诊断与匹配。之后每天输出：

1. **学情判断**：缺什么、风险是什么、准备度多少
2. **方法匹配**：1 个主方法 + 2 个备选，带证据等级与换法条件
3. **今日任务卡**：3 件可执行、可检查的事
4. **完成打卡**：完成度 / 难度 / 自测 / 状态 / 卡点
5. **今日总结**：有效保留、无效换法
6. **次日内容**：自动排好，进入下一轮

记忆不是聊天记录，而是下一次决策的变量：用户档案、方法试验、每日反馈、洞察规则。

---

## 2. 快速运行

要求：Node.js ≥ 20。

```bash
cd method-lab
npm start
```

打开 <http://localhost:4173>。

### 演示入口

| 场景 | 链接 |
| --- | --- |
| 从三问开始（推荐给评审） | `http://localhost:4173/?demo=gate` |
| 英语口语 · 已答完三问 | `http://localhost:4173/?demo=plan&scenario=english` |
| 英语口语 · 换法总结 | `http://localhost:4173/?demo=summary&scenario=english` |
| 英语口语 · 记忆时间线 | `http://localhost:4173/?demo=memory&scenario=english` |
| 英语口语 · 学习报告 | `http://localhost:4173/?demo=report&scenario=english` |
| 方法库 | `http://localhost:4173/?demo=library` |
| 审计期末 | `http://localhost:4173/?demo=plan&scenario=audit` |
| 课堂展示 | `http://localhost:4173/?demo=plan&scenario=speech` |
| 通勤妆 | `http://localhost:4173/?demo=plan&scenario=makeup` |

演示档案是**模拟数据**，用于展示记忆与换法逻辑，不是真实用户数据。

---

## 3. 单文件部署（最快拿公网链接）

```bash
npm run build:standalone
```

生成：`dist/index.html`（约 182 KB，CSS/JS/方法库全部内联）。

### 方案 A：Netlify Drop（约 2 分钟，无需写代码）

1. 打开 <https://app.netlify.com/drop>
2. 把 `dist` 文件夹（或 `dist/index.html`）拖进去
3. 得到一个 `https://xxx.netlify.app` 链接
4. 用无痕窗口打开，确认可用
5. 把链接填进 PPT 第 19 页，并替换掉「提交前替换为公网链接」

> 静态版使用本地教练引擎，**不需要 API Key**；三问、匹配、任务、反馈、换法、记忆都可以演示。AI 增强需要 Node 服务版。

### 方案 B：GitHub Pages

1. 新建一个仓库
2. 上传 `dist/index.html`（或 `dist` 目录内容）
3. Settings → Pages → Source 选择分支根目录
4. 得到 `https://<username>.github.io/<repo>/` 链接

### 方案 C：Render（带 AI 增强）

仓库已包含 `render.yaml`。在 Render 里新建 Blueprint，设置 `DEEPSEEK_API_KEY`，部署后即可使用 `/api/coach`。不配置 Key 也能运行，只是顶部显示「本地教练引擎」。

---

## 4. 可选：接入大模型

服务端读取环境变量：

```bash
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
npm start
```

启动后右上角状态 pill 会变为「AI 增强」；点击可切换。规则边界（三问、匹配、换法）始终由本地状态机保证，LLM 只增强语言表达。

**不要把 API Key 写进前端或提交到仓库。**

---

## 5. 目录结构

```
method-lab/
├─ public/
│  ├─ index.html              # 前端入口
│  ├─ styles.css              # 视觉
│  ├─ js/engine.js            # 规则引擎：诊断/匹配/任务/效果判定
│  ├─ js/app.js               # 状态机、渲染、交互、记忆
│  └─ data/methods.json       # 43 张方法卡（9 领域）
├─ server.mjs                 # 静态服务 + 可选 LLM 代理
├─ scripts/
│  ├─ build-standalone.mjs    # 单文件构建
│  ├─ cdp-test.mjs            # 端到端浏览器测试
│  └─ cdp-errors.mjs          # 静态版报错检查
├─ dist/index.html            # 可直接部署的单文件
├─ render.yaml                # Render 部署模板
└─ package.json
```

---

## 6. 核心规则（可复现）

### 三问硬门槛

状态：`WAITING_Q1 → Q2 → Q3 → READY`。

- 未答完 3 问，输入「直接给我方案」会被拒绝，并回到当前问题。
- 门槛由 `state.gate.complete` 控制，不靠模型自觉。

### 匹配

```
Fit = 0.35 × Goal + 0.25 × Time + 0.20 × Evidence + 0.20 × History − Friction
```

然后 3 天微试验；不达标就换法。

### 反馈与换法

效果分：

```
effect = 0.4 × 完成率 + 0.3 × 自测
       + 0.2 × (100 − (难度−1)×20)
       + 0.1 × 状态分
```

判定：

- 完成率 < 60% → 执行阻力，先降门槛，不换法
- 完成率高 + 自测 < 60% → 方法不匹配，换法
- 难度 5/5 + 效果 < 65 → 认知过载，换更轻的方法
- 完成率高 + 自测高 → 保留方法，只加一个变量

---

## 7. 数据与隐私

- 方法库为结构化原创整理，来源见每张卡的 `source` 字段。
- 证据等级：A（多项实验/元分析）、B（单项研究/专业共识）、C（实践者经验，需微试验验证）。
- 原型默认把学习记录存在浏览器 `localStorage`。
- 支持导出 JSON、清空记忆；不训练用户数据。
- 演示数据为内置模拟数据，已在界面与 PPT 中标注。

---

## 8. 测试

```bash
# 本地服务端版本
npm start
# 另开终端，运行端到端测试（需要本机 Edge）
node scripts/cdp-test.mjs

# 静态版
npm run build:standalone
# 用任意静态服务器打开 dist，然后：
TEST_BASE=http://127.0.0.1:4174 node scripts/cdp-test.mjs
```

测试覆盖：三问拒绝、三问完成、任务卡生成、反馈提交、换法触发、记忆/报告视图。

---

## 9. 提交前必须做

- [x] 把 `dist` 部署到公网，拿到可访问链接：<https://roaring-pixie-05f195.netlify.app/>
- [x] 用无痕窗口验证：三问、任务卡、反馈、换法、记忆
- [x] 把链接填进 PPT 第 19 页
- [ ] PPT ≤ 20 页、16:9、≤ 50MB
- [ ] 视频 ≤ 6 分钟、MP4、≤ 300MB
- [ ] 全片/全 PPT 不出现学校、姓名、指导教师
- [ ] 准备演示账号（当前原型无需密码，填「体验用户 / 无需密码」）
- [ ] 若使用 AI 增强，确认 API Key 不在前端、不在视频里

---

## 10. 公开链接与版权

- 公网链接是公开的：任何人拿到链接都能打开，这是比赛“可访问性”的要求。
- 当前静态版**没有后端、没有数据库、没有 API Key**；访客数据只存在各自浏览器。
- 已加入 `noindex,nofollow`、`robots.txt` 与版权 meta；部署后搜索引擎不会主动收录。
- 公开网页无法阻止别人查看/复制前端代码，但可以保留创作证据：
  - `deliverables/作品指纹.txt`（SHA-256）
  - PPT/PDF/DOCX 的创建与修改时间
  - 源码、设计稿、提交记录
- 如需更强访问控制，可在 Netlify 的 Access control / Visitor access 中设置站点密码，并把密码填进赛事要求的“账号和密码”栏；不要用前端 JS 假密码，那可以被绕过。

## 11. 本机 Git 记录

本机已初始化 Git 仓库，并推送到了本地 bare 远程备份：

```bash
cd method-lab
git log --oneline --decorate
```

- 提交：`622c494`（`chore: submission snapshot for 学法实验室 v1.0`）
- 标签：`v1.0-submission`
- 导出日志：`deliverables/git-log.txt`
- 可恢复仓库包：`deliverables/method-lab.bundle`
- 本地 bare 远程：`D:\deepseek-harness\default-workspace\git-backup\method-lab.git`（remote 名 `backup`）
- 远程记录：`deliverables/git-remotes.txt`

> 已推送到 GitHub 私有仓库：`git@github.com:yzzkadxb20/xuefa-method-lab.git`（`main` + `v1.0-submission`）。本地 bare 仓库 `backup` 仍保留，Gitee 可作为备用异地备份。

从 bundle 恢复：

```bash
git clone method-lab.bundle method-lab-restored
```

> Git 只在本机，commit 时间可作辅助创作时间线，不等同于第三方公证；比赛提交回执更重要。

## 12. 一句话

**不承诺提分，承诺不消失。**
