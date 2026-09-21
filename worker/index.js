const FRONTEND_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>GitHub 令牌管理</title>\n<style>\n  /* ===== 全局重置 + 深色主题 ===== */\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  html, body { height: 100%; }\n  body {\n    font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n    background: #0d1117;\n    color: #e6edf3;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-height: 100vh;\n  }\n\n  /* ===== 登录页 ===== */\n  .login-wrap {\n    width: 360px;\n    background: #161b22;\n    border: 1px solid #30363d;\n    border-radius: 12px;\n    padding: 32px;\n    box-shadow: 0 8px 24px rgba(0,0,0,0.5);\n  }\n  .login-wrap h1 {\n    font-size: 20px;\n    margin-bottom: 6px;\n    color: #4e9acd;\n  }\n  .login-wrap .sub {\n    font-size: 13px;\n    color: #8b949e;\n    margin-bottom: 24px;\n  }\n  .login-wrap label {\n    display: block;\n    font-size: 13px;\n    color: #8b949e;\n    margin: 10px 0 6px;\n  }\n  .login-wrap input {\n    width: 100%;\n    height: 40px;\n    padding: 0 12px;\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #e6edf3;\n    font-size: 14px;\n    outline: none;\n    transition: border-color .15s;\n  }\n  .login-wrap input:focus { border-color: #4e9acd; }\n\n  /* 密码行：flex 布局，眼睛按钮和输入框并排，绝对定位不再叠到下方 */\n  .pwd-row {\n    display: flex;\n    gap: 8px;\n  }\n  .pwd-row input {\n    flex: 1;\n  }\n  .eye-btn {\n    width: 40px;\n    height: 40px;\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    flex-shrink: 0;\n    transition: border-color .15s, background .15s;\n  }\n  .eye-btn:hover { border-color: #4e9acd; background: #161b22; }\n  .eye-btn:active { background: #30363d; }\n  .eye-btn svg {\n    width: 18px;\n    height: 18px;\n    fill: none;\n    stroke: #8b949e;\n    stroke-width: 2;\n    stroke-linecap: round;\n    stroke-linejoin: round;\n  }\n  .eye-btn:hover svg { stroke: #4e9acd; }\n\n  .login-wrap button {\n    width: 100%;\n    height: 40px;\n    margin-top: 18px;\n    background: #4e9acd;\n    border: none;\n    border-radius: 8px;\n    color: #fff;\n    font-size: 15px;\n    cursor: pointer;\n    transition: background .15s;\n  }\n  .login-wrap button:hover { background: #3d8ab9; }\n  .login-wrap button:disabled { background: #3a3f4a; cursor: not-allowed; }\n  .err-msg {\n    color: #f97583;\n    font-size: 13px;\n    margin-top: 10px;\n    min-height: 18px;\n  }\n\n  /* 登录页底部：接口地址 + 连接状态 */\n  .login-footer {\n    margin-top: 16px;\n    padding-top: 14px;\n    border-top: 1px dashed #30363d;\n    font-size: 12px;\n    color: #8b949e;\n    line-height: 1.8;\n    word-break: break-all;\n  }\n  .login-footer .status-ok { color: #3fb950; }\n  .login-footer .status-bad { color: #f97583; }\n  .login-footer .status-wait { color: #8b949e; }\n\n  /* ===== 主页面 ===== */\n  .main-wrap {\n    width: 100%;\n    max-width: 560px;\n    padding: 20px;\n  }\n  .main-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 24px;\n  }\n  .main-header h1 {\n    font-size: 18px;\n    color: #4e9acd;\n  }\n  .main-header button {\n    height: 32px;\n    padding: 0 14px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 6px;\n    color: #c9d1d9;\n    font-size: 13px;\n    cursor: pointer;\n  }\n  .main-header button:hover { border-color: #4e9acd; color: #4e9acd; }\n\n  /* ===== 令牌更新卡片 ===== */\n  .card {\n    background: #161b22;\n    border: 1px solid #30363d;\n    border-radius: 12px;\n    padding: 28px;\n  }\n  .card h2 {\n    font-size: 18px;\n    color: #4e9acd;\n    margin-bottom: 8px;\n  }\n  .card .hint {\n    font-size: 13px;\n    color: #8b949e;\n    line-height: 1.6;\n    margin-bottom: 20px;\n  }\n\n  /* ===== 当前令牌状态 ===== */\n  .current-token {\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    padding: 14px 16px;\n    margin-bottom: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n  }\n  .current-token .label {\n    font-size: 12px;\n    color: #8b949e;\n    margin-bottom: 4px;\n  }\n  .current-token .value {\n    font-size: 14px;\n    color: #e6edf3;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    word-break: break-all;\n  }\n  .current-token .value.empty { color: #f85149; }\n  .current-token .refresh-btn {\n    flex-shrink: 0;\n    height: 30px;\n    padding: 0 12px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 6px;\n    color: #8b949e;\n    font-size: 12px;\n    cursor: pointer;\n  }\n  .current-token .refresh-btn:hover { border-color: #4e9acd; color: #4e9acd; }\n  .current-token .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n  .card label {\n    display: block;\n    font-size: 13px;\n    color: #8b949e;\n    margin: 14px 0 6px;\n  }\n  .card .input-row {\n    display: flex;\n    gap: 10px;\n  }\n  .card input {\n    flex: 1;\n    height: 42px;\n    padding: 0 12px;\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #e6edf3;\n    font-size: 14px;\n    outline: none;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    transition: border-color .15s;\n  }\n  .card input:focus { border-color: #4e9acd; }\n  .btn-toggle {\n    width: 60px;\n    height: 42px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #8b949e;\n    font-size: 13px;\n    cursor: pointer;\n  }\n  .btn-toggle:hover { border-color: #4e9acd; color: #4e9acd; }\n  .btn-submit {\n    width: 100%;\n    height: 42px;\n    margin-top: 14px;\n    background: #4e9acd;\n    border: none;\n    border-radius: 8px;\n    color: #fff;\n    font-size: 15px;\n    cursor: pointer;\n  }\n  .btn-submit:hover { background: #3d8ab9; }\n  .btn-submit:disabled { background: #3a3f4a; cursor: not-allowed; }\n\n  /* ===== 结果提示 ===== */\n  .result {\n    margin-top: 16px;\n    padding: 12px 14px;\n    border-radius: 8px;\n    font-size: 13px;\n    line-height: 1.6;\n    display: none;\n  }\n  .result.success {\n    display: block;\n    background: rgba(63, 185, 80, 0.12);\n    border: 1px solid #2ea043;\n    color: #3fb950;\n  }\n  .result.error {\n    display: block;\n    background: rgba(248, 81, 73, 0.12);\n    border: 1px solid #f85149;\n    color: #ff7b72;\n  }\n  .result.warn {\n    display: block;\n    background: rgba(210, 153, 34, 0.12);\n    border: 1px solid #d29922;\n    color: #e3b341;\n  }\n\n  /* ===== 滚动条 ===== */\n  ::-webkit-scrollbar { width: 8px; }\n  ::-webkit-scrollbar-track { background: #0d1117; }\n  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }\n  ::-webkit-scrollbar-thumb:hover { background: #4e9acd; }\n</style>\n</head>\n<body>\n\n<!-- ===== 登录页 ===== -->\n<div class=\"login-wrap\" id=\"loginPage\">\n  <h1>GitHub 令牌管理</h1>\n  <p class=\"sub\">登录后管理你的 GitHub 个人访问令牌</p>\n  <label for=\"username\">账号</label>\n  <input id=\"username\" type=\"text\" autocomplete=\"username\" placeholder=\"请输入账号\">\n  <label for=\"password\">密码</label>\n  <div class=\"pwd-row\">\n    <input id=\"password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"请输入密码\">\n    <button type=\"button\" class=\"eye-btn\" onclick=\"toggleLoginPwd()\" id=\"loginEye\" title=\"显示/隐藏密码\">\n      <svg id=\"eyeOpen\" viewBox=\"0 0 24 24\">\n        <path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/>\n        <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n      </svg>\n      <svg id=\"eyeClose\" viewBox=\"0 0 24 24\" style=\"display:none\">\n        <path d=\"M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-3.17 4.19M1 1l22 22\"/>\n        <path d=\"M14.12 14.12a3 3 0 1 1-4.24-4.24\"/>\n      </svg>\n    </button>\n  </div>\n  <button id=\"loginBtn\" onclick=\"doLogin()\">登录</button>\n  <div class=\"err-msg\" id=\"loginErr\"></div>\n\n  <!-- 底部：接口地址 + 连接状态（方便排错 Failed to fetch） -->\n  <div class=\"login-footer\">\n    <div>接口：<span id=\"workerUrlDisplay\">-</span></div>\n    <div>连接：<span id=\"workerStatus\" class=\"status-wait\">检测中...</span></div>\n  </div>\n</div>\n\n<!-- ===== 主页面（登录后显示） ===== -->\n<div class=\"main-wrap\" id=\"mainPage\" style=\"display:none\">\n  <div class=\"main-header\">\n    <h1>GitHub 令牌管理</h1>\n    <button onclick=\"doLogout()\">退出登录</button>\n  </div>\n  <div class=\"card\">\n    <h2>更新 GitHub 个人访问令牌</h2>\n    <p class=\"hint\">输入新的 GitHub PAT（Personal Access Token），提交后立即生效。若已配置 Cloudflare API 凭证，令牌将持久化写入 Worker 环境变量，重启后仍有效。</p>\n\n    <!-- 当前令牌状态（脱敏预览，从后端 /api/get-token 获取） -->\n    <div class=\"current-token\">\n      <div>\n        <div class=\"label\">当前令牌</div>\n        <div class=\"value empty\" id=\"currentToken\">加载中...</div>\n      </div>\n      <button class=\"refresh-btn\" id=\"refreshBtn\" onclick=\"loadCurrentToken()\">刷新</button>\n    </div>\n\n    <label for=\"patInput\">新的 GitHub 令牌</label>\n    <div class=\"input-row\">\n      <input id=\"patInput\" type=\"password\" autocomplete=\"off\" placeholder=\"ghp_xxxxxxxxxxxx 或 github_pat_xxxxxxxxxxxx\">\n      <button class=\"btn-toggle\" onclick=\"toggleVisibility()\" id=\"toggleBtn\">显示</button>\n    </div>\n    <button class=\"btn-submit\" id=\"updateBtn\" onclick=\"updatePat()\">提交更新</button>\n    <div class=\"result\" id=\"result\"></div>\n  </div>\n</div>\n\n<script>\n/* ============================================================\n * 前端逻辑说明\n * ------------------------------------------------------------\n * 1) 前端只保存临时登录 token（localStorage），不保存任何 API 密钥\n * 2) 提交新 PAT 时，附带 Authorization: Bearer <token>\n * 3) Worker 在后台用 CF_API_TOKEN 调用 Cloudflare API 更新环境变量\n * ============================================================ */\n\n// ===== 部署说明 =====\n// 前端与后端现在同一域名部署在 Cloudflare Worker 上（方案 A，同源），\n// 因此统一使用相对路径请求，无需硬编码域名，天然规避 CORS 与预检问题。\n\n// token 管理（localStorage 只存登录凭证，不存密钥）\nfunction getToken() { return localStorage.getItem(\"github_pat_token\") || \"\"; }\nfunction setToken(t) { localStorage.setItem(\"github_pat_token\", t); }\nfunction clearToken() { localStorage.removeItem(\"github_pat_token\"); }\n\n// 启动时检查登录状态 + 检测 Worker 连接\nif (getToken()) { showMain(); } else { showLogin(); checkWorkerHealth(); }\n\nfunction showLogin() {\n  document.getElementById(\"loginPage\").style.display = \"\";\n  document.getElementById(\"mainPage\").style.display = \"none\";\n}\nfunction showMain() {\n  document.getElementById(\"loginPage\").style.display = \"none\";\n  document.getElementById(\"mainPage\").style.display = \"\";\n  document.getElementById(\"patInput\").focus();\n  loadCurrentToken();  // 进入主页时加载当前令牌状态\n}\n\n// ===== 加载当前令牌（脱敏预览，调用后端 GET /api/get-token） =====\nasync function loadCurrentToken() {\n  const el = document.getElementById(\"currentToken\");\n  const btn = document.getElementById(\"refreshBtn\");\n  if (!getToken()) { clearToken(); showLogin(); return; }\n  el.className = \"value empty\";\n  el.textContent = \"加载中...\";\n  btn.disabled = true;\n  try {\n    const res = await fetch(\"/api/get-token\", {\n      method: \"GET\",\n      headers: { \"Authorization\": \"Bearer \" + getToken() }\n    });\n    const data = await res.json();\n    if (res.status === 401) {\n      clearToken();\n      el.textContent = \"登录已失效\";\n      setTimeout(showLogin, 1500);\n    } else if (res.ok) {\n      if (data.hasToken && data.preview) {\n        el.className = \"value\";\n        el.textContent = data.preview;  // 例如 ghp_****abcd\n      } else {\n        el.className = \"value empty\";\n        el.textContent = \"（未设置）\";\n      }\n    } else {\n      el.className = \"value empty\";\n      el.textContent = data.error || \"加载失败\";\n    }\n  } catch (e) {\n    el.className = \"value empty\";\n    el.textContent = \"网络错误：\" + e.message;\n  } finally {\n    btn.disabled = false;\n  }\n}\n\n// ===== 登录 =====\nasync function doLogin() {\n  const u = document.getElementById(\"username\").value.trim();\n  const p = document.getElementById(\"password\").value;\n  const errEl = document.getElementById(\"loginErr\");\n  const btn = document.getElementById(\"loginBtn\");\n  errEl.textContent = \"\";\n  if (!u || !p) { errEl.textContent = \"请输入账号和密码\"; return; }\n  btn.disabled = true; btn.textContent = \"登录中...\";\n  try {\n    const res = await fetch(\"/api/login\", {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ username: u, password: p })\n    });\n    const data = await res.json();\n    if (res.ok && data.token) {\n      setToken(data.token);\n      showMain();\n    } else {\n      errEl.textContent = data.error || \"登录失败\";\n    }\n  } catch (e) {\n    errEl.textContent = \"网络错误：\" + e.message;\n  } finally {\n    btn.disabled = false; btn.textContent = \"登录\";\n  }\n}\n\n// ===== 退出登录 =====\nfunction doLogout() {\n  clearToken();\n  showLogin();\n  document.getElementById(\"username\").value = \"\";\n  document.getElementById(\"password\").value = \"\";\n  document.getElementById(\"patInput\").value = \"\";\n  const result = document.getElementById(\"result\");\n  result.className = \"result\";\n  result.textContent = \"\";\n}\n\n// ===== 更新 GitHub PAT =====\nasync function updatePat() {\n  const input = document.getElementById(\"patInput\");\n  const btn = document.getElementById(\"updateBtn\");\n  const result = document.getElementById(\"result\");\n  const newPat = input.value.trim();\n  result.className = \"result\";\n  result.textContent = \"\";\n  if (!newPat) {\n    showResult(\"error\", \"请输入新的 GitHub 令牌\");\n    return;\n  }\n  if (!getToken()) { clearToken(); showLogin(); return; }\n\n  btn.disabled = true;\n  btn.textContent = \"提交中...\";\n  try {\n    const res = await fetch(\"/api/update-key\", {\n      method: \"POST\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n        \"Authorization\": \"Bearer \" + getToken()  // 只传临时 token，不传 API 密钥\n      },\n      body: JSON.stringify({ apiKey: newPat })  // 字段名 apiKey，与后端一致\n    });\n    const data = await res.json();\n    if (res.status === 401) {\n      clearToken();\n      showResult(\"error\", \"登录已失效，请重新登录\");\n      setTimeout(showLogin, 1500);\n    } else if (res.ok) {\n      if (data.persisted) {\n        showResult(\"success\", data.message || \"令牌更新成功，已持久化到环境变量\");\n      } else {\n        showResult(\"warn\", data.message || \"令牌已在内存中生效，但未持久化\");\n      }\n      input.value = \"\";  // 提交后清空输入框\n      loadCurrentToken();  // 刷新当前令牌显示\n    } else {\n      showResult(\"error\", data.error || \"更新失败\");\n    }\n  } catch (e) {\n    showResult(\"error\", \"网络错误：\" + e.message);\n  } finally {\n    btn.disabled = false;\n    btn.textContent = \"提交更新\";\n  }\n}\n\n// ===== 登录页密码框：小眼睛切换 =====\nfunction toggleLoginPwd() {\n  const input = document.getElementById(\"password\");\n  const eyeOpen = document.getElementById(\"eyeOpen\");\n  const eyeClose = document.getElementById(\"eyeClose\");\n  if (input.type === \"password\") {\n    input.type = \"text\";\n    eyeOpen.style.display = \"none\";\n    eyeClose.style.display = \"\";\n  } else {\n    input.type = \"password\";\n    eyeOpen.style.display = \"\";\n    eyeClose.style.display = \"none\";\n  }\n}\n\n// ===== 主页面令牌框：显示/隐藏 =====\nfunction toggleVisibility() {\n  const input = document.getElementById(\"patInput\");\n  const btn = document.getElementById(\"toggleBtn\");\n  if (input.type === \"password\") {\n    input.type = \"text\";\n    btn.textContent = \"隐藏\";\n  } else {\n    input.type = \"password\";\n    btn.textContent = \"显示\";\n  }\n}\n\n// ===== 登录页底部：Worker 连接状态检测 =====\nasync function checkWorkerHealth() {\n  // 显示当前配置的 Worker 地址\n  const urlEl = document.getElementById(\"workerUrlDisplay\");\n  const statusEl = document.getElementById(\"workerStatus\");\n  if (!urlEl || !statusEl) return;  // 主页面不显示\n  urlEl.textContent = location.origin + \"（与网页同源）\";\n  statusEl.textContent = \"检测中...\";\n  statusEl.className = \"status-wait\";\n  try {\n    const res = await fetch(\"/health\", { method: \"GET\" });\n    if (res.ok) {\n      statusEl.textContent = \"✅ 已连接\";\n      statusEl.className = \"status-ok\";\n    } else {\n      statusEl.textContent = \"❌ Worker 返回 HTTP \" + res.status;\n      statusEl.className = \"status-bad\";\n    }\n  } catch (e) {\n    // 常见原因：Worker 未部署 / CORS 被拦 / 域名写错\n    statusEl.textContent = \"❌ 无法连接（\" + e.name + \"：\" + shorten(e.message) + \"）\";\n    statusEl.className = \"status-bad\";\n  }\n}\nfunction shorten(s) { return s.length > 40 ? s.slice(0, 40) + \"...\" : (s || \"未知错误\"); }\n\n// ===== 显示结果提示 =====\nfunction showResult(type, text) {\n  const el = document.getElementById(\"result\");\n  el.className = \"result \" + type;\n  el.textContent = text;\n}\n</script>\n</body>\n</html>\n";
// ===== 内嵌前端页面（构建时由 index.html 自动注入，见 README 第五节） =====


/**
 * ============================================================
 *  GitHub 令牌管理 —— Cloudflare Workers 后端（方案 A：同源自托管）
 * ============================================================
 *  这个 Worker 同时提供：
 *    1. 前端页面        GET  /  /index.html  → 返回 index.html
 *    2. 登录接口        POST /api/login
 *    3. 令牌更新接口    POST /api/update-key
 *    4. 令牌读取接口    GET  /api/get-token（返回脱敏预览）
 *    5. 健康检查        GET  /health
 *  ------------------------------------------------------------
 *  安全架构（方案 A）：
 *    - 原始 GitHub PAT 只存在环境变量 GITHUB_TOKEN
 *    - 前端只拿到一个临时登录 token，永远拿不到 GitHub PAT
 *    - 通过 Cloudflare API 修改自身环境变量，实现持久化更新
 *  ------------------------------------------------------------
 *  需要在 Cloudflare Dashboard 配置的环境变量：
 *    USER_NAME        登录账号
 *    USER_PASS        登录密码（加密）
 *    CF_ACCOUNT_ID   Cloudflare 账户 ID（加密）
 *    CF_WORKER_NAME  当前 Worker 脚本名（如 traemy）
 *    CF_API_TOKEN     Workers Scripts:Edit 权限的 API Token（加密）
 *    GITHUB_TOKEN     GitHub 个人访问令牌（加密，初始可留空，通过网页更新）
 * ============================================================
 */

// ===== 内存中的 token 表（单人自用；Workers 无状态，重启会丢） =====
const tokenStore = new Map();
const TOKEN_TTL = 1000 * 60 * 60 * 12; // 12 小时

// ===== 内存中的 GITHUB_TOKEN 覆盖缓存 =====
// 提交新 PAT 时：先写内存立即生效，再通过 Cloudflare API 持久化到环境变量
let tokenOverride = null; // string | null

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检（保留，便于外部引用前端时依然可用）
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // 前端页面（同源托管）
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(FRONTEND_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    // 路由
    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/update-key" && request.method === "POST") {
      return handleUpdateKey(request, env);
    }
    if (url.pathname === "/api/get-token" && request.method === "GET") {
      return handleGetToken(request, env);
    }

    // 健康检查
    if (url.pathname === "/health") {
      return json({ ok: true }, 200, request);
    }

    return json({ error: "Not Found" }, 404, request);
  }
};

