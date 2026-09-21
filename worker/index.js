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

  // 3. 读取环境变量中的密钥与地址（不写死、不返回前端）
  const apiKey = env.TRAE_API_KEY;
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
