# 网页版 Trae 密钥管理 & AI 代理系统

单人自用的轻量级 AI 代理网关：**静态前端 + Cloudflare Workers 后端**。Trae API 密钥仅保存在 Workers 环境变量中，前端浏览器永远拿不到原始密钥（方案 A 安全架构）。

---

## 一、整体架构

```
浏览器（index.html，部署在 1rc2.github.io/sjkglxt/）
   │  ① 登录请求：账号 + 密码
   │  ② AI 请求：临时 token + prompt
   ▼
Cloudflare Workers（Serverless，无服务器）
   │  校验账号密码 / token，从环境变量读取 TRAE_API_KEY
   ▼
Trae API（第三方 AI 接口）
   │  返回 AI 回答
   ▼
Workers 透传回答 → 浏览器
```

- **前端**：静态 HTML，部署到 GitHub Pages（`https://1rc2.github.io/sjkglxt/`）
- **后端**：Cloudflare Workers（免费额度足够单人自用）
- **密钥安全**：前端 JS 不写任何 API 密钥，只传 prompt 和登录凭证

---

## 二、仓库目录结构

```
sjkglxt/
├── index.html      # 前端页面（登录页 + AI 对话页）
├── worker/
│   └── index.js    # Cloudflare Workers 后端代码
├── AGENTS.md        # AI 开发助手说明
└── README.md       # 本文档
```

---

## 三、Cloudflare Workers 部署教程

### 1. 注册 / 登录 Cloudflare
访问 https://dash.cloudflare.com/ 注册账号并登录。

### 2. 创建 Worker
1. 左侧菜单选 **Workers & Pages** → **Create application** → **Create Worker**
2. 填写名称（如 `trae-proxy`）→ **Deploy**
3. 部署后得到访问域名，形如 `https://trae-proxy.<你的子域>.workers.dev`

### 3. 编辑 Worker 代码
1. 进入刚创建的 Worker → **Edit code**（编辑代码）
2. 将本仓库 `worker/index.js` 全部内容粘贴到在线编辑器（覆盖默认代码）
3. 右上角 **Save and deploy** 保存部署

### 4. 配置环境变量（关键）
1. Worker 详情页 → **Settings** → **Variables**（变量）
2. 依次添加以下环境变量（Type 选 **Text**，敏感的选 **Encrypt**）：

| 变量名 | 说明 | 是否加密 |
|--------|------|---------|
| `USER_NAME` | 登录账号（如 `admin`） | 否 |
| `USER_PASS` | 登录密码（自定义强密码） | **Encrypt** |
| `TRAE_API_KEY` | Trae 平台的 API 密钥 | **Encrypt** |
| `TRAE_BASE_URL` | Trae 接口基础地址（如 `https://api.trae.com.cn/v1`） | 否 |

3. 全部添加后点 **Save and Deploy** 保存。

### 5. 验证后端
浏览器访问 `https://trae-proxy.<子域>.workers.dev/`，应返回 `{"ok":true}`。

---

## 四、前端部署到 .io 站点步骤

### 1. 上传 index.html 到 sjkglxt 仓库根目录
确认 `index.html` 已在仓库根目录（GitHub 网页直接 Upload file，或 git push）。

### 2. 开启 GitHub Pages
1. 仓库 **Settings** → **Pages**
2. **Build and deployment**：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main` / `(root)`
3. 几秒后页面顶部出现访问地址：`https://1rc2.github.io/sjkglxt/`

### 3. 修改前端的 Worker 地址
打开 `index.html`，找到下面这行：

```html
const WORKER_URL = "https://trae-proxy.<你的子域>.workers.dev";
```

改成你在第三步创建的 Worker 域名，保存后推送。

### 4. 验证前端
访问 `https://1rc2.github.io/sjkglxt/`：
- 输入 `USER_NAME` / `USER_PASS` 对应的账号密码 → 进入对话页
- 输入 prompt → 返回 AI 回答即成功

---

## 五、使用说明

### 登录
- 输入 Cloudflare Workers 环境变量中配置的 `USER_NAME` 与 `USER_PASS`
- 登录成功后获得临时 token，保存在浏览器内存中（关闭页面即失效）

### 对话
- 在输入框填写 prompt → 点发送
- Worker 校验 token，从环境变量读取 `TRAE_API_KEY`，转发到 `TRAE_BASE_URL`
- AI 返回结果由 Worker 透传到前端展示

### 跨域
Worker 默认允许 `https://1rc2.github.io` 域名跨域访问，无需额外配置。若改用其他域名，需修改 `worker/index.js` 中的 `Access-Control-Allow-Origin`。

---

## 六、安全提醒

⚠️ **本项目为单人自用，不要公开访问。**

1. **Trae API 密钥全程不出 Workers**
   - 前端 JS 永远拿不到原始密钥
   - Worker 转发请求时由后台注入 `Authorization` 头
   - 浏览器开发者工具看到的只有 Worker 自己的接口地址

2. **账号密码不要硬编码**
   - 必须通过 Cloudflare Workers 环境变量配置
   - 密码用 **Encrypt** 选项加密保存
   - 不要把密码写到 `worker/index.js` 代码里

3. **Worker URL 不要公开分享**
   - 虽然有 token 校验，但暴露 URL 会增加被刷接口的风险
   - 建议把 sjkglxt 仓库设为 **Private**（GitHub Pages 私有仓库需 Pro 才能开启）
   - 或者在 Worker 中校验 `Origin` 头，只允许指定域名访问

4. **token 失效处理**
   - Worker 重启 / 重新部署后 token 失效，需重新登录
   - 浏览器关闭 / 刷新页面后需重新登录

5. **Trae API 用量监控**
   - Cloudflare Workers 免费额度：10 万次请求/天，足够单人自用
   - Trae API 自身额度见 Trae 平台后台

---

## 七、常见问题

### Q1：登录提示"密码错误"
- 检查 Workers 环境变量 `USER_NAME` / `USER_PASS` 是否与输入一致
- 密码区分大小写，检查是否含空格

### Q2：发送对话提示"token 失效"
- 关闭页面 / 重启 Worker 后 token 会失效，重新登录即可
- 检查 Worker 是否重新部署过

### Q3：AI 调用失败提示"上游错误"
- 检查 `TRAE_API_KEY` 是否正确、是否过期
- 检查 `TRAE_BASE_URL` 是否正确（含 `/v1` 等路径）
- 在 Cloudflare Workers 日志查看详细错误

### Q4：跨域报错
- 确认前端域名与 Worker 的 `Access-Control-Allow-Origin` 一致
- 默认允许 `https://1rc2.github.io`，改用其他域名需同步修改

### Q5：GitHub Pages 部署后访问 404
- 确认 `index.html` 在 `main` 分支根目录
- Pages 设置中 Branch 选 `main` / `(root)`，等待 1-2 分钟生效

---

## 八、更新本仓库

修改代码后推送：

```bash
git add .
git commit -m "更新说明"
git push origin main
```

GitHub Pages 会在 1-2 分钟内自动同步。
