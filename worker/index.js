/**
 * ============================================================
 *  Trae AI 代理 —— Cloudflare Workers 后端
 * ============================================================
 *  安全架构（方案 A）：
 *    - 原始 Trae API 密钥只存在 Worker 环境变量
 *    - 前端只拿到一个临时登录 token，永远拿不到 API 密钥
 *    - 所有对 Trae 的请求都在 Worker 内部完成，密钥不出后端
 * ------------------------------------------------------------
 *  需要在 Cloudflare Dashboard 配置的环境变量：
 *    USER_NAME      登录账号
 *    USER_PASS      登录密码
 *    TRAE_API_KEY   Trae 的 API 密钥
 *    TRAE_BASE_URL  Trae 接口基础地址（含版本路径，如 https://api.trae.com.cn/v1）
 *    FRONT_ORIGIN   允许的前端域名（如 https://1rc2.github.io）
 *    MODEL_NAME     调用的模型名（可选，默认 default）
 *  —— 以下 3 个用于「密钥更新」功能（通过 Cloudflare API 修改 TRAE_API_KEY 环境变量）：
 *    CF_API_TOKEN   Cloudflare API Token，需具备 Workers Scripts: Edit 权限
 *    CF_ACCOUNT_ID  Cloudflare 账户 ID（Dashboard 右侧栏可见）
 *    CF_WORKER_NAME 当前 Worker 的脚本名称（如 trae-proxy）
 * ============================================================
 */

// ===== 内存中的临时 token 表 =====
// Map<token, 过期时间戳>
// 注意：Workers 是无状态的，实例重启会丢；
// 单人自用场景足够，如需多实例/持久化可改用 Cloudflare KV。
const tokenStore = new Map();
const TOKEN_TTL = 1000 * 60 * 60 * 12; // 12 小时

// 默认允许的前端域名（兜底，实际取环境变量 FRONT_ORIGIN）
const DEFAULT_ORIGIN = "https://1rc2.github.io";

// 默认系统提示词，可被环境变量 SYSTEM_PROMPT 覆盖
const DEFAULT_SYSTEM_PROMPT = "你是一个有帮助的 AI 助手。";

// ===== 内存中的 API 密钥覆盖缓存 =====
// 当用户通过前端「密钥更新」提交新密钥时：
//   1) 先写入此处，使 /api/ai 立即使用新密钥（无需等待 Worker 重启）
//   2) 再通过 Cloudflare API 把新密钥写入环境变量，实现持久化
// 若 Cloudflare API 调用失败，此处仍会生效（仅在当前实例生命周期内）。
let apiKeyOverride = null; // string | null

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
    if (url.pathname === "/api/ai" && request.method === "POST") {
      return handleAI(request, env);
    }
    if (url.pathname === "/api/update-key" && request.method === "POST") {
      return handleUpdateKey(request, env);
    }

    // 健康检查（可选，方便排查 Worker 是否在线）
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

  // 校验账号密码（环境变量，不硬编码在代码里）
  if (username !== env.USER_NAME || password !== env.USER_PASS) {
    return json({ error: "账号或密码错误" }, 401, env);
  }

  // 生成临时 token 并写入内存表
  const token = generateToken();
  tokenStore.set(token, Date.now() + TOKEN_TTL);

  return json({ token }, 200, env);
}