// ============================================================
//  登录接口：POST /api/login
//  入参：{ username, password }
//  返回：{ token }  或  { error }
// ============================================================
async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体格式错误，应为 JSON" }, 400, request);
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return json({ error: "账号和密码不能为空" }, 400, request);
  }

  // 校验账号密码（环境变量，不硬编码）
  if (username !== env.USER_NAME || password !== env.USER_PASS) {
    return json({ error: "账号或密码错误" }, 401, request);
  }

  // 生成临时 token 并写入内存表
  const token = generateToken();
  tokenStore.set(token, Date.now() + TOKEN_TTL);

  return json({ token }, 200, request);
}

// ============================================================
//  令牌更新接口：POST /api/update-key
//  Header：Authorization: Bearer <token>
//  Body：  { apiKey: "新的 GitHub PAT" }
//  返回：{ ok, persisted, message }
// ============================================================
async function handleUpdateKey(request, env) {
  // 1. 校验 token
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, request);
  }

  // 2. 解析新 PAT
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体格式错误，应为 JSON" }, 400, request);
  }
  const { apiKey } = body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return json({ error: "新令牌不能为空" }, 400, request);
  }
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return json({ error: "新令牌不能为空" }, 400, request);
  }

  // 3. 立即写入内存缓存，使新 PAT 对当前实例立即生效
  tokenOverride = trimmed;

  // 4. 尝试通过 Cloudflare API 持久化到环境变量 GITHUB_TOKEN
  const cfToken = env.CF_API_TOKEN;
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfWorkerName = env.CF_WORKER_NAME;
  if (!cfToken || !cfAccountId || !cfWorkerName) {
    return json({
      ok: true,
      persisted: false,
      message: "令牌已更新（仅当前实例生效，Worker 重启后失效）。如需持久化，请配置 CF_API_TOKEN、CF_ACCOUNT_ID、CF_WORKER_NAME。"
    }, 200, request);
  }

  try {
    const persisted = await updateEnvVarViaCfApi(cfToken, cfAccountId, cfWorkerName, "GITHUB_TOKEN", trimmed);
    if (persisted) {
      return json({
        ok: true,
        persisted: true,
        message: "令牌已更新并持久化到 Worker 环境变量 GITHUB_TOKEN，重启后仍有效。"
      }, 200, request);
    } else {
      return json({
        ok: false,
        persisted: false,
        message: "令牌已在内存中生效，但写入环境变量失败，请检查 CF_API_TOKEN 权限及 CF_ACCOUNT_ID/CF_WORKER_NAME。"
      }, 200, request);
    }
  } catch (e) {
    return json({
      ok: false,
      persisted: false,
      message: "令牌已在内存中生效，但调用 Cloudflare API 出错：" + e.message
    }, 200, request);
  }
}

