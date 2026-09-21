# GitHub 令牌管理（Cloudflare Worker 同源自托管）

单人自用的网页版 GitHub 个人访问令牌（PAT）管理器。

- **架构（方案 A，同源自托管）**：前端页面和所有接口都由同一个 Cloudflare Worker 提供，前后端同一域名，**没有跨域、没有预检、没有 GitHub Pages 部署/404 问题**。
- **密钥安全**：GitHub PAT 只存在 Worker 环境变量 `GITHUB_TOKEN`，前端通过页面登录后，用临时 token 提交新 PAT；原始 PAT 全程不经过前端浏览器明文返回。
- 仓库的 GitHub Token（`ghp_...`）仅用于本仓库代码推送，**与本系统管理的"GitHub PAT"是两回事**，请区分清楚。

---

## 一、架构

```
浏览器  ──►  https://traemy.fuyi.workers.dev/        （Worker 返回前端页面）
              │  POST /api/login       账号 + 密码 → token
              │  GET  /api/get-token   token → 脱敏预览（ghp_****abcd）
              │  POST /api/update-key  token + 新 PAT → 更新环境变量
              ▼
          Cloudflare Workers（traemy）
              │  通过 Cloudflare API 写回自身环境变量 GITHUB_TOKEN
```

---

## 二、仓库结构

```
sjkglxt/
├── index.html        # 前端页面（源码，登录页 + 令牌管理）
├── worker/
│   └── index.js      # 后端代码（内嵌了 index.html，部署用这一个文件即可）
├── README.md
└── AGENTS.md
```

**注意**：`worker/index.js` 是**构建产物**，它把 `index.html` 通过 `JSON.stringify` 安全内嵌成一个 `FRONTEND_HTML` 常量。改前端后需重新生成一次（见第五节）。

---

## 三、Cloudflare Workers 部署教程

### 1. 创建 Worker
1. 进入 https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Create Worker**
2. 名称填 `traemy`（或任意名）→ **Deploy**
3. 部署后得到域名，如 `https://traemy.fuyi.workers.dev`

### 2. 粘贴代码
1. 进入该 Worker → **Edit code**
2. 把本仓库 `worker/index.js` **全部内容**覆盖粘贴进编辑器
3. 右上角 **Save and deploy**

### 3. 配置环境变量（关键）
Worker 详情页 → **Settings** → **Variables and Secrets**，添加：

| 变量名 | 说明 | Type |
|--------|------|------|
| `USER_NAME` | 登录账号（如 `admin`） | Text |
| `USER_PASS` | 登录密码（自定义强密码） | **Secret** |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID（Dashboard 首页右侧栏可见） | **Secret** |
| `CF_WORKER_NAME` | Worker 脚本名（如 `traemy`） | Text |
| `CF_API_TOKEN` | Cloudflare API Token，权限需含 **Workers Scripts: Edit** | **Secret** |
| `GITHUB_TOKEN` | 初始 GitHub PAT（可留空，之后通过网页更新） | **Secret** |

> `GITHUB_TOKEN` 初始可以为空，登录网页后用它自己更新也行。
> 前 5 项缺一，则网页更新只写进 Worker 内存（重启丢失，返回黄色提示），无法持久化。

### 4. 验证
浏览器访问 `https://traemy.fuyi.workers.dev/health` → 返回 `{"ok":true}`；
访问 `https://traemy.fuyi.workers.dev/` → 显示登录页。

---

## 四、使用说明

1. 打开 `https://traemy.fuyi.workers.dev/`（网页由 Worker 自己托管，无需 GitHub Pages）
2. 输入 `USER_NAME` / `USER_PASS` 登录
3. 主页显示「当前令牌」的脱敏预览（前4位 + **** + 后4位）
4. 输入新的 GitHub PAT → **提交更新**
   - 🟢 绿色：已持久化到环境变量，重启仍有效
   - 🟡 黄色：仅内存生效（CF_* 变量没配齐或 Token 权限不够），重启丢失
   - 🔴 红色：更新失败

---

## 五、修改前端后如何重新生成 worker/index.js

改完 `index.html` 后，需把它重新内嵌进 `worker/index.js`（`index.html` 中不要出现反引号 `` ` `` 或 `${`）。

在仓库根目录运行：

```bash
node -e '
  const fs = require("fs");
  const html = fs.readFileSync("index.html", "utf8");
  const logic = fs.readFileSync("worker/_logic.js", "utf8")
    .replace('const FRONTEND_HTML = "__FRONTEND_HTML__";', "");
  fs.writeFileSync("worker/index.js",
    "const FRONTEND_HTML = " + JSON.stringify(html) + ";\n" + logic);
'
```

> 说明：`worker/_logic.js` 是不含前端页面的后端逻辑源文件，作为"生成模板"保留在仓库里；`worker/index.js` 是部署用的成品。若仓库中没有 `_logic.js`，直接用 `node --check` 校验 `index.js` 语法后照常部署即可。

---

## 六、安全提醒

⚠️ **本项目单人自用，不要把 Worker 域名公开。**

1. **GitHub PAT 不出 Worker**：前端只拿到临时登录 token；`GET /api/get-token` 只返回脱敏预览，绝不返回完整 PAT。
2. **账号密码、CF Token、PAT 都用 Secret（Encrypt）** 类型，不要用 Text 明文。
3. **`USER_PASS`、`CF_API_TOKEN`、`GITHUB_TOKEN` 不要在聊天/代码/git 记录里明文出现**。
4. **临时 token 存在 Worker 内存**，重启会失效，需重新登录（单人自用足够）。

---

## 七、常见问题

| 现象 | 可能原因 / 处理 |
|------|----------------|
| `Failed to fetch` | 历史原因（跨域）。现方案已同源，若仍出现，确认保存并重新部署了最新 `worker/index.js` |
| 更新返回黄色"仅内存生效" | `CF_ACCOUNT_ID` / `CF_WORKER_NAME` / `CF_API_TOKEN` 未配齐，或 CF Token 没有 Workers Scripts: Edit 权限 |
| 登录 401 | `USER_NAME` / `USER_PASS` 拼写或大小写不一致 |
| 部署后首页还是旧的 | 浏览器缓存：强刷（Ctrl+Shift+R）或确认 Worker 已重新部署 |