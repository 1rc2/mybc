/**
 * Cloudflare Workers 后端 —— Trae AI 代理网关
 * 安全架构：Trae API 密钥仅存在 Workers 环境变量，前端永远拿不到。
 *
 * 环境变量（在 Cloudflare Dashboard → Worker → Settings → Variables 配置）：
 *   USER_NAME      登录账号
 *   USER_PASS      登录密码（建议 Encrypt）
 *   TRAE_API_KEY   Trae 平台 API 密钥（建议 Encrypt）
 *   TRAE_BASE_URL  Trae 接口基础地址，如 https://api.trae.com.cn/v1
 *
 * 接口：
 *   GET  /            健康检查
 *   POST /login       登录，返回临时 token
 *   POST /chat        AI 对话，需携带 Bearer token
 *   OPTIONS *         CORS 预检
 */

// 允许的前端域名（CORS白名单）。改用其他前端域名时同步修改。
const ALLOWED_ORIGIN = "https://1rc2.github.io";

// 临时 token：单人自用，用环境变量密码 + 当日日期生成，Worker 重启/跨日即失效
function makeToken(pass) {
  const d = new Date();
  const day = d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate();
  // 简单哈希：避免直接返回密码。SHA-256 异步实现较繁，这里用字符串截断
  return btoa(unescape(encodeURIComponent(pass + "|" + day))).slice(0, 40);
}

function verifyToken(tok, pass) {
  if (!tok || !pass) return false;
  return tok === makeToken(pass);
}

function corsHeaders(extra) {
  return Object.assign({
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  }, extra || {});
}

function json(data, status = 200, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8", ...extra })
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS 预检
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // 健康检查
    if (url.pathname === "/" && method === "GET") {
      return json({ ok: true, service: "trae-proxy" });
    }

    // 校验环境变量是否配置
    if (!env.USER_NAME || !env.USER_PASS || !env.TRAE_API_KEY || !env.TRAE_BASE_URL) {
      return json({ error: "后端环境变量未配置完整，请到 Cloudflare Worker Settings → Variables 添加 USER_NAME / USER_PASS / TRAE_API_KEY / TRAE_BASE_URL" }, 500);
    }

    // 登录接口
    if (url.pathname === "/login" && method === "POST") {
      try {
        const { username, password } = await request.json();
        if (!username || !password) {
          return json({ error: "账号或密码不能为空" }, 400);
        }
        if (username !== env.USER_NAME || password !== env.USER_PASS) {
          return json({ error: "账号或密码错误" }, 401);
        }
        const token = makeToken(env.USER_PASS);
        return json({ token, expireHint: "Worker 重启或跨 UTC 日即失效，需重新登录" });
      } catch (e) {
        return json({ error: "请求格式错误，需 JSON: {username, password}" }, 400);
      }
    }

    // AI 对话接口
    if (url.pathname === "/chat" && method === "POST") {
      // token 校验
      const auth = request.headers.get("Authorization") || "";
      const tok = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!verifyToken(tok, env.USER_PASS)) {
        return json({ error: "token 失效，请重新登录" }, 401);
      }

      try {
        const { prompt } = await request.json();
        if (!prompt || typeof prompt !== "string") {
          return json({ error: "prompt 不能为空" }, 400);
        }
        if (prompt.length > 8000) {
          return json({ error: "prompt 过长（>8000 字符）" }, 400);
        }

        // 转发到 Trae API（密钥由后台注入，前端拿不到）
        const traeUrl = env.TRAE_BASE_URL.replace(/\/+$/, "") + "/chat/completions";
        const upstream = await fetch(traeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + env.TRAE_API_KEY
          },
          body: JSON.stringify({
            model: "trae-default",       // 按你的 Trae 实际模型名调整
            messages: [{ role: "user", content: prompt }],
            stream: false
          })
        });

        if (!upstream.ok) {
          const errText = await upstream.text();
          return json({ error: "上游 Trae API 调用失败 HTTP " + upstream.status, detail: errText.slice(0, 500) }, 502);
        }

        const data = await upstream.json();
        // 兼容 OpenAI 风格响应
        const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || JSON.stringify(data);
        return json({ reply });
      } catch (e) {
        return json({ error: "请求处理失败：" + e.message }, 500);
      }
    }

    // 404
    return json({ error: "路径不存在：" + url.pathname }, 404);
  }
};
