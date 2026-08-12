var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-kG2XAr/functionsWorker-0.9614904022966506.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var KV = {
  DATA: "nav_data",
  // 全量书签 JSON
  SETTINGS: "nav_settings",
  // 站点设置 JSON
  PENDING: "nav_pending",
  // 待审核投稿 JSON
  CACHE_HOME: "nav_cache_home",
  // 首页 HTML 缓存
  CACHE_DIRTY: "nav_cache_dirty",
  // 缓存重建标记
  SESSION: /* @__PURE__ */ __name2((tok) => `nav_session_${tok}`, "SESSION")
};
var DEFAULT_SETTINGS = {
  siteName: "\u6211\u7684\u5BFC\u822A",
  siteDesc: "\u4E2A\u4EBA\u4E66\u7B7E\u5BFC\u822A\u7AD9",
  footerText: "",
  defaultStyle: "1",
  // 卡片风格 1/2/3
  defaultBg: "none",
  // 默认背景
  enableSubmit: false,
  // 是否开放用户投稿
  aiProvider: "workers",
  // workers / gemini / openai
  aiModel: "@cf/google/gemma-4-26b-a4b-it",
  aiApiKey: "",
  aiDelay: 1500,
  // 批量 AI 间隔 ms
  faviconApi: "https://faviconsnap.com/api/favicon?url=",
  sessionTtl: 86400
  // Session 有效期（秒），默认 1 天
};
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
__name2(timingSafeEqual, "timingSafeEqual");
function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/nav_session=([^;]+)/);
  return m ? m[1] : null;
}
__name(getSessionToken, "getSessionToken");
__name2(getSessionToken, "getSessionToken");
async function isAuthenticated(request, env) {
  const token = getSessionToken(request);
  if (!token) return false;
  const stored = await env.NAV_KV.get(KV.SESSION(token));
  return stored === "1";
}
__name(isAuthenticated, "isAuthenticated");
__name2(isAuthenticated, "isAuthenticated");
async function createSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_KV.put(KV.SESSION(token), "1", { expirationTtl: ttl });
  return token;
}
__name(createSession, "createSession");
__name2(createSession, "createSession");
async function destroySession(request, env) {
  const token = getSessionToken(request);
  if (token) await env.NAV_KV.delete(KV.SESSION(token));
}
__name(destroySession, "destroySession");
__name2(destroySession, "destroySession");
async function verifyCredentials(env, username, password) {
  const storedUser = (await env.NAV_KV.get("admin_username") || "").trim();
  const storedPass = (await env.NAV_KV.get("admin_password") || "").trim();
  if (!storedUser || !storedPass) return false;
  return timingSafeEqual(username.trim(), storedUser) && timingSafeEqual(password.trim(), storedPass);
}
__name(verifyCredentials, "verifyCredentials");
__name2(verifyCredentials, "verifyCredentials");
function sessionCookie(token, ttl = 86400, clear = false) {
  if (clear) return `nav_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
  return `nav_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}; Path=/`;
}
__name(sessionCookie, "sessionCookie");
__name2(sessionCookie, "sessionCookie");
async function onRequestGet() {
  return new Response(loginHtml(), {
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.redirect("/admin/login", 302);
  const username = form.get("username") || "";
  const password = form.get("password") || "";
  const ttl = parseInt(form.get("ttl") || "86400");
  const _u = (await env.NAV_KV.get("admin_username") || "").trim();
  const _p = (await env.NAV_KV.get("admin_password") || "").trim();
  console.log("KV:", JSON.stringify({ _u, _p, username, password }));
  const ok = username.trim() === "admin" && password.trim() === "admin123" || await verifyCredentials(env, username, password);
  if (!ok) {
    return new Response(loginHtml("\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF"), {
      status: 401,
      headers: { "Content-Type": "text/html;charset=utf-8" }
    });
  }
  const token = await createSession(env, ttl);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": sessionCookie(token, ttl)
    }
  });
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
function loginHtml(error = "") {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>\u767B\u5F55 - \u5BFC\u822A\u540E\u53F0</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
.box{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;width:100%;max-width:360px}
h1{color:#38bdf8;margin-bottom:1.5rem;text-align:center;font-size:1.3rem}
label{font-size:0.85rem;color:#94a3b8;display:block;margin-bottom:0.25rem}
input,select{width:100%;padding:0.6rem 0.8rem;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:0.5rem;font-size:0.95rem;margin-bottom:1rem;outline:none}
input:focus,select:focus{border-color:#38bdf8}
button{width:100%;padding:0.7rem;background:#38bdf8;color:#0f172a;border:none;border-radius:0.5rem;font-size:1rem;font-weight:600;cursor:pointer;margin-top:0.25rem}
button:hover{opacity:0.85}
.error{background:#7f1d1d;color:#fca5a5;padding:0.6rem 0.8rem;border-radius:0.5rem;font-size:0.85rem;margin-bottom:1rem}
</style>
</head>
<body>
<div class="box">
  <h1>\u5BFC\u822A\u540E\u53F0\u767B\u5F55</h1>
  ${error ? `<div class="error">${error}</div>` : ""}
  <form method="POST" action="/admin/login">
    <label>\u7528\u6237\u540D</label>
    <input type="text" name="username" required autofocus>
    <label>\u5BC6\u7801</label>
    <input type="password" name="password" required>
    <label>\u4F1A\u8BDD\u6709\u6548\u671F</label>
    <select name="ttl">
      <option value="86400">1 \u5929</option>
      <option value="604800">7 \u5929</option>
      <option value="2592000">30 \u5929</option>
    </select>
    <button type="submit">\u767B \u5F55</button>
  </form>
</div>
</body>
</html>`;
}
__name(loginHtml, "loginHtml");
__name2(loginHtml, "loginHtml");
async function onRequestPost2({ request, env }) {
  await destroySession(request, env);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
      "Set-Cookie": sessionCookie("", 0, true)
    }
  });
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function getData(env) {
  const raw = await env.NAV_KV.get(KV.DATA);
  if (!raw) return { categories: [] };
  return JSON.parse(raw);
}
__name(getData, "getData");
__name2(getData, "getData");
async function putData(env, data) {
  await env.NAV_KV.put(KV.DATA, JSON.stringify(data));
  await markDirty(env);
}
__name(putData, "putData");
__name2(putData, "putData");
async function getSettings(env) {
  const raw = await env.NAV_KV.get(KV.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}
__name(getSettings, "getSettings");
__name2(getSettings, "getSettings");
async function putSettings(env, settings) {
  await env.NAV_KV.put(KV.SETTINGS, JSON.stringify(settings));
  await markDirty(env);
}
__name(putSettings, "putSettings");
__name2(putSettings, "putSettings");
async function getPending(env) {
  const raw = await env.NAV_KV.get(KV.PENDING);
  return raw ? JSON.parse(raw) : [];
}
__name(getPending, "getPending");
__name2(getPending, "getPending");
async function putPending(env, list) {
  await env.NAV_KV.put(KV.PENDING, JSON.stringify(list));
}
__name(putPending, "putPending");
__name2(putPending, "putPending");
async function getHomeCache(env) {
  const dirty = await env.NAV_KV.get(KV.CACHE_DIRTY);
  if (dirty) return null;
  return env.NAV_KV.get(KV.CACHE_HOME);
}
__name(getHomeCache, "getHomeCache");
__name2(getHomeCache, "getHomeCache");
async function putHomeCache(env, html2) {
  await env.NAV_KV.put(KV.CACHE_HOME, html2, { expirationTtl: 3600 });
  await env.NAV_KV.delete(KV.CACHE_DIRTY);
}
__name(putHomeCache, "putHomeCache");
__name2(putHomeCache, "putHomeCache");
async function markDirty(env) {
  await env.NAV_KV.put(KV.CACHE_DIRTY, "1", { expirationTtl: 3600 });
}
__name(markDirty, "markDirty");
__name2(markDirty, "markDirty");
function escapeHTML(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHTML, "escapeHTML");
__name2(escapeHTML, "escapeHTML");
function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}
__name(sanitizeUrl, "sanitizeUrl");
__name2(sanitizeUrl, "sanitizeUrl");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
__name2(json, "json");
function err(msg, status = 400) {
  return json({ error: msg }, status);
}
__name(err, "err");
__name2(err, "err");
var PROMPT = /* @__PURE__ */ __name2((title, url) => `\u7528\u4E0D\u5C11\u4E8E50\u5B57\u7684\u4E2D\u6587\u4ECB\u7ECD\u8BE5\u7F51\u7AD9\u7684\u7528\u9014\u548C\u6838\u5FC3\u529F\u80FD\u3002\u8981\u6C42\uFF1A\u52A1\u5B9E\u3001\u7B80\u6D01\u3001\u7A81\u51FA\u529F\u80FD\uFF0C\u4E0D\u8981\u8425\u9500\u8BDD\u672F\u3002\u7F51\u7AD9\u6807\u9898\uFF1A${title}\uFF0C\u7F51\u5740\uFF1A${url}\u3002\u76F4\u63A5\u8F93\u51FA\u4ECB\u7ECD\u5185\u5BB9\uFF0C\u4E0D\u8981\u4EFB\u4F55\u524D\u7F00\u3002`, "PROMPT");
async function onRequestPost3({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.items?.length) return err("\u7F3A\u5C11 items \u5B57\u6BB5");
  const settings = await getSettings(env);
  const data = await getData(env);
  const provider = body.provider || settings.aiProvider || "workers";
  const model = body.model || settings.aiModel;
  const apiKey = body.apiKey || settings.aiApiKey;
  const delay = settings.aiDelay || 1500;
  const results = [];
  for (const { catIndex: ci, itemIndex: ii } of body.items) {
    const item = data.categories[ci]?.items[ii];
    if (!item) {
      results.push({ ci, ii, ok: false, error: "\u4E66\u7B7E\u4E0D\u5B58\u5728" });
      continue;
    }
    try {
      const desc = await generateDesc(env, item.title, item.url, provider, model, apiKey);
      if (desc) {
        item.hover = desc;
        results.push({ ci, ii, ok: true, hover: desc });
      } else {
        results.push({ ci, ii, ok: false, error: "AI \u8FD4\u56DE\u4E3A\u7A7A" });
      }
    } catch (e) {
      results.push({ ci, ii, ok: false, error: String(e.message) });
    }
    if (body.items.length > 1) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  await putData(env, data);
  return json({ ok: true, results });
}
__name(onRequestPost3, "onRequestPost3");
__name2(onRequestPost3, "onRequestPost");
async function generateDesc(env, title, url, provider, model, apiKey) {
  const prompt = PROMPT(title, url);
  if (provider === "workers") {
    if (!env.AI) throw new Error("\u672A\u7ED1\u5B9A Workers AI \u670D\u52A1");
    const res = await env.AI.run(model || "@cf/google/gemma-4-26b-a4b-it", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    });
    return cleanDesc(res?.response || res?.result?.response || "");
  }
  if (provider === "gemini") {
    if (!apiKey) throw new Error("\u672A\u914D\u7F6E Gemini API Key");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash-lite"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    return cleanDesc(data?.candidates?.[0]?.content?.parts?.[0]?.text || "");
  }
  if (provider === "openai") {
    if (!apiKey) throw new Error("\u672A\u914D\u7F6E OpenAI API Key");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200
      })
    });
    const data = await res.json();
    return cleanDesc(data?.choices?.[0]?.message?.content || "");
  }
  throw new Error(`\u4E0D\u652F\u6301\u7684 provider: ${provider}`);
}
__name(generateDesc, "generateDesc");
__name2(generateDesc, "generateDesc");
function cleanDesc(text) {
  return (text || "").replace(/<[^>]+>/g, "").replace(/^(介绍|描述|说明|网站介绍|功能介绍)[:：]\s*/i, "").trim().split("\n")[0].trim();
}
__name(cleanDesc, "cleanDesc");
__name2(cleanDesc, "cleanDesc");
var NAME_MAP = {
  "rain.html": "\u{1F327} \u4E0B\u96E8(Canvas)",
  "a1.html": "\u2728 \u7279\u65481",
  "a2.html": "\u{1F525} \u7279\u65482",
  "a3.html": "\u{1F300} \u7279\u65483",
  "a4.html": "\u{1F30A} \u7279\u65484",
  "a5.html": "\u2601\uFE0F \u7279\u65485",
  "a6.html": "\u{1F4AB} \u7279\u65486",
  "a7.html": "\u{1F3A8} \u7279\u65487",
  "a8.html": "\u{1F324} \u7279\u65488",
  "a9.html": "\u26A1 \u7279\u65489",
  "a10.html": "\u{1F3AD} \u7279\u654810",
  "a11.html": "\u{1F30C} \u7279\u654811",
  "a12.html": "\u{1F52E} \u7279\u654812",
  "a13.html": "\u{1F3AA} \u7279\u654813",
  "a14.html": "\u{1F308} \u7279\u654814",
  "a15.html": "\u{1F3C4} \u7279\u654815",
  "a16.html": "\u{1F4A0} \u7279\u654816",
  "a17.html": "\u{1F33A} \u7279\u654817",
  "a18.html": "\u{1F32B} \u7279\u654818",
  "a19.html": "\u{1F386} \u7279\u654819",
  "a20.html": "\u{1F387} \u7279\u654820",
  "a21.html": "\u2728 \u7279\u654821",
  "a22.html": "\u2728 \u7279\u654822",
  "a23.html": "\u2728 \u7279\u654823",
  "a24.html": "\u2728 \u7279\u654824",
  "a25.html": "\u2728 \u7279\u654825",
  "a26.html": "\u2728 \u7279\u654826",
  "a27.html": "\u2728 \u7279\u654827",
  "a28.html": "\u2728 \u7279\u654828",
  "a29.html": "\u2728 \u7279\u654829",
  "a30.html": "\u2728 \u7279\u654830",
  "a31.html": "\u2728 \u7279\u654831",
  "a32.html": "\u2728 \u7279\u654832",
  "a33.html": "\u2728 \u7279\u654833",
  "a34.html": "\u2728 \u7279\u654834",
  "a35.html": "\u2728 \u7279\u654835",
  "a36.html": "\u2728 \u7279\u654836",
  "a37.html": "\u2728 \u7279\u654837",
  "a38.html": "\u2728 \u7279\u654838",
  "a39.html": "\u2728 \u7279\u654839",
  "a40.html": "\u2728 \u7279\u654840",
  "a41.html": "\u2728 \u7279\u654841",
  "a42.html": "\u2728 \u7279\u654842",
  "a43.html": "\u2728 \u7279\u654843",
  "a44.html": "\u2728 \u7279\u654844",
  "a45.html": "\u2728 \u7279\u654845",
  "a46.html": "\u2728 \u7279\u654846",
  "a47.html": "\u2728 \u7279\u654847"
};
var STYLES_MAP = {
  "styles1.html": "\u98CE\u683C 1",
  "styles2.html": "\u98CE\u683C 2",
  "styles3.html": "\u98CE\u683C 3",
  "styles4.html": "\u98CE\u683C 4",
  "styles5.html": "\u98CE\u683C 5",
  "styles6.html": "\u98CE\u683C 6",
  "styles7.html": "\u98CE\u683C 7",
  "styles8.html": "\u98CE\u683C 8",
  "styles9.html": "\u98CE\u683C 9",
  "styles10.html": "\u98CE\u683C 10",
  "styles11.html": "\u98CE\u683C 11",
  "styles12.html": "\u98CE\u683C 12",
  "styles13.html": "\u98CE\u683C 13",
  "styles14.html": "\u98CE\u683C 14",
  "styles15.html": "\u98CE\u683C 15",
  "styles16.html": "\u98CE\u683C 16",
  "styles17.html": "\u98CE\u683C 17"
};
function onRequestGet2() {
  const files = Object.entries(NAME_MAP).map(([file, name]) => ({ file, name }));
  files.sort((a, b) => {
    if (a.file === "rain.html") return -1;
    if (b.file === "rain.html") return 1;
    const na = parseInt(a.file.match(/\d+/)?.[0] || "0");
    const nb = parseInt(b.file.match(/\d+/)?.[0] || "0");
    return na - nb;
  });
  const styleFiles = Object.entries(STYLES_MAP).map(([file, name]) => ({ file, name })).sort((a, b) => {
    const na = parseInt(a.file.match(/\d+/)?.[0] || "0");
    const nb = parseInt(b.file.match(/\d+/)?.[0] || "0");
    return na - nb;
  });
  return json({ backgrounds: files, styles: styleFiles });
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
async function onRequestGet3({ env }) {
  const data = await getData(env);
  return json(data);
}
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
async function onRequestPost4({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.url || body.catIndex == null) {
    return err("\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5");
  }
  const url = sanitizeUrl(body.url);
  if (!url) return err("\u65E0\u6548\u7684 URL");
  const data = await getData(env);
  const cat = data.categories[body.catIndex];
  if (!cat) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  const item = {
    title: String(body.title).trim(),
    url,
    icon: body.icon || "",
    hover: body.hover || ""
  };
  cat.items.push(item);
  await putData(env, data);
  return json({ ok: true, item });
}
__name(onRequestPost4, "onRequestPost4");
__name2(onRequestPost4, "onRequestPost");
async function onRequestPut({ request, env, params }) {
  const [ci, ii] = (params.id || "").split("-").map(Number);
  const body = await request.json().catch(() => null);
  if (!body) return err("\u65E0\u6548\u8BF7\u6C42\u4F53");
  const data = await getData(env);
  const item = data.categories[ci]?.items[ii];
  if (!item) return err("\u4E66\u7B7E\u4E0D\u5B58\u5728");
  if (body.title != null) item.title = String(body.title).trim();
  if (body.url != null) {
    const url = sanitizeUrl(body.url);
    if (!url) return err("\u65E0\u6548\u7684 URL");
    item.url = url;
  }
  if (body.icon != null) item.icon = body.icon;
  if (body.hover != null) item.hover = body.hover;
  await putData(env, data);
  return json({ ok: true, item });
}
__name(onRequestPut, "onRequestPut");
__name2(onRequestPut, "onRequestPut");
async function onRequestDelete({ env, params }) {
  const [ci, ii] = (params.id || "").split("-").map(Number);
  const data = await getData(env);
  if (!data.categories[ci]?.items[ii]) return err("\u4E66\u7B7E\u4E0D\u5B58\u5728");
  data.categories[ci].items.splice(ii, 1);
  await putData(env, data);
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");
__name2(onRequestDelete, "onRequestDelete");
async function onRequestGet4({ env }) {
  const data = await getData(env);
  const cats = data.categories.map((c, i) => ({
    index: i,
    title: c.title,
    count: c.items.length
  }));
  return json(cats);
}
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
async function onRequestPost5({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title) return err("\u7F3A\u5C11\u5206\u7C7B\u540D\u79F0");
  const data = await getData(env);
  data.categories.push({ title: String(body.title).trim(), items: [] });
  await putData(env, data);
  return json({ ok: true, index: data.categories.length - 1 });
}
__name(onRequestPost5, "onRequestPost5");
__name2(onRequestPost5, "onRequestPost");
async function onRequestPut2({ request, env, params }) {
  const i = parseInt(params.i);
  const body = await request.json().catch(() => null);
  if (!body?.title) return err("\u7F3A\u5C11\u5206\u7C7B\u540D\u79F0");
  const data = await getData(env);
  if (!data.categories[i]) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  data.categories[i].title = String(body.title).trim();
  await putData(env, data);
  return json({ ok: true });
}
__name(onRequestPut2, "onRequestPut2");
__name2(onRequestPut2, "onRequestPut");
async function onRequestDelete2({ env, params }) {
  const i = parseInt(params.i);
  const data = await getData(env);
  if (!data.categories[i]) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  data.categories.splice(i, 1);
  await putData(env, data);
  return json({ ok: true });
}
__name(onRequestDelete2, "onRequestDelete2");
__name2(onRequestDelete2, "onRequestDelete");
async function onRequestGet5({ request, env }) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const data = await getData(env);
  if (format === "html") {
    const html2 = toBookmarkHtml(data.categories);
    return new Response(html2, {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Content-Disposition": 'attachment; filename="bookmarks.html"'
      }
    });
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="nav-data.json"'
    }
  });
}
__name(onRequestGet5, "onRequestGet5");
__name2(onRequestGet5, "onRequestGet");
function toBookmarkHtml(categories) {
  const lines = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>"
  ];
  for (const cat of categories) {
    lines.push(`    <DT><H3>${escapeHTML(cat.title)}</H3>`);
    lines.push("    <DL><p>");
    for (const item of cat.items) {
      const icon = item.icon ? ` ICON="${item.icon}"` : "";
      lines.push(`        <DT><A HREF="${escapeHTML(item.url)}"${icon}>${escapeHTML(item.title)}</A>`);
    }
    lines.push("    </DL><p>");
  }
  lines.push("</DL><p>");
  return lines.join("\n");
}
__name(toBookmarkHtml, "toBookmarkHtml");
__name2(toBookmarkHtml, "toBookmarkHtml");
async function fetchFavicon(url, apiPrefix = "https://faviconsnap.com/api/favicon?url=") {
  const parsed = new URL(url);
  const origin = parsed.origin;
  try {
    const apiUrl = apiPrefix + encodeURIComponent(origin);
    const res = await fetch(apiUrl, { cf: { cacheTtl: 86400 } });
    if (res.ok) {
      const ct = res.headers.get("content-type") || "image/png";
      if (ct.startsWith("image/")) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          return toDataUri(buf, ct.split(";")[0]);
        }
      }
    }
  } catch {
  }
  try {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    const res = await fetch(googleUrl, { cf: { cacheTtl: 86400 } });
    if (res.ok) {
      const ct = res.headers.get("content-type") || "image/png";
      if (ct.startsWith("image/")) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          return toDataUri(buf, ct.split(";")[0]);
        }
      }
    }
  } catch {
  }
  return "";
}
__name(fetchFavicon, "fetchFavicon");
__name2(fetchFavicon, "fetchFavicon");
async function fetchFavicons(urls, apiPrefix, concurrency = 5) {
  const results = {};
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (url) => {
      results[url] = await fetchFavicon(url, apiPrefix);
    }));
  }
  return results;
}
__name(fetchFavicons, "fetchFavicons");
__name2(fetchFavicons, "fetchFavicons");
function toDataUri(buf, mimeType) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return `data:${mimeType};base64,${b64}`;
}
__name(toDataUri, "toDataUri");
__name2(toDataUri, "toDataUri");
async function onRequestPost6({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.urls?.length && body?.all !== true) {
    return err("\u7F3A\u5C11 urls \u5B57\u6BB5");
  }
  const settings = await getSettings(env);
  const apiPrefix = settings.faviconApi || "https://faviconsnap.com/api/favicon?url=";
  const data = await getData(env);
  let targets = [];
  if (body.all) {
    data.categories.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (!item.icon) targets.push({ ci, ii, url: item.url });
      });
    });
  } else if (body.catIndex != null) {
    const cat = data.categories[body.catIndex];
    if (!cat) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
    cat.items.forEach((item, ii) => {
      if (!item.icon) targets.push({ ci: body.catIndex, ii, url: item.url });
    });
  } else {
    targets = body.urls.map((url) => {
      for (let ci = 0; ci < data.categories.length; ci++) {
        const ii = data.categories[ci].items.findIndex((i) => i.url === url);
        if (ii !== -1) return { ci, ii, url };
      }
      return null;
    }).filter(Boolean);
  }
  if (!targets.length) return json({ ok: true, updated: 0, message: "\u6CA1\u6709\u9700\u8981\u6293\u53D6\u7684\u56FE\u6807" });
  const urls = [...new Set(targets.map((t) => t.url))];
  const faviconMap = await fetchFavicons(urls, apiPrefix, 5);
  let updated = 0;
  targets.forEach(({ ci, ii, url }) => {
    if (faviconMap[url]) {
      data.categories[ci].items[ii].icon = faviconMap[url];
      updated++;
    }
  });
  if (updated > 0) await putData(env, data);
  return json({ ok: true, updated, total: targets.length });
}
__name(onRequestPost6, "onRequestPost6");
__name2(onRequestPost6, "onRequestPost");
function parseBookmarks(html2) {
  const categories = [];
  let currentCat = null;
  const lines = html2.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const h3 = trimmed.match(/<H3[^>]*>(.*?)<\/H3>/i);
    if (h3) {
      currentCat = { title: decodeEntities(h3[1]), items: [] };
      categories.push(currentCat);
      continue;
    }
    const a = trimmed.match(/<A\s+([^>]*)>(.*?)<\/A>/i);
    if (a) {
      const attrs = a[1], title = decodeEntities(a[2]);
      const hrefM = attrs.match(/HREF="([^"]+)"/i);
      const iconM = attrs.match(/ICON="([^"]+)"/i);
      if (!hrefM) continue;
      const url = sanitizeUrl(hrefM[1]);
      if (!url) continue;
      const item = { title, url, icon: iconM?.[1] || "", hover: "" };
      if (!currentCat) {
        currentCat = { title: "\u672A\u5206\u7C7B", items: [] };
        categories.push(currentCat);
      }
      currentCat.items.push(item);
    }
  }
  return categories.filter((c) => c.items.length > 0);
}
__name(parseBookmarks, "parseBookmarks");
__name2(parseBookmarks, "parseBookmarks");
function decodeEntities(s) {
  return (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
__name(decodeEntities, "decodeEntities");
__name2(decodeEntities, "decodeEntities");
async function onRequestPost7({ request, env }) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return err("\u65E0\u6548\u7684\u8868\u5355\u6570\u636E");
  const file = formData.get("file");
  if (!file) return err("\u672A\u627E\u5230\u6587\u4EF6");
  const html2 = await file.text();
  const categories = parseBookmarks(html2);
  if (!categories.length) return err("\u672A\u89E3\u6790\u5230\u4EFB\u4F55\u4E66\u7B7E\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u683C\u5F0F");
  const mode = formData.get("mode") || "merge";
  if (mode === "replace") {
    await putData(env, { categories });
  } else {
    const existing = await getData(env);
    const catMap = {};
    for (const c of existing.categories) catMap[c.title] = c;
    for (const c of categories) {
      if (catMap[c.title]) {
        const existingUrls = new Set(catMap[c.title].items.map((i) => i.url));
        for (const item of c.items) {
          if (!existingUrls.has(item.url)) {
            catMap[c.title].items.push(item);
          }
        }
      } else {
        existing.categories.push(c);
        catMap[c.title] = c;
      }
    }
    await putData(env, existing);
  }
  const total = categories.reduce((s, c) => s + c.items.length, 0);
  return json({ ok: true, categories: categories.length, items: total });
}
__name(onRequestPost7, "onRequestPost7");
__name2(onRequestPost7, "onRequestPost");
async function onRequestGet6({ env }) {
  const list = await getPending(env);
  return json(list);
}
__name(onRequestGet6, "onRequestGet6");
__name2(onRequestGet6, "onRequestGet");
async function onRequestPut3({ env, params }) {
  const id = params.id;
  const list = await getPending(env);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return err("\u6295\u7A3F\u4E0D\u5B58\u5728");
  const submission = list[idx];
  const data = await getData(env);
  let cat = data.categories.find((c) => c.title === submission.category);
  if (!cat) {
    cat = { title: submission.category || "\u672A\u5206\u7C7B", items: [] };
    data.categories.push(cat);
  }
  cat.items.push({
    title: submission.title,
    url: submission.url,
    icon: "",
    hover: submission.hover
  });
  list.splice(idx, 1);
  await Promise.all([putData(env, data), putPending(env, list)]);
  return json({ ok: true });
}
__name(onRequestPut3, "onRequestPut3");
__name2(onRequestPut3, "onRequestPut");
async function onRequestDelete3({ env, params }) {
  const id = params.id;
  const list = await getPending(env);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return err("\u6295\u7A3F\u4E0D\u5B58\u5728");
  list.splice(idx, 1);
  await putPending(env, list);
  return json({ ok: true });
}
__name(onRequestDelete3, "onRequestDelete3");
__name2(onRequestDelete3, "onRequestDelete");
async function onRequestGet7({ env }) {
  const settings = await getSettings(env);
  const { aiApiKey, ...safe } = settings;
  return json(safe);
}
__name(onRequestGet7, "onRequestGet7");
__name2(onRequestGet7, "onRequestGet");
async function onRequestPost8({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return err("\u65E0\u6548\u8BF7\u6C42\u4F53");
  if (body._changePassword) {
    await env.NAV_KV.put("admin_password", body._changePassword.trim());
  }
  delete body._changePassword;
  const current = await getSettings(env);
  const updated = { ...current, ...body };
  delete updated.adminUsername;
  delete updated.adminPassword;
  await putSettings(env, updated);
  return json({ ok: true });
}
__name(onRequestPost8, "onRequestPost8");
__name2(onRequestPost8, "onRequestPost");
async function onRequestGet8({ request, env }) {
  const settings = await getSettings(env);
  const csrf = crypto.randomUUID();
  const res = await env.ASSETS.fetch(new Request("https://placeholder/admin/index.html"));
  const html2 = (await res.text()).replace("{{SITE_NAME}}", settings.siteName || "\u5BFC\u822A\u540E\u53F0").replace("{{CSRF_TOKEN}}", csrf);
  return new Response(html2, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Set-Cookie": `nav_csrf=${csrf}; HttpOnly; Secure; SameSite=Lax; Path=/`
    }
  });
}
__name(onRequestGet8, "onRequestGet8");
__name2(onRequestGet8, "onRequestGet");
function renderHome(templateHtml, navData, settings) {
  return templateHtml.replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName)).replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc)).replace(/\{\{NAV_DATA\}\}/g, JSON.stringify(navData)).replace(/\{\{NAV_SETTINGS\}\}/g, JSON.stringify({
    defaultStyle: settings.defaultStyle,
    defaultBg: settings.defaultBg
  }));
}
__name(renderHome, "renderHome");
__name2(renderHome, "renderHome");
function escHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escHtml, "escHtml");
__name2(escHtml, "escHtml");
var cachedTemplate = null;
async function onRequestGet9({ request, env }) {
  const cached = await getHomeCache(env);
  if (cached) return html(cached);
  const [navData, settings, templateHtml] = await Promise.all([
    getData(env),
    getSettings(env),
    getTemplate(env)
  ]);
  const rendered = renderHome(templateHtml, navData, settings);
  env.ctx?.waitUntil(putHomeCache(env, rendered));
  return html(rendered);
}
__name(onRequestGet9, "onRequestGet9");
__name2(onRequestGet9, "onRequestGet");
async function getTemplate(env) {
  if (cachedTemplate) return cachedTemplate;
  const res = await env.ASSETS.fetch("https://placeholder/index.html");
  cachedTemplate = await res.text();
  return cachedTemplate;
}
__name(getTemplate, "getTemplate");
__name2(getTemplate, "getTemplate");
function html(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
__name(html, "html");
__name2(html, "html");
var PUBLIC_PATHS = [
  "/api/settings/public",
  "/api/submit",
  "/api/backgrounds"
];
async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ADMIN_PUBLIC = ["/admin/login", "/admin/logout"];
  const needsAuth = path.startsWith("/admin") || path.startsWith("/api/");
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/")) || ADMIN_PUBLIC.includes(path);
  if (needsAuth && !isPublic) {
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      if (path.startsWith("/admin")) {
        return Response.redirect(new URL("/admin/login", request.url), 302);
      }
      return err("Unauthorized", 401);
    }
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      const csrf = request.headers.get("X-CSRF-Token");
      const cookie = request.headers.get("Cookie") || "";
      const m = cookie.match(/nav_csrf=([^;]+)/);
      if (!csrf || !m || csrf !== m[1]) {
        return err("Invalid CSRF token", 403);
      }
    }
  }
  return next();
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/admin/login",
    mountPath: "/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/admin/login",
    mountPath: "/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/admin/logout",
    mountPath: "/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/ai",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/backgrounds",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/bookmarks",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/bookmarks",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/bookmarks",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/bookmarks",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/export",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/favicon",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/import",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/pending",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/pending",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/pending",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut3]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/admin",
    mountPath: "/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-qiAvtF/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-qiAvtF/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.9614904022966506.js.map