// ============================================================
//  AI 代理接口：POST /api/ai
//  入参 Header：Authorization: Bearer <token>
//  入参 Body：  { prompt: "用户问题" }
//  返回：{ reply }  或  { error }
// ============================================================
async function handleAI(request, env) {
  // 1. 校验 token
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, env);
  }

  // 2. 解析 prompt
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体格式错误，应为 JSON" }, 400, env);
  }
  const { prompt } = body || {};
  if (!prompt || typeof prompt !== "string") {
    return json({ error: "prompt 不能为空" }, 400, env);
  }

  // 3. 读取密钥与地址（不写死、不返回前端）
  //    优先使用内存中的覆盖值（用户刚提交的新密钥），兜底用环境变量
  const apiKey = apiKeyOverride || env.TRAE_API_KEY;
  const baseUrl = (env.TRAE_BASE_URL || "").replace(/\/+$/, "");
  if (!apiKey || !baseUrl) {
    return json({ error: "服务端未配置 Trae 密钥或接口地址" }, 500, env);
  }

  // 4. 转发请求到 Trae API（OpenAI 兼容格式）
  //    TRAE_BASE_URL 已含版本路径（如 https://api.trae.com.cn/v1），
  //    这里只追加 /chat/completions；若 Trae 接口路径不同请修改下方 URL。
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`   // 密钥只在这里出现，不会返回前端
      },
      body: JSON.stringify({
        model: env.MODEL_NAME || "default",
        messages: [
          { role: "system", content: env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        stream: false
      })
    });

    if (!upstream.ok) {
      // 上游错误：只透传状态码与简短说明，不泄露密钥信息
      return json(
        { error: `Trae 接口返回错误 (HTTP ${upstream.status})` },
        upstream.status,
        env
      );
    }

    const data = await upstream.json();
    // OpenAI 兼容响应：choices[0].message.content
    const reply = data?.choices?.[0]?.message?.content || "(空回复)";
    return json({ reply }, 200, env);
  } catch (e) {
    return json({ error: "调用 Trae 接口失败：" + e.message }, 502, env);
  }
}

// ============================================================
//  密钥更新接口：POST /api/update-key
//  入参 Header：Authorization: Bearer <token>
//  入参 Body：  { apiKey: "新的 Trae API 密钥" }
//  返回：{ ok: true, persisted: true/false, message }
//  说明：
//    - 先写入内存缓存，使新密钥立即生效
//    - 若配置了 CF_API_TOKEN/CF_ACCOUNT_ID/CF_WORKER_NAME，则通过 Cloudflare API
//      把新密钥写入环境变量 TRAE_API_KEY（持久化，Worker 重启后仍有效）
//    - 若未配置上述 3 个变量，则只更新内存（返回 persisted:false，重启失效）
// ============================================================
async function handleUpdateKey(request, env) {
  // 1. 校验 token
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isTokenValid(token)) {
    return json({ error: "token 失效，请重新登录" }, 401, env);
  }

  // 2. 解析新密钥
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求体格式错误，应为 JSON" }, 400, env);
  }
  const { apiKey } = body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return json({ error: "新密钥不能为空" }, 400, env);
  }
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return json({ error: "新密钥不能为空" }, 400, env);
  }

  // 3. 立即写入内存缓存，使新密钥对当前实例立即生效
  apiKeyOverride = trimmed;

  // 4. 尝试通过 Cloudflare API 持久化到环境变量
  const cfToken = env.CF_API_TOKEN;
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfWorkerName = env.CF_WORKER_NAME;
  if (!cfToken || !cfAccountId || !cfWorkerName) {
    // 未配置 Cloudflare API 凭证：只更新内存，不持久化
    return json({
      ok: true,
      persisted: false,
      message: "密钥已更新（仅当前实例生效，Worker 重启后失效）。如需持久化，请在环境变量中配置 CF_API_TOKEN、CF_ACCOUNT_ID、CF_WORKER_NAME。"
    }, 200, env);
  }

  try {
    const persisted = await updateEnvVarViaCfApi(cfToken, cfAccountId, cfWorkerName, trimmed);
    if (persisted) {
      return json({
        ok: true,
        persisted: true,
        message: "密钥已更新并持久化到 Worker 环境变量，重启后仍有效。"
      }, 200, env);
    } else {
      return json({
        ok: false,
        persisted: false,
        message: "密钥已在内存中生效，但写入环境变量失败，请检查 CF_API_TOKEN 权限及 CF_ACCOUNT_ID/CF_WORKER_NAME 是否正确。"
      }, 200, env);
    }
  } catch (e) {
    return json({
      ok: false,
      persisted: false,
      message: "密钥已在内存中生效，但调用 Cloudflare API 出错：" + e.message
    }, 200, env);
  }
}

// ============================================================
//  通过 Cloudflare API 更新 Worker 环境变量 TRAE_API_KEY
//  步骤：
//    1) GET 当前所有变量
//    2) 找到 TRAE_API_KEY 条目，替换其值为 newKey（保留其余变量不变）
//    3) PUT 回完整变量列表（Cloudflare 的 PUT 是全量替换，不能只放一个）
//  返回：true 成功，false 失败
// ============================================================
async function updateEnvVarViaCfApi(cfToken, accountId, workerName, newKey) {
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
  // vars 结构：[{name, value, type, ...}]
  const vars = Array.isArray(getJson.result) ? getJson.result : [];

  // 2) 替换 TRAE_API_KEY 的值，其余保持不变
  let found = false;
  const updatedVars = vars.map(v => {
    if (v.name === "TRAE_API_KEY") {
      found = true;
      // type 保持原类型（通常是 secret_text），只改 value
      return { name: v.name, value: newKey, type: v.type || "secret_text" };
    }
    // 保留原有字段，但只回传 name/value/type（CF API 要求）
    return { name: v.name, value: v.value, type: v.type };
  });
  // 若变量列表里原本没有 TRAE_API_KEY，则追加
  if (!found) {
    updatedVars.push({ name: "TRAE_API_KEY", value: newKey, type: "secret_text" });
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

// 校验 token 是否存在且未过期
function isTokenValid(token) {
  const exp = tokenStore.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    tokenStore.delete(token);  // 自动清理过期 token
    return false;
  }
  return true;
}

// 生成随机 token：16 字节随机数 + 时间戳
function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return hex + "_" + Date.now().toString(36);
}

// CORS 头：允许指定的前端域名
function corsHeaders(env) {
  const origin = env.FRONT_ORIGIN || DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

// 统一 JSON 响应（带 CORS 头）
function json(obj, status, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env)
    }
  });
}
