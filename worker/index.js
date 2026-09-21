// ===== 内嵌前端页面（构建时由 index.html 自动注入，见 README 第五节） =====
const FRONTEND_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>GitHub 令牌管理</title>\n<style>\n  /* ===== 全局重置 + 深色主题 ===== */\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  html, body { height: 100%; }\n  body {\n    font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n    background: #0d1117;\n    color: #e6edf3;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-height: 100vh;\n  }\n\n  /* ===== 主页面 ===== */\n  .main-wrap {\n    width: 100%;\n    max-width: 560px;\n    padding: 20px;\n  }\n  .main-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 24px;\n  }\n  .main-header h1 {\n    font-size: 18px;\n    color: #4e9acd;\n  }\n\n  /* ===== 令牌更新卡片 ===== */\n  .card {\n    background: #161b22;\n    border: 1px solid #30363d;\n    border-radius: 12px;\n    padding: 28px;\n  }\n  .card h2 {\n    font-size: 18px;\n    color: #4e9acd;\n    margin-bottom: 8px;\n  }\n  .card .hint {\n    font-size: 13px;\n    color: #8b949e;\n    line-height: 1.6;\n    margin-bottom: 20px;\n  }\n\n  /* ===== 当前令牌状态 ===== */\n  .current-token {\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    padding: 14px 16px;\n    margin-bottom: 20px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n  }\n  .current-token .label {\n    font-size: 12px;\n    color: #8b949e;\n    margin-bottom: 4px;\n  }\n  .current-token .value {\n    font-size: 14px;\n    color: #e6edf3;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    word-break: break-all;\n  }\n  .current-token .value.empty { color: #f85149; }\n  .current-token .refresh-btn {\n    flex-shrink: 0;\n    height: 30px;\n    padding: 0 12px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 6px;\n    color: #8b949e;\n    font-size: 12px;\n    cursor: pointer;\n  }\n  .current-token .refresh-btn:hover { border-color: #4e9acd; color: #4e9acd; }\n  .current-token .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }\n  .card label {\n    display: block;\n    font-size: 13px;\n    color: #8b949e;\n    margin: 14px 0 6px;\n  }\n  .card .input-row {\n    display: flex;\n    gap: 10px;\n  }\n  .card input {\n    flex: 1;\n    height: 42px;\n    padding: 0 12px;\n    background: #0d1117;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #e6edf3;\n    font-size: 14px;\n    outline: none;\n    font-family: \"Menlo\", \"Consolas\", monospace;\n    transition: border-color .15s;\n  }\n  .card input:focus { border-color: #4e9acd; }\n  .btn-toggle {\n    width: 60px;\n    height: 42px;\n    background: transparent;\n    border: 1px solid #30363d;\n    border-radius: 8px;\n    color: #8b949e;\n    font-size: 13px;\n    cursor: pointer;\n  }\n  .btn-toggle:hover { border-color: #4e9acd; color: #4e9acd; }\n  .btn-submit {\n    width: 100%;\n    height: 42px;\n    margin-top: 14px;\n    background: #4e9acd;\n    border: none;\n    border-radius: 8px;\n    color: #fff;\n    font-size: 15px;\n    cursor: pointer;\n  }\n  .btn-submit:hover { background: #3d8ab9; }\n  .btn-submit:disabled { background: #3a3f4a; cursor: not-allowed; }\n\n  /* ===== 结果提示 ===== */\n  .result {\n    margin-top: 16px;\n    padding: 12px 14px;\n    border-radius: 8px;\n    font-size: 13px;\n    line-height: 1.6;\n    display: none;\n  }\n  .result.success {\n    display: block;\n    background: rgba(63, 185, 80, 0.12);\n    border: 1px solid #2ea043;\n    color: #3fb950;\n  }\n  .result.error {\n    display: block;\n    background: rgba(248, 81, 73, 0.12);\n    border: 1px solid #f85149;\n    color: #ff7b72;\n  }\n  .result.warn {\n    display: block;\n    background: rgba(210, 153, 34, 0.12);\n    border: 1px solid #d29922;\n    color: #e3b341;\n  }\n\n  /* ===== 滚动条 ===== */\n  ::-webkit-scrollbar { width: 8px; }\n  ::-webkit-scrollbar-track { background: #0d1117; }\n  ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }\n  ::-webkit-scrollbar-thumb:hover { background: #4e9acd; }\n</style>\n</head>\n<body>\n\n<!-- ===== 主页面（无登录，直接显示） ===== -->\n<div class=\"main-wrap\">\n  <div class=\"main-header\">\n    <h1>GitHub 令牌管理</h1>\n  </div>\n  <div class=\"card\">\n    <h2>更新 GitHub 个人访问令牌</h2>\n    <p class=\"hint\">输入新的 GitHub PAT（Personal Access Token），提交后立即生效。若已配置 Cloudflare API 凭证，令牌将持久化写入 Worker 环境变量，重启后仍有效。</p>\n\n    <!-- 当前令牌状态（脱敏预览，从后端 /api/get-token 获取） -->\n    <div class=\"current-token\">\n      <div>\n        <div class=\"label\">当前令牌</div>\n        <div class=\"value empty\" id=\"currentToken\">加载中...</div>\n      </div>\n      <button class=\"refresh-btn\" id=\"refreshBtn\" onclick=\"loadCurrentToken()\">刷新</button>\n    </div>\n\n    <label for=\"patInput\">新的 GitHub 令牌</label>\n    <div class=\"input-row\">\n      <input id=\"patInput\" type=\"password\" autocomplete=\"off\" placeholder=\"ghp_xxxxxxxxxxxx 或 github_pat_xxxxxxxxxxxx\">\n      <button class=\"btn-toggle\" onclick=\"toggleVisibility()\" id=\"toggleBtn\">显示</button>\n    </div>\n    <button class=\"btn-submit\" id=\"updateBtn\" onclick=\"updatePat()\">提交更新</button>\n    <div class=\"result\" id=\"result\"></div>\n  </div>\n</div>\n\n<script>\n/* ============================================================\n * 前端逻辑说明\n * ------------------------------------------------------------\n * 前端与后端同源部署在 Cloudflare Worker 上，\n * 直接调用相对路径 /api/update-key 和 /api/get-token，\n * 不需要任何登录认证。\n * ============================================================ */\n\n// 页面加载完成后自动读取当前令牌\nwindow.addEventListener(\"DOMContentLoaded\", () => {\n  loadCurrentToken();\n  document.getElementById(\"patInput\").focus();\n});\n\n// ===== 加载当前令牌（脱敏预览） =====\nasync function loadCurrentToken() {\n  const el = document.getElementById(\"currentToken\");\n  const btn = document.getElementById(\"refreshBtn\");\n  el.className = \"value empty\";\n  el.textContent = \"加载中...\";\n  btn.disabled = true;\n  try {\n    const res = await fetch(\"/api/get-token\", { method: \"GET\" });\n    const data = await res.json();\n    if (res.ok) {\n      if (data.hasToken && data.preview) {\n        el.className = \"value\";\n        el.textContent = data.preview;\n      } else {\n        el.className = \"value empty\";\n        el.textContent = \"（未设置）\";\n      }\n    } else {\n      el.className = \"value empty\";\n      el.textContent = data.error || \"加载失败\";\n    }\n  } catch (e) {\n    el.className = \"value empty\";\n    el.textContent = \"网络错误：\" + e.message;\n  } finally {\n    btn.disabled = false;\n  }\n}\n\n// ===== 更新 GitHub PAT =====\nasync function updatePat() {\n  const input = document.getElementById(\"patInput\");\n  const btn = document.getElementById(\"updateBtn\");\n  const newPat = input.value.trim();\n  const result = document.getElementById(\"result\");\n  result.className = \"result\";\n  result.textContent = \"\";\n  if (!newPat) {\n    showResult(\"error\", \"请输入新的 GitHub 令牌\");\n    return;\n  }\n\n  btn.disabled = true;\n  btn.textContent = \"提交中...\";\n  try {\n    const res = await fetch(\"/api/update-key\", {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify({ apiKey: newPat })\n    });\n    const data = await res.json();\n    if (res.ok) {\n      if (data.persisted) {\n        showResult(\"success\", data.message || \"令牌更新成功，已持久化到环境变量\");\n      } else {\n        showResult(\"warn\", data.message || \"令牌已在内存中生效，但未持久化\");\n      }\n      input.value = \"\";\n      loadCurrentToken();\n    } else {\n      showResult(\"error\", data.error || \"更新失败\");\n    }\n  } catch (e) {\n    showResult(\"error\", \"网络错误：\" + e.message);\n  } finally {\n    btn.disabled = false;\n    btn.textContent = \"提交更新\";\n  }\n}\n\n// ===== 令牌框：显示/隐藏切换 =====\nfunction toggleVisibility() {\n  const input = document.getElementById(\"patInput\");\n  const btn = document.getElementById(\"toggleBtn\");\n  if (input.type === \"password\") {\n    input.type = \"text\";\n    btn.textContent = \"隐藏\";\n  } else {\n    input.type = \"password\";\n    btn.textContent = \"显示\";\n  }\n}\n\n// ===== 显示结果提示 =====\nfunction showResult(type, text) {\n  const el = document.getElementById(\"result\");\n  el.className = \"result \" + type;\n  el.textContent = text;\n}\n</script>\n</body>\n</html>\n";

/**
 * ============================================================
 *  GitHub 令牌管理 —— Cloudflare Workers 后端（方案 A：同源自托管）
 * ============================================================
 *  这个 Worker 同时提供：
 *    1. 前端页面        GET  /  /index.html  → 返回 index.html
 *    2. 令牌更新接口    POST /api/update-key
 *    3. 令牌读取接口    GET  /api/get-token（返回脱敏预览）
 *    4. 健康检查        GET  /health
 *  ------------------------------------------------------------
 *  需要在 Cloudflare Dashboard 配置的环境变量：
 *    CF_ACCOUNT_ID   Cloudflare 账户 ID
 *    CF_WORKER_NAME  当前 Worker 脚本名（如 traemy）
 *    CF_API_TOKEN     Workers Scripts:Edit 权限的 API Token
 *    GITHUB_TOKEN     GitHub 个人访问令牌（初始可留空，通过网页更新）
 * ============================================================
 */

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
//  令牌更新接口：POST /api/update-key
//  Body：  { apiKey: "新的 GitHub PAT" }
//  返回：{ ok, persisted, message }
// ============================================================
async function handleUpdateKey(request, env) {
  // 解析新 PAT
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

  // 立即写入内存缓存，使新 PAT 对当前实例立即生效
  tokenOverride = trimmed;

  // 尝试通过 Cloudflare API 持久化到环境变量 GITHUB_TOKEN
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
//  返回：{ hasToken, preview }
// ============================================================
async function handleGetToken(request, env) {
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

// CORS：反射请求的 Origin 头。同源部署时用不上，但保留便于外部引用。
function corsHeaders(request) {
  let origin = "*";
  if (request) {
    origin = request.headers.get("Origin") || "*";
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
