// ===== 内嵌前端页面（构建时由 index.html 自动注入，见 README 第五节） =====
const FRONTEND_HTML = "__FRONTEND_HTML__";

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