// ============================================================
//  令牌读取接口：GET /api/get-token
//  返回当前 GitHub PAT 的脱敏预览（不返回完整令牌）
//  返回：{ hasToken, preview }  或  { error }
// ============================================================
async function handleGetToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, request);
  }

  const pat = tokenOverride || env.GITHUB_TOKEN;
  if (!pat) {
    return json({ hasToken: false, preview: "" }, 200, request);
  }
  // 脱敏：只返回前4位 + **** + 后4位
  const preview = pat.length > 12
    ? pat.slice(0, 4) + "****" + pat.slice(-4)
    : "****";
  return json({ hasToken: true, preview }, 200, request);
}

// ============================================================
//  通过 Cloudflare API 更新 Worker 环境变量
//  步骤：
//    1) GET 当前所有变量
//    2) 找到指定变量名，替换其值（保留其余变量不变）
//    3) PUT 回完整变量列表
// ============================================================
async function updateEnvVarViaCfApi(cfToken, accountId, workerName, varName, newValue) {
  const apiBase = "https://api.cloudflare.com/client/v4";
  const varsUrl = `${apiBase}/accounts/${accountId}/workers/scripts/${workerName}/variables`;

  const headers = {
    "Authorization": `Bearer ${cfToken}`,
    "Content-Type": "application/json"
  };

  // 1) 获取当前变量列表
  const getRes = await fetch(varsUrl, { method: "GET", headers });
  if (!getRes.ok) {
    console.error("CF API GET variables failed:", getRes.status);
    return false;
  }
  const getJson = await getRes.json();
  if (!getJson.success) {
    console.error("CF API GET variables errors:", JSON.stringify(getJson.errors));
    return false;
  }
  const vars = Array.isArray(getJson.result) ? getJson.result : [];

  // 2) 替换指定变量的值
  let found = false;
  const updatedVars = vars.map(v => {
    if (v.name === varName) {
      found = true;
      return { name: v.name, value: newValue, type: v.type || "secret_text" };
    }
    return { name: v.name, value: v.value, type: v.type };
  });
  if (!found) {
    updatedVars.push({ name: varName, value: newValue, type: "secret_text" });
  }

  // 3) PUT 回完整变量列表
  const putRes = await fetch(varsUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ vars: updatedVars })
  });
  if (!putRes.ok) {
    console.error("CF API PUT variables failed:", putRes.status);
    return false;
  }
  const putJson = await putRes.json();
  if (!putJson.success) {
    console.error("CF API PUT variables errors:", JSON.stringify(putJson.errors));
    return false;
  }
  return true;
}

// ============================================================
//  工具函数
// ============================================================

function isTokenValid(token) {
  const exp = tokenStore.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    tokenStore.delete(token);
    return false;
  }
  return true;
}

function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return hex + "_" + Date.now().toString(36);
}

// CORS：反射请求的 Origin 头。同源部署时用不上，但保留便于外部引用。
function corsHeaders(request) {
  let origin = "*";
  if (request) {
    origin = request.headers.get("Origin") || "*";
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(obj, status, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request)
    }
  });
}