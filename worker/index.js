/**
 * ============================================================
 *  GitHub 令牌管理 —— Cloudflare Workers 后端
 * ============================================================
 *  安全架构（方案 A）：
 *    - 原始 GitHub PAT 只存在 Worker 环境变量 GITHUB_TOKEN
 *    - 前端只拿到一个临时登录 token，永远拿不到 GitHub PAT
 *    - 通过 Cloudflare API 修改自身环境变量，实现持久化更新
 * ------------------------------------------------------------
 *  需要在 Cloudflare Dashboard 配置的环境变量：
 *    USER_NAME        登录账号
 *    USER_PASS        登录密码（加密）
 *    CF_ACCOUNT_ID   Cloudflare 账户 ID（加密）
 *    CF_WORKER_NAME  当前 Worker 脚本名（如 traemy）
 *    CF_API_TOKEN     Workers Scripts:Edit 权限的 API Token（加密）
 *    FRONT_ORIGIN     允许的前端域名（如 https://1rc2.github.io）
 *  —— 数据变量（通过网页更新，初始可留空）：
 *    GITHUB_TOKEN     GitHub 个人访问令牌（加密）
 * ============================================================
 */

// ===== 内存中的 token 表 =====
// Map<token, 过期时间戳>
// 注意：Workers 无状态，实例重启会丢；单人自用足够。
const tokenStore = new Map();
const TOKEN_TTL = 1000 * 60 * 60 * 12; // 12 小时

// 默认允许的前端域名（兜底，实际取环境变量 FRONT_ORIGIN）
const DEFAULT_ORIGIN = "https://1rc2.github.io";

// ===== 内存中的 GitHub 令牌覆盖缓存 =====
// 当用户通过前端提交新 PAT 时：
//   1) 先写入此处，立即生效（无需等待 Worker 重启）
//   2) 再通过 Cloudflare API 把新 PAT 写入环境变量 GITHUB_TOKEN（持久化）
let tokenOverride = null; // string | null

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
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
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true }, 200, env);
    }

    return json({ error: "Not Found" }, 404, env);
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
    return json({ error: "请求体格式错误，应为 JSON" }, 400, env);
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return json({ error: "账号和密码不能为空" }, 400, env);
  }

  // 校验账号密码（环境变量，不硬编码）
  if (username !== env.USER_NAME || password !== env.USER_PASS) {
    return json({ error: "账号或密码错误" }, 401, env);
  }

  // 生成临时 token 并写入内存表
  const token = generateToken();
  tokenStore.set(token, Date.now() + TOKEN_TTL);

  return json({ token }, 200, env);
}

// ============================================================
//  令牌更新接口：POST /api/update-key
//  入参 Header：Authorization: Bearer <token>
//  入参 Body：  { apiKey: "新的 GitHub PAT" }
//  返回：{ ok, persisted, message }
// ============================================================
async function handleUpdateKey(request, env) {
  // 1. 校验 token
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, env);
  }

  // 2. 解析新 PAT
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体格式错误，应为 JSON" }, 400, env);
  }
  const { apiKey } = body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return json({ error: "新令牌不能为空" }, 400, env);
  }
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return json({ error: "新令牌不能为空" }, 400, env);
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
    }, 200, env);
  }

  try {
    const persisted = await updateEnvVarViaCfApi(cfToken, cfAccountId, cfWorkerName, "GITHUB_TOKEN", trimmed);
    if (persisted) {
      return json({
        ok: true,
        persisted: true,
        message: "令牌已更新并持久化到 Worker 环境变量 GITHUB_TOKEN，重启后仍有效。"
      }, 200, env);
    } else {
      return json({
        ok: false,
        persisted: false,
        message: "令牌已在内存中生效，但写入环境变量失败，请检查 CF_API_TOKEN 权限及 CF_ACCOUNT_ID/CF_WORKER_NAME。"
      }, 200, env);
    }
  } catch (e) {
    return json({
      ok: false,
      persisted: false,
      message: "令牌已在内存中生效，但调用 Cloudflare API 出错：" + e.message
    }, 200, env);
  }
}

// ============================================================
//  令牌读取接口：GET /api/get-token
//  返回当前 GitHub PAT（仅脱敏后的前缀+后缀，不返回完整令牌）
//  返回：{ hasToken, preview }  或  { error }
// ============================================================
async function handleGetToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, env);
  }

  const pat = tokenOverride || env.GITHUB_TOKEN;
  if (!pat) {
    return json({ hasToken: false, preview: "" }, 200, env);
  }
  // 脱敏：只返回前4位 + **** + 后4位
  const preview = pat.length > 12
    ? pat.slice(0, 4) + "****" + pat.slice(-4)
    : "****";
  return json({ hasToken: true, preview }, 200, env);
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

function corsHeaders(env) {
  const origin = env.FRONT_ORIGIN || DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env)
    }
  });
}
