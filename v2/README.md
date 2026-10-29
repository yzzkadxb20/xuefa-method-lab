# 学法实验室 v2 · 全栈版

> 登录一次，让教练记住你。

v2 从纯前端 Demo 升级为 **Node + SQLite 全栈应用**：

- 用户注册 / 登录 / 退出
- 学习状态保存在服务端，换设备登录仍能继续
- 用户 / 管理员双角色
- 用户提交问题与方法建议，管理员处理、回复、改状态
- 管理员编辑方法库并发布，用户端刷新可见
- 三问硬门槛、方法匹配、每日反馈、换法机制保留

旧 v1 静态版仍保留，不影响现有公网 Demo。

---

## 1. 运行

要求：Node.js ≥ 22.5（使用内置 `node:sqlite`，无需安装依赖）。

```bash
cd method-lab-pro
npm start
```

打开 <http://localhost:4180/login.html>。

### 演示账号（本地）

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 用户 | `demo` | `demo12345` |
| 管理员 | `admin` | `admin12345` |

> 部署前务必改 `ADMIN_PASSWORD`；演示账号仅用于本地评审。

### 重置演示数据

```bash
# 停止服务后
rm data/methodlab.db*
npm start
node scripts/seed-demo.mjs
```

Windows PowerShell：

```powershell
Get-ChildItem .\data\methodlab.db* | Remove-Item -Force
npm start
node scripts/seed-demo.mjs
```

---

## 2. 目录

```
method-lab-pro/
├─ server.mjs                 # Node HTTP + node:sqlite + 会话 + 角色 + API
├─ public/
│  ├─ login.html / login.css / js/login.js
│  ├─ index.html / styles.css / js/app.js   # 用户端
│  ├─ admin.html / admin.css / js/admin.js  # 管理员后台
│  ├─ js/api.js / js/engine.js
│  └─ data/methods.json
├─ scripts/
│  ├─ seed-demo.mjs           # demo 用户 + 建议
│  ├─ e2e.mjs                 # 用户/管理员端到端测试
│  └─ capture-v2.mjs          # 截图
├─ data/                      # SQLite（运行时生成；不进 Git）
├─ .env.example
└─ package.json
```

---

## 3. 数据模型

| 表 | 作用 |
| --- | --- |
| `users` | id / username / password_hash / role / created_at |
| `sessions` | token_hash / user_id / expires_at |
| `user_states` | user_id / state_json / updated_at |
| `suggestions` | 用户问题/方法建议、状态、管理员回复 |
| `methods` | 方法卡 JSON、published、updated_by |

`user_states.state_json` 保存：

- 三问答案、学情判断、匹配结果、当前方法
- 今日任务卡
- 每日日志（完成率/难度/自测/效果分）
- 方法试验记录
- 聊天消息与视图状态

浏览器 `localStorage` 只做缓存，**服务端是源数据**。

---

## 4. API 摘要

### 认证

- `POST /api/auth/register` `{username,password}`
- `POST /api/auth/login` `{username,password}`
- `POST /api/auth/logout`
- `GET /api/me`

### 用户

- `GET /api/state` / `PUT /api/state` `{state}`
- `GET /api/methods`（只返回已发布）
- `GET /api/suggestions` / `POST /api/suggestions`

### 管理员

- `GET /api/admin/stats`
- `GET /api/admin/suggestions?status=...`
- `PATCH /api/admin/suggestions/:id` `{status,admin_reply}`
- `GET /api/admin/users`
- `GET /api/admin/methods`
- `POST /api/admin/methods` `{method,published}`（创建/覆盖）
- `PATCH /api/admin/methods/:id` `{method,published}`

所有 `/api/admin/*` 都执行 `role=admin` 校验。

---

## 5. 安全设计

- 密码：`scrypt` + 16 字节随机 salt，数据库只存 `salt:hash`。
- 会话：32 字节随机 token，数据库存 SHA-256；Cookie `HttpOnly; SameSite=Lax`，7 天过期。
- 退出：删除会话记录，Cookie 过期。
- 角色：管理员 API 逐条校验，不依赖前端隐藏按钮。
- 输入：用户名正则、密码长度、标题/内容长度、状态枚举、方法字段白名单。
- 同源：非 GET 请求校验 Origin，防跨站写操作。
- 管理端不返回密码字段；用户数据只按 user_id 读取。

> 仍需注意：默认管理员密码、SQLite 单机磁盘、HTTPS、备份。生产环境必须改密码并启用 HTTPS。

---

## 6. 部署

v2 需要 Node 运行时与持久化数据库，**不能直接拖到 Netlify 静态托管**。

### Render / Railway / VPS（推荐）

环境变量：

```bash
NODE_ENV=production
PORT=4180
DB_PATH=/data/methodlab.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=换成强密码
SESSION_DAYS=7
COOKIE_SECURE=1
```

要求：

- 持久化磁盘挂载到 `/data`（SQLite）
- HTTPS
- 定期备份 `methodlab.db`
- 或把 SQLite 换成 Postgres（后续）

`render.yaml` 示例见仓库；Render 的持久化磁盘可能需要付费计划。

### 本地演示

```bash
npm start
```

---

## 7. 测试

```bash
# 需要本机 Edge
node scripts/e2e.mjs
```

覆盖：

- 注册 → 三问 → 任务卡
- 刷新 → 服务端记忆恢复
- 退出 → 再登录 → 继续
- 提交建议 → 管理员处理
- 管理员编辑方法 → 保存/发布
- 控制台无报错

---

## 8. 已知边界

- 当前是 SQLite 单机版，适合比赛演示与小规模测试；生产建议 Postgres。
- 没有邮箱/短信找回密码；比赛演示可接受，生产需补。
- 没有邮箱验证与邀请机制；公开注册需加限流/验证码。
- 管理员默认密码只用于本地；部署前必须改。
- v2 的公网链接尚未部署；旧 v1 静态链接仍可用。

---

## 9. 一句话

**不承诺提分，承诺不消失。**
