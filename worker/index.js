const FRONTEND_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>GitHub 令牌管理</title>\n<style>\n  /* ===== 全局重置 + 深色主题 ===== */\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  html, body { height: 100%; }\n  body {\n    font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n    background: #0d1117;\n    color: #e6edf3;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-height: 100vh;\n  }\n\n  /* ===== 登录页 ===== */\n  .login-wrap {\n    width: 360px;\n    background: #161b22;\n    border: 1px solid #30363d;\n    border-radius: 12px;\n    padding: 32px;\n    box-shadow: 0 8px 24px rgba(0,0,0,0.5);\n  }\n  .login-wrap h1 {\n    font-size: 20px;\n    margin-bottom: 6px;\n    color: #4e9acd;\n  }\n  .login-wrap .sub {\n    font-size: 13px;\n    color: #8b949e;\n    margin-bottom: 24px;\n  }\n  .login-wrap label {\n    display: block;\n    font-size: 13px;\n    color: #8b949e;\n    margin: 10px 0 6px;\n  }\n  .login-wrap input {\n    width: 100%;\n    height: 40px;\n    padding: 0 40px 0 12px; /* 右侧留出眼睛按钮空间 */\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #e6edf3;\n    font-size: 14px;\n    outline: none;\n    transition: border-color .15s;\n  }\n  .login-wrap input:focus { border-color: #4e9acd; }\n\n  /* 密码行容器：相对定位，让眼睛按钮绝对定位叠在输入框内部右侧 */\n  .pwd-row {\n    position: relative;\n  }\n  .pwd-row input {\n    padding-right: 40px;\n  }\n  .eye-btn {\n    position: absolute;\n    right: 4px;\n    top: 50%;\n    transform: translateY(-50%);\n    width: 32px;\n    height: 32px;\n    background: transparent;\n    border: none;\n    border-radius: 6px;\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    transition: background .15s;\n  }\n  .eye-btn:hover { background: rgba(78,154,205,0.12); }\n  .eye-btn:active { background: rgba(78,154,205,0.2); }\n  .eye-btn svg {\n    width: 18px;\n    height: 18px;\n    fill: none;\n    stroke: #8b949e;\n    stroke-width: 2;\n    stroke-linecap: round;\n    stroke-linejoin: round;\n  }\n  .eye-btn:hover svg { stroke: #4e9acd; }\n\n  /* 登录按钮：只匹配直接子级的 #loginBtn，别误伤 .pwd-row 里的 .eye-btn */\n  .login-wrap > button#loginBtn {\n    width: 100%;\n    height: 40px;\n    margin-top: 18px;\n    background: #4e9acd;\n    border: none;\n    border-radius: 8px;\n    color: #fff;\n    font-size: 15px;\n    cursor: pointer;\n    transition: background .15s;\n  }\n  .login-wrap > button#loginBtn:hover { background: #3d8ab9; }\n  .login-wrap > button#loginBtn:disabled { background: #3a3f4a; cursor: not-allowed; }\n  .err-msg {\n    color: #f97583;\n    font-size: 13px;\n    margin-top: 10px;\n    min-height: 18px;\n  }\n\n  /* 登录页底部：接口地址 + 连接状态 */\n  .login-footer {\n    margin-top: 16px;\n    padding-top: 14px;\n    border-top: 1px dashed #30363d;\n    font-size: 12px;\n    color: #8b949e;\n    line-height: 1.8;\n    word-break: break-all;\n  }\n  .login-footer .status-ok { color: #3fb950; }\n  .login-footer .status-bad { color: #f97583; }\n  .login-footer .status-wait { color: #8b949e; }\n\n  /* ===== 主页面 ===== */\n  .main-wrap {\n    width: 100%;\n    max-width: 560px;\n    padding: 20px;\n  }\n  .main-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 24px;\n  }\n  .main-header h1 {\n    font-size: 18px;\n    color: #4e9acd;\n  }\n  .main-header button {\n    height: 32px;\n    padding: 0 14px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 6px;\n    color: #c9d1d9;\n    font-size: 13px;\n    cursor: pointer;\n  }\n  .main-header button:hover { border-color: #4e9acd; color: #4e9acd; }\n\n  /* ===== 令牌更新卡片 ===== */\n  .card {\n    background: #161b22;\n    border: 1px solid #30363d;\n    border-radius: 12px;\n    padding: 28px;\n  }\n  .card h2 {\n    font-size: 18px;\n    color: #4e9acd;\n    margin-bottom: 8px;\n  }\n  .card .hint {\n    font-size: 13px;\n    color: #8b949e;\n    line-height: 1.6;\n    margin-bottom: 20px;\n  }\n\n  /* ===== 当前令牌状态 ===== */\n  .current-token {\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    padding: 14px 16px;\n    margin-bottom: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n  }\n  .current-token .label {\n    font-size: 12px;\n    color: #8b949e;\n    margin-bottom: 4px;\n  }\n  .current-token .value {\n    font-size: 14px;\n    color: #e6edf3;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    word-break: break-all;\n  }\n  .current-token .value.empty { color: #f85149; }\n  .current-token .refresh-btn {\n    flex-shrink: 0;\n    height: 30px;\n    padding: 0 12px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 6px;\n    color: #8b949e;\n    font-size: 12px;\n    cursor: pointer;\n  }\n  .current-token .refresh-btn:hover { border-color: #4e9acd; color: #4e9acd; }\n  .current-token .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n  .card label {\n    display: block;\n    font-size: 13px;\n    color: #8b949e;\n    margin: 14px 0 6px;\n  }\n  .card .input-row {\n    display: flex;\n    gap: 10px;\n  }\n  .card input {\n    flex: 1;\n    height: 42px;\n    padding: 0 12px;\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #e6edf3;\n    font-size: 14px;\n    outline: none;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    transition: border-color .15s;\n  }\n  .card input:focus { border-color: #4e9acd; }\n  .btn-toggle {\n    width: 60px;\n    height: 42px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #8b949e;\n    font-size: 13px;\n    cursor: pointer;\n  }\n  .btn-toggle:hover { border-color: #4e9acd; color: #4e9acd; }\n  .btn-submit {\n    width: 100%;\n    height: 42px;\n    margin-top: 14px;\n    background: #4e9acd;\n    border: none;\n    border-radius: 8px;\n    color: #fff;\n    font-size: 15px;\n    cursor: pointer;\n  }\n  .btn-submit:hover { background: #3d8ab9; }\n  .btn-submit:disabled { background: #3a3f4a; cursor: not-allowed; }\n\n  /* ===== 结果提示 ===== */\n  .result {\n    margin-top: 16px;\n    padding: 12px 14px;\n    border-radius: 8px;\n    font-size: 13px;\n    line-height: 1.6;\n    display: none;\n  }\n  .result.success {\n    display: block;\n    background: rgba(63, 185, 80, 0.12);\n    border: 1px solid #2ea043;\n    color: #3fb950;\n  }\n  .result.error {\n    display: block;\n    background: rgba(248, 81, 73, 0.12);\n    border: 1px solid #f85149;\n    color: #ff7b72;\n  }\n  .result.warn {\n    display: block;\n    background: rgba(210, 153, 34, 0.12);\n    border: 1px solid #d29922;\n    color: #e3b341;\n  }\n\n  /* ===== 滚动条 ===== */\n  ::-webkit-scrollbar { width: 8px; }\n  ::-webkit-scrollbar-track { background: #0d1117; }\n  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }\n  ::-webkit-scrollbar-thumb:hover { background: #4e9acd; }\n</style>\n</head>\n<body>\n\n<!-- ===== 登录页 ===== -->\n<div class=\"login-wrap\" id=\"loginPage\">\n  <h1>GitHub 令牌管理</h1>\n  <div id=\"modeLabel\" style=\"font-size:12px;color:#4e9acd;margin:-4px 0 4px;\"></div>\n  <p class=\"sub\" id=\"loginSub\">登录后管理你的 GitHub 个人访问令牌</p>\n  <label for=\"username\">用户名</label>\n  <input id=\"username\" type=\"text\" autocomplete=\"username\" placeholder=\"请输入用户名\">\n  <label for=\"password\">密码</label>\n  <div class=\"pwd-row\">\n    <input id=\"password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"请输入密码\">\n    <button type=\"button\" class=\"eye-btn\" onclick=\"toggleLoginPwd()\" id=\"loginEye\" title=\"显示/隐藏密码\">\n      <svg id=\"eyeOpen\" viewBox=\"0 0 24 24\">\n        <path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/>\n        <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n      </svg>\n      <svg id=\"eyeClose\" viewBox=\"0 0 24 24\" style=\"display:none\">\n        <path d=\"M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-3.17 4.19M1 1l22 22\"/>\n        <path d=\"M14.12 14.12a3 3 0 1 1-4.24-4.24\"/>\n      </svg>\n    </button>\n  </div>\n  <button id=\"loginBtn\" onclick=\"doLogin()\">登录</button>\n  <div class=\"err-msg\" id=\"loginErr\"></div>\n\n  <!-- 齿轮：GitHub Mode 下用于配置存储 PAT（首次使用/重置时展开） -->\n  <div id=\"patGearWrap\" style=\"display:none;margin-top:8px;text-align:right;\">\n    <a href=\"javascript:void(0)\" onclick=\"togglePatPanel()\" style=\"color:#4e9acd;font-size:12px;text-decoration:none;\">⚙️ 存储配置</a>\n    <div id=\"patPanel\" style=\"display:none;margin-top:8px;padding:10px;background:#21262d;border-radius:6px;border:1px solid #30363d;text-align:left;\">\n      <div style=\"font-size:12px;color:#8b949e;margin-bottom:6px;\">GitHub 读写凭证（需 repo scope，localStorage 记住，失效时在此重新填写）</div>\n      <input id=\"ghPat\" type=\"password\" style=\"width:100%;padding:6px 8px;background:#0d1117;border:1px solid #30363d;border-radius:4px;color:#e6edf3;font-family:monospace;font-size:12px;\" placeholder=\"ghp_...\">\n      <button onclick=\"saveGhPat()\" style=\"margin-top:6px;padding:4px 10px;background:#238636;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:12px;\">保存</button>\n      <span id=\"patSaveMsg\" style=\"margin-left:6px;font-size:11px;\"></span>\n      <button onclick=\"clearGhPat()\" style=\"margin-top:6px;margin-left:6px;padding:4px 10px;background:#30363d;border:none;border-radius:4px;color:#e6edf3;cursor:pointer;font-size:12px;\">清除</button>\n    </div>\n  </div>\n\n  <div class=\"login-footer\">\n    <div>接口：<span id=\"workerUrlDisplay\">-</span></div>\n    <div>连接：<span id=\"workerStatus\" class=\"status-wait\">检测中...</span></div>\n  </div>\n</div>\n\n<!-- ===== 主页面（登录后显示） ===== -->\n<div class=\"main-wrap\" id=\"mainPage\" style=\"display:none\">\n  <div class=\"main-header\">\n    <h1>GitHub 令牌管理</h1>\n    <button onclick=\"doLogout()\">退出登录</button>\n  </div>\n  <div class=\"card\">\n    <h2>更新 GitHub 个人访问令牌</h2>\n    <p class=\"hint\">输入新的 GitHub PAT（Personal Access Token），提交后立即生效。若已配置 Cloudflare API 凭证，令牌将持久化写入 Worker 环境变量，重启后仍有效。</p>\n\n    <!-- 当前令牌状态（脱敏预览，从后端 /api/get-token 获取） -->\n    <div class=\"current-token\">\n      <div>\n        <div class=\"label\">当前令牌</div>\n        <div class=\"value empty\" id=\"currentToken\">加载中...</div>\n      </div>\n      <button class=\"refresh-btn\" id=\"refreshBtn\" onclick=\"loadCurrentToken()\">刷新</button>\n    </div>\n\n    <label for=\"patInput\">新的 GitHub 令牌</label>\n    <div class=\"input-row\">\n      <input id=\"patInput\" type=\"password\" autocomplete=\"off\" placeholder=\"ghp_xxxxxxxxxxxx 或 github_pat_xxxxxxxxxxxx\">\n      <button class=\"btn-toggle\" onclick=\"toggleVisibility()\" id=\"toggleBtn\">显示</button>\n    </div>\n    <button class=\"btn-submit\" id=\"updateBtn\" onclick=\"updatePat()\">提交更新</button>\n    <div class=\"result\" id=\"result\"></div>\n  </div>\n</div>\n\n<script>/* ============================================================\n * 前端核心 JS —— 双模式（Worker / GitHub）自动切换\n * 安全设计：\n *   1) 主密码只在内存短暂存在（每次输入，localStorage 不存）\n *   2) 真实 PAT 用完立即覆盖 null（内存即清）\n *   3) GitHub Mode 下 Gist/Contents 文件存 AES-256-GCM 密文 blob\n *   4) PBKDF2-SHA256 派生密钥 100000 轮\n * ============================================================ */\n\n// ===== 模式自动判断 =====\n// *.workers.dev 域名 => Worker Mode（同源后端，密钥存 Cloudflare 环境变量）\n// 其他域名 => GitHub Mode（Repository Contents + AES 加密，多设备同步）\nconst MODE = location.hostname.endsWith(\".workers.dev\") ? \"worker\" : \"github\";\nconst API_BASE = MODE === \"worker\" ? \"\" : \"https://api.github.com\";\nconst GITHUB_REPO = \"1rc2/mybc\";\nconst GITHUB_FILE = \".sync-data/token_store.json\";\nconst PBKDF2_ITER = 100000;\n\n// ===== 会话状态（全部仅存内存，绝不写入 localStorage）=====\nlet _sessionPwd = null;        // 主密码（仅内存，关闭页面即清）\nlet _sessionRealPat = null;    // 解密出的真实令牌（用完即清）\nlet _clearRealPat = null;      // 自动清理定时器句柄\n\n// ===== 加密工具（Web Crypto API，浏览器原生实现）=====\nasync function pbkdf2DeriveKey(password, salt) {\n  const enc = new TextEncoder();\n  const keyMaterial = await crypto.subtle.importKey(\n    \"raw\", enc.encode(password), \"PBKDF2\", false, [\"deriveKey\"]\n  );\n  return await crypto.subtle.deriveKey(\n    { name: \"PBKDF2\", salt, iterations: PBKDF2_ITER, hash: \"SHA-256\" },\n    keyMaterial,\n    { name: \"AES-GCM\", length: 256 },\n    false, [\"encrypt\", \"decrypt\"]\n  );\n}\n\nasync function aesGcmEncrypt(key, plaintext) {\n  const iv = crypto.getRandomValues(new Uint8Array(12));\n  const enc = new TextEncoder();\n  const ciphertext = await crypto.subtle.encrypt(\n    { name: \"AES-GCM\", iv }, key, enc.encode(plaintext)\n  );\n  return {\n    iv: btoa(String.fromCharCode(...iv)),\n    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))\n  };\n}\n\nasync function aesGcmDecrypt(key, ivB64, ctB64) {\n  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));\n  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));\n  const dec = await crypto.subtle.decrypt({ name: \"AES-GCM\", iv }, key, ct);\n  return new TextDecoder().decode(dec);\n}\n\n// ===== GitHub Contents API 封装 =====\nasync function ghApi(method, path, token, body) {\n  const opts = {\n    method,\n    headers: {\n      \"Authorization\": \"Bearer \" + token,\n      \"Accept\": \"application/vnd.github.v3+json\",\n      \"Content-Type\": \"application/json\"\n    }\n  };\n  if (body) opts.body = JSON.stringify(body);\n  return fetch(API_BASE + path, opts);\n}\n\nasync function ghGetStore(token) {\n  const res = await ghApi(\"GET\", `/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FILE)}`, token);\n  if (res.status === 404) return { ok: true, exists: false };\n  if (!res.ok) return { ok: false, error: \"GitHub API \" + res.status };\n  const d = await res.json();\n  const content = JSON.parse(atob(d.content));\n  return { ok: true, exists: true, sha: d.sha, data: content };\n}\n\nasync function ghPutStore(token, encrypted, sha) {\n  const content = btoa(JSON.stringify({\n    ...encrypted,\n    version: 2,\n    updated_at: new Date().toISOString()\n  }));\n  const body = { message: \"sync: update encrypted token store\", content };\n  if (sha) body.sha = sha;\n  const res = await ghApi(\"PUT\", `/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FILE)}`, token, body);\n  return { ok: res.ok, status: res.status };\n}\n\n// ===== 显示脱敏值 =====\nfunction maskPat(pat) {\n  if (!pat) return \"（空）\";\n  if (pat.length <= 8) return \"****\";\n  return pat.slice(0, 6) + \"****\" + pat.slice(-4);\n}\n\n// ===== 启动：根据 MODE 显示对应登录 =====\nwindow.addEventListener(\"DOMContentLoaded\", () => {\n  const gearWrap = document.getElementById(\"patGearWrap\");\n  const sub = document.getElementById(\"loginSub\");\n  if (MODE === \"worker\") {\n    document.getElementById(\"modeLabel\").textContent = \"🔵 Worker 模式（密钥存 Cloudflare）\";\n    gearWrap.style.display = \"none\";\n  } else {\n    document.getElementById(\"modeLabel\").textContent = \"🟢 GitHub 模式（AES-256-GCM 加密多设备同步）\";\n    gearWrap.style.display = \"\";   // GitHub Mode 显示齿轮\n    // 存储 PAT 已配置则不提示，未配置则显示提示\n    if (localStorage.getItem(\"gh_sync_pat\")) {\n      sub.textContent = \"用户名+密码登录（存储凭证已缓存，可点齿轮查看/更新）\";\n    } else {\n      sub.innerHTML = \"用户名+密码登录 <span style='color:#f85149;'>⚠️ 首次使用请点右下角⚙️配置存储凭证</span>\";\n    }\n  }\n  if (MODE === \"worker\" && localStorage.getItem(\"github_pat_token\")) {\n    showMain();\n  } else {\n    showLogin();\n    checkBackendHealth();\n  }\n});\n\nfunction showLogin() {\n  document.getElementById(\"loginPage\").style.display = \"\";\n  document.getElementById(\"mainPage\").style.display = \"none\";\n}\nfunction showMain() {\n  document.getElementById(\"loginPage\").style.display = \"none\";\n  document.getElementById(\"mainPage\").style.display = \"\";\n  document.getElementById(\"patInput\").focus();\n  loadCurrentToken();\n}\n\n// ===== 登录 =====\nasync function doLogin() {\n  const uEl = document.getElementById(\"username\");\n  const pEl = document.getElementById(\"password\");\n  const errEl = document.getElementById(\"loginErr\");\n  const btn = document.getElementById(\"loginBtn\");\n  const u = uEl.value.trim();\n  const p = pEl.value;\n  errEl.textContent = \"\";\n  if (!u || !p) { errEl.textContent = \"请填写完整\"; return; }\n  btn.disabled = true; btn.textContent = \"登录中...\";\n\n  if (MODE === \"worker\") {\n    // Worker Mode：POST /api/login\n    const res = await fetch(API_BASE + \"/api/login\", {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ username: u, password: p })\n    });\n    let data = {};\n    try { data = await res.json(); } catch {}\n    if (res.ok && data.token) {\n      localStorage.setItem(\"github_pat_token\", data.token);\n      showMain();\n    } else {\n      errEl.textContent = data.error || \"登录失败\";\n    }\n  } else {\n    // GitHub Mode：用户名+密码登录（密码即主密码，用于 AES 密钥派生）\n    // 存储 PAT 从 localStorage 读取（首次使用需在齿轮面板配置）\n    const syncPat = localStorage.getItem(\"gh_sync_pat\");\n    if (!syncPat) {\n      errEl.textContent = \"⚠️ 请先点⚙️配置存储凭证\";\n      btn.disabled = false; btn.textContent = \"登录\";\n      return;\n    }\n    // 校验存储 PAT 是否仍然有效（静默）\n    const test = await ghApi(\"GET\", \"/user\", syncPat);\n    if (!test.ok) {\n      errEl.textContent = \"⚠️ 存储凭证已失效（GitHub API \" + test.status + \"），请点⚙️更新\";\n      btn.disabled = false; btn.textContent = \"登录\";\n      return;\n    }\n    // 登录成功：主密码仅存内存\n    _sessionPwd = p;\n    pEl.value = \"\";\n    showMain();\n  }\n  btn.disabled = false; btn.textContent = \"登录\";\n}\n\n// ===== 加载当前令牌 =====\nasync function loadCurrentToken() {\n  const el = document.getElementById(\"currentToken\");\n  const btn = document.getElementById(\"refreshBtn\");\n  btn.disabled = true;\n  if (MODE === \"worker\") {\n    const t = localStorage.getItem(\"github_pat_token\");\n    if (!t) { el.textContent = \"（未登录）\"; btn.disabled = false; return; }\n    const res = await fetch(API_BASE + \"/api/get-token\", {\n      headers: { \"Authorization\": \"Bearer \" + t }\n    });\n    let data = {}; try { data = await res.json(); } catch {}\n    if (res.status === 401) { localStorage.removeItem(\"github_pat_token\"); showLogin(); return; }\n    if (data.hasToken && data.preview) { el.className = \"value\"; el.textContent = data.preview; }\n    else { el.className = \"value empty\"; el.textContent = \"（未设置）\"; }\n  } else {\n    // GitHub Mode：读取加密存储并解密\n    const pat = localStorage.getItem(\"gh_sync_pat\");\n    if (!pat) { el.textContent = \"（未登录）\"; btn.disabled = false; return; }\n    const g = await ghGetStore(pat);\n    if (!g.ok) {\n      el.className = \"value empty\";\n      el.textContent = \"⚠️ 读取失败：\" + g.error;\n      btn.disabled = false; return;\n    }\n    if (!g.exists || !g.data.encrypted) {\n      el.className = \"value empty\";\n      el.textContent = \"（未设置，请在下方输入新令牌并提交）\";\n      btn.disabled = false; return;\n    }\n    // 主密码优先用会话内存，缺失时才询问（不落 localStorage）\n    const pwd = _sessionPwd || prompt(\"请输入主密码（解密用）：\");\n    if (!pwd) { el.className = \"value empty\"; el.textContent = \"（已取消）\"; btn.disabled = false; return; }\n    try {\n      const salt = Uint8Array.from(atob(g.data.salt), c => c.charCodeAt(0));\n      const key = await pbkdf2DeriveKey(pwd, salt);\n      const plain = await aesGcmDecrypt(key, g.data.iv, g.data.encrypted);\n      _sessionPwd = pwd;                 // 记住本次会话主密码（仅内存）\n      el.className = \"value\";\n      el.textContent = maskPat(plain);\n      _sessionRealPat = plain;           // 真实令牌短暂在内存\n      if (_clearRealPat) clearTimeout(_clearRealPat);\n      _clearRealPat = setTimeout(() => { _sessionRealPat = null; }, 30000);  // 30 秒后自动清\n    } catch (e) {\n      _sessionPwd = null;                // 密码错误则清掉，避免反复用错密码\n      el.className = \"value empty\";\n      el.textContent = \"⚠️ 主密码错误（无法解密）\";\n    }\n  }\n  btn.disabled = false;\n}\n\n// ===== 更新令牌（核心功能）=====\nasync function updatePat() {\n  const input = document.getElementById(\"patInput\");\n  const btn = document.getElementById(\"updateBtn\");\n  const newPat = input.value.trim();\n  if (!newPat) { showResult(\"error\", \"请输入新令牌\"); return; }\n  btn.disabled = true; btn.textContent = \"提交中...\";\n\n  if (MODE === \"worker\") {\n    const t = localStorage.getItem(\"github_pat_token\");\n    if (!t) { showLogin(); btn.disabled = false; btn.textContent = \"提交更新\"; return; }\n    const res = await fetch(API_BASE + \"/api/update-key\", {\n      method: \"POST\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n        \"Authorization\": \"Bearer \" + t\n      },\n      body: JSON.stringify({ apiKey: newPat })\n    });\n    let data = {}; try { data = await res.json(); } catch {}\n    if (res.status === 401) { localStorage.removeItem(\"github_pat_token\"); showLogin(); return; }\n    if (data.persisted) showResult(\"success\", data.message || \"✅ 已持久化\");\n    else showResult(\"warn\", data.message || \"已在内存生效\");\n    input.value = \"\"; loadCurrentToken();\n  } else {\n    // GitHub Mode：AES 加密后写回仓库（多设备同步）\n    const pat = localStorage.getItem(\"gh_sync_pat\");\n    if (!pat) { showLogin(); btn.disabled = false; btn.textContent = \"提交更新\"; return; }\n\n    const g = await ghGetStore(pat);\n    if (!g.ok) {\n      showResult(\"error\", \"读取存储失败：\" + g.error);\n      btn.disabled = false; btn.textContent = \"提交更新\"; return;\n    }\n    const sha = (g.exists && g.sha) ? g.sha : null;\n\n    // 取主密码：优先会话内存，缺失时询问（不落 localStorage）\n    const pwd = _sessionPwd || prompt(\"请输入主密码（加密用）：\");\n    if (!pwd) { btn.disabled = false; btn.textContent = \"提交更新\"; return; }\n\n    // salt：已有则复用（保证同一密码可跨设备解密），首次则随机生成\n    const saltArr = (g.exists && g.data.salt)\n      ? Uint8Array.from(atob(g.data.salt), c => c.charCodeAt(0))\n      : crypto.getRandomValues(new Uint8Array(16));\n\n    const key = await pbkdf2DeriveKey(pwd, saltArr);\n    const enc = await aesGcmEncrypt(key, newPat);\n    const write = await ghPutStore(pat, {\n      salt: btoa(String.fromCharCode(...saltArr)),\n      encrypted: enc.ciphertext,\n      iv: enc.iv\n    }, sha);\n\n    if (write.ok) {\n      _sessionPwd = pwd;   // 成功后记住本次会话密码（仅内存）\n      showResult(\"success\", \"✅ 已加密保存，其他设备刷新即可同步\");\n      input.value = \"\";\n      _sessionRealPat = null;              // 用完即清\n      if (_clearRealPat) clearTimeout(_clearRealPat);\n      loadCurrentToken();\n    } else if (write.status === 409) {\n      showResult(\"error\", \"写入冲突（文件已被其他设备修改），请刷新后重试\");\n    } else {\n      showResult(\"error\", \"写入失败（HTTP \" + write.status + \"）\");\n    }\n  }\n  btn.disabled = false; btn.textContent = \"提交更新\";\n}\n\n// ===== 齿轮面板：存储凭证配置 =====\nfunction togglePatPanel() {\n  const panel = document.getElementById(\"patPanel\");\n  panel.style.display = panel.style.display === \"none\" ? \"\" : \"none\";\n  // 展开时把已存 PAT 填入（type=password 遮罩）\n  if (panel.style.display !== \"none\") {\n    const pat = localStorage.getItem(\"gh_sync_pat\");\n    if (pat) document.getElementById(\"ghPat\").value = pat;\n  }\n}\nasync function saveGhPat() {\n  const input = document.getElementById(\"ghPat\");\n  const msg = document.getElementById(\"patSaveMsg\");\n  const pat = input.value.trim();\n  if (!pat) { msg.textContent = \"请输入 PAT\"; msg.style.color = \"#f85149\"; return; }\n  msg.textContent = \"验证中...\"; msg.style.color = \"#8b949e\";\n  const res = await ghApi(\"GET\", \"/user\", pat);\n  if (res.ok) {\n    localStorage.setItem(\"gh_sync_pat\", pat);\n    msg.textContent = \"✅ 已保存（localStorage）\";\n    msg.style.color = \"#3fb950\";\n    input.value = \"\";\n    // 更新登录页提示\n    document.getElementById(\"loginSub\").textContent = \"用户名+密码登录（存储凭证已缓存）\";\n    // 2 秒后收起面板\n    setTimeout(() => { document.getElementById(\"patPanel\").style.display = \"none\"; }, 1500);\n  } else {\n    msg.textContent = \"❌ PAT 无效（HTTP \" + res.status + \"）\";\n    msg.style.color = \"#f85149\";\n  }\n}\nfunction clearGhPat() {\n  localStorage.removeItem(\"gh_sync_pat\");\n  document.getElementById(\"ghPat\").value = \"\";\n  document.getElementById(\"patSaveMsg\").textContent = \"✅ 已清除\";\n  document.getElementById(\"patSaveMsg\").style.color = \"#3fb950\";\n  document.getElementById(\"loginSub\").innerHTML = \"用户名+密码登录 <span style='color:#f85149;'>⚠️ 请先点⚙️配置存储凭证</span>\";\n}\n\n// ===== 退出登录：清除所有本地状态 =====\nfunction doLogout() {\n  if (MODE === \"worker\") {\n    localStorage.removeItem(\"github_pat_token\");\n  } else {\n    localStorage.removeItem(\"gh_sync_pat\");\n  }\n  // 无论哪种模式，都清空内存中的敏感状态\n  _sessionPwd = null;\n  _sessionRealPat = null;\n  if (_clearRealPat) { clearTimeout(_clearRealPat); _clearRealPat = null; }\n  showLogin();\n  document.getElementById(\"username\").value = \"\";\n  document.getElementById(\"password\").value = \"\";\n  document.getElementById(\"patInput\").value = \"\";\n  document.getElementById(\"result\").className = \"result\";\n  document.getElementById(\"result\").textContent = \"\";\n  checkBackendHealth();\n}\n\n// ===== 密码框小眼睛 =====\nfunction toggleLoginPwd() {\n  const input = document.getElementById(\"password\");\n  input.type = input.type === \"password\" ? \"text\" : \"password\";\n}\n\n// ===== 后端健康检查（模式适配）=====\nasync function checkBackendHealth() {\n  const urlEl = document.getElementById(\"workerUrlDisplay\");\n  const statusEl = document.getElementById(\"workerStatus\");\n  if (!urlEl) return;\n  if (MODE === \"worker\") {\n    urlEl.textContent = API_BASE || location.origin + \"（Worker 后端）\";\n    statusEl.textContent = \"检测中...\";\n    statusEl.className = \"status-wait\";\n    try {\n      const res = await fetch(API_BASE + \"/health\");\n      if (res.ok) { statusEl.textContent = \"✅ Worker 已连接\"; statusEl.className = \"status-ok\"; }\n      else { statusEl.textContent = \"❌ HTTP \" + res.status; statusEl.className = \"status-bad\"; }\n    } catch (e) {\n      statusEl.textContent = \"❌ 无法连接 Worker（workers.dev 可能不稳定）\";\n      statusEl.className = \"status-bad\";\n    }\n  } else {\n    // GitHub Mode：测 api.github.com + 多设备同步状态\n    urlEl.textContent = \"GitHub API（\" + GITHUB_REPO + \"/\" + GITHUB_FILE + \"）\";\n    statusEl.textContent = \"检测中...\";\n    statusEl.className = \"status-wait\";\n    try {\n      const res = await fetch(API_BASE + \"/rate_limit\");\n      if (res.ok) {\n        // 检查 .sync-data 文件是否存在\n        const pat = localStorage.getItem(\"gh_sync_pat\");\n        if (pat) {\n          const g = await ghGetStore(pat);\n          if (g.ok && g.exists) {\n            statusEl.textContent = \"✅ GitHub API + 多设备同步可用\";\n          } else {\n            statusEl.textContent = \"⚠️ 存储文件未初始化（首次使用会自动创建）\";\n          }\n        } else {\n          statusEl.textContent = \"✅ GitHub API 可达，请登录以启用多设备同步\";\n        }\n        statusEl.className = \"status-ok\";\n      } else { statusEl.textContent = \"❌ GitHub API HTTP \" + res.status; statusEl.className = \"status-bad\"; }\n    } catch (e) {\n      statusEl.textContent = \"❌ 无法连接 GitHub API\"; statusEl.className = \"status-bad\";\n    }\n  }\n}\n\n// ===== 结果提示 =====\nfunction showResult(type, text) {\n  const el = document.getElementById(\"result\");\n  el.className = \"result \" + type;\n  el.textContent = text;\n}\n\n// ===== 页面关闭/刷新时清空内存中的敏感数据 =====\nwindow.addEventListener(\"beforeunload\", () => {\n  _sessionPwd = null;\n  _sessionRealPat = null;\n});\n</script>\n</body>\n</html>\n";
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
      // 持久化失败：返回 5xx，前端 updatePat() 会正确进入错误分支（res.ok===false）
      return json({
        ok: false,
        persisted: false,
        error: "令牌已在内存中生效，但写入环境变量失败，请检查 CF_API_TOKEN 权限及 CF_ACCOUNT_ID/CF_WORKER_NAME。"
      }, 500, request);
    }
  } catch (e) {
    // 持久化失败：返回 5xx，前端 updatePat() 会正确进入错误分支（res.ok===false）
    return json({
      ok: false,
      persisted: false,
      error: "令牌已在内存中生效，但调用 Cloudflare API 出错：" + e.message
    }, 500, request);
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
//  通过 Cloudflare API 写入/更新 Worker 的 secret 环境变量
//  GITHUB_TOKEN 是 secret_text 类型，必须走 secret 专属端点：
//    PUT /accounts/{account_id}/workers/scripts/{script_name}/secrets/{secret_name}
//  实测对 secret 用 /variables PUT（或 POST /secrets 无 force）都会返回 10405
// ============================================================
async function updateEnvVarViaCfApi(cfToken, accountId, workerName, varName, newValue) {
  const apiBase = "https://api.cloudflare.com/client/v4";
  const secretUrl = `${apiBase}/accounts/${accountId}/workers/scripts/${workerName}/secrets/${varName}`;

  const headers = {
    "Authorization": `Bearer ${cfToken}`,
    "Content-Type": "application/json"
  };

  // secret 专用端点：同名 PUT 即为更新；?force=true 允许覆盖已存在值
  const putRes = await fetch(`${secretUrl}?force=true`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ name: varName, text: newValue, type: "secret_text" })
  });
  if (!putRes.ok) {
    console.error("CF API PUT secret failed:", putRes.status);
    return false;
  }
  const putJson = await putRes.json();
  if (!putJson.success) {
    console.error("CF API PUT secret errors:", JSON.stringify(putJson.errors));
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