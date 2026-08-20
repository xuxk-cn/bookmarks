var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// constants.js
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
  SESSION: /* @__PURE__ */ __name((tok) => `nav_session_${tok}`, "SESSION")
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

// lib/auth.js
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/nav_session=([^;]+)/);
  return m ? m[1] : null;
}
__name(getSessionToken, "getSessionToken");
async function isAuthenticated(request, env) {
  const token = getSessionToken(request);
  if (!token) return false;
  const stored = await env.NAV_KV.get(KV.SESSION(token));
  return stored === "1";
}
__name(isAuthenticated, "isAuthenticated");
async function createSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_KV.put(KV.SESSION(token), "1", { expirationTtl: ttl });
  return token;
}
__name(createSession, "createSession");
async function destroySession(request, env) {
  const token = getSessionToken(request);
  if (token) await env.NAV_KV.delete(KV.SESSION(token));
}
__name(destroySession, "destroySession");
async function verifyCredentials(env, username, password) {
  const storedUser = (await env.NAV_KV.get("admin_username") || "").trim();
  const storedPass = (await env.NAV_KV.get("admin_password") || "").trim();
  if (!storedUser || !storedPass) return false;
  return timingSafeEqual(username.trim(), storedUser) && timingSafeEqual(password.trim(), storedPass);
}
__name(verifyCredentials, "verifyCredentials");
function sessionCookie(token, ttl = 86400, clear = false) {
  if (clear) return `nav_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
  return `nav_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}; Path=/`;
}
__name(sessionCookie, "sessionCookie");

// admin/login.js
async function onRequestGet() {
  return new Response(loginHtml(), {
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}
__name(onRequestGet, "onRequestGet");
async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.redirect("/admin/login", 302);
  const username = form.get("username") || "";
  const password = form.get("password") || "";
  const ttl = parseInt(form.get("ttl") || "86400");
  const ok = await verifyCredentials(env, username, password);
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

// admin/logout.js
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
__name(onRequestPost2, "onRequestPost");

// lib/kv.js
async function getData(env) {
  const raw = await env.NAV_KV.get(KV.DATA);
  if (!raw) return { categories: [] };
  return JSON.parse(raw);
}
__name(getData, "getData");
async function putData(env, data) {
  await env.NAV_KV.put(KV.DATA, JSON.stringify(data));
  await markDirty(env);
}
__name(putData, "putData");
async function getSettings(env) {
  const raw = await env.NAV_KV.get(KV.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}
__name(getSettings, "getSettings");
async function putSettings(env, settings) {
  await env.NAV_KV.put(KV.SETTINGS, JSON.stringify(settings));
  await markDirty(env);
}
__name(putSettings, "putSettings");
async function getPending(env) {
  const raw = await env.NAV_KV.get(KV.PENDING);
  return raw ? JSON.parse(raw) : [];
}
__name(getPending, "getPending");
async function putPending(env, list) {
  await env.NAV_KV.put(KV.PENDING, JSON.stringify(list));
}
__name(putPending, "putPending");
async function getHomeCache(env) {
  const dirty = await env.NAV_KV.get(KV.CACHE_DIRTY);
  if (dirty) return null;
  return env.NAV_KV.get(KV.CACHE_HOME);
}
__name(getHomeCache, "getHomeCache");
async function putHomeCache(env, html2) {
  await env.NAV_KV.put(KV.CACHE_HOME, html2, { expirationTtl: 3600 });
  await env.NAV_KV.delete(KV.CACHE_DIRTY);
}
__name(putHomeCache, "putHomeCache");
async function markDirty(env) {
  await env.NAV_KV.put(KV.CACHE_DIRTY, "1", { expirationTtl: 3600 });
}
__name(markDirty, "markDirty");

// lib/utils.js
function escapeHTML(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHTML, "escapeHTML");
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
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
function err(msg, status = 400) {
  return json({ error: msg }, status);
}
__name(err, "err");

// api/ai.js
var PROMPT = /* @__PURE__ */ __name((title, url) => `\u7528\u4E0D\u5C11\u4E8E50\u5B57\u7684\u4E2D\u6587\u4ECB\u7ECD\u8BE5\u7F51\u7AD9\u7684\u7528\u9014\u548C\u6838\u5FC3\u529F\u80FD\u3002\u8981\u6C42\uFF1A\u52A1\u5B9E\u3001\u7B80\u6D01\u3001\u7A81\u51FA\u529F\u80FD\uFF0C\u4E0D\u8981\u8425\u9500\u8BDD\u672F\u3002\u7F51\u7AD9\u6807\u9898\uFF1A${title}\uFF0C\u7F51\u5740\uFF1A${url}\u3002\u76F4\u63A5\u8F93\u51FA\u4ECB\u7ECD\u5185\u5BB9\uFF0C\u4E0D\u8981\u4EFB\u4F55\u524D\u7F00\u3002`, "PROMPT");
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
__name(onRequestPost3, "onRequestPost");
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
function cleanDesc(text) {
  return (text || "").replace(/<[^>]+>/g, "").replace(/^(介绍|描述|说明|网站介绍|功能介绍)[:：]\s*/i, "").trim().split("\n")[0].trim();
}
__name(cleanDesc, "cleanDesc");

// api/backgrounds.js
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
  "styles16.html": "\u98CE\u683C 16"
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
__name(onRequestGet2, "onRequestGet");

// api/bookmarks.js
async function onRequestGet3({ env }) {
  const data = await getData(env);
  return json(data);
}
__name(onRequestGet3, "onRequestGet");
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
__name(onRequestPost4, "onRequestPost");
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
async function onRequestDelete({ env, params }) {
  const [ci, ii] = (params.id || "").split("-").map(Number);
  const data = await getData(env);
  if (!data.categories[ci]?.items[ii]) return err("\u4E66\u7B7E\u4E0D\u5B58\u5728");
  data.categories[ci].items.splice(ii, 1);
  await putData(env, data);
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");

// api/categories.js
async function onRequestGet4({ env }) {
  const data = await getData(env);
  const cats = data.categories.map((c, i) => ({
    index: i,
    title: c.title,
    count: c.items.length
  }));
  return json(cats);
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPost5({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title) return err("\u7F3A\u5C11\u5206\u7C7B\u540D\u79F0");
  const data = await getData(env);
  data.categories.push({ title: String(body.title).trim(), items: [] });
  await putData(env, data);
  return json({ ok: true, index: data.categories.length - 1 });
}
__name(onRequestPost5, "onRequestPost");
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
__name(onRequestPut2, "onRequestPut");
async function onRequestDelete2({ env, params }) {
  const i = parseInt(params.i);
  const data = await getData(env);
  if (!data.categories[i]) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  data.categories.splice(i, 1);
  await putData(env, data);
  return json({ ok: true });
}
__name(onRequestDelete2, "onRequestDelete");

// api/export.js
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
__name(onRequestGet5, "onRequestGet");
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

// lib/favicon.js
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
function toDataUri(buf, mimeType) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return `data:${mimeType};base64,${b64}`;
}
__name(toDataUri, "toDataUri");

// api/favicon.js
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
__name(onRequestPost6, "onRequestPost");

// lib/parser.js
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
function decodeEntities(s) {
  return (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
__name(decodeEntities, "decodeEntities");

// api/import.js
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
__name(onRequestPost7, "onRequestPost");

// api/pending.js
async function onRequestGet6({ env }) {
  const list = await getPending(env);
  return json(list);
}
__name(onRequestGet6, "onRequestGet");
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
__name(onRequestPut3, "onRequestPut");
async function onRequestDelete3({ env, params }) {
  const id = params.id;
  const list = await getPending(env);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return err("\u6295\u7A3F\u4E0D\u5B58\u5728");
  list.splice(idx, 1);
  await putPending(env, list);
  return json({ ok: true });
}
__name(onRequestDelete3, "onRequestDelete");

// api/settings.js
async function onRequestGet7({ env }) {
  const settings = await getSettings(env);
  const { aiApiKey, ...safe } = settings;
  return json(safe);
}
__name(onRequestGet7, "onRequestGet");
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
__name(onRequestPost8, "onRequestPost");

// styles/[id].js
async function onRequestGet8({ params, env }) {
  const id = params.id;
  const htmlFile = `styles${id}.html`;
  const [navData, settings, templateRes] = await Promise.all([
    getData(env),
    getSettings(env),
    env.ASSETS.fetch(new Request(`https://placeholder/backgrounds/${htmlFile}`))
  ]);
  if (!templateRes.ok) {
    return new Response("Style not found", { status: 404 });
  }
  const navDataJson = JSON.stringify(navData).replace(/<\/script>/gi, "<\\/script>");
  let html2 = await templateRes.text();
  html2 = html2.replace(
    /(<script\s+id="nav-data"[^>]*>)[\s\S]*?(<\/script>)/i,
    "$1" + navDataJson + "$2"
  );
  html2 = html2.replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName || "\u5BFC\u822A"));
  html2 = html2.replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc || ""));
  return new Response(html2, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
__name(onRequestGet8, "onRequestGet");
function escHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escHtml, "escHtml");

// admin/index.js
async function onRequestGet9({ request, env }) {
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
__name(onRequestGet9, "onRequestGet");

// lib/renderer.js
function renderHome(templateHtml, navData, settings) {
  return templateHtml.replace(/\{\{SITE_NAME\}\}/g, escHtml2(settings.siteName)).replace(/\{\{SITE_DESC\}\}/g, escHtml2(settings.siteDesc)).replace(/\{\{NAV_DATA\}\}/g, JSON.stringify(navData)).replace(/\{\{NAV_SETTINGS\}\}/g, JSON.stringify({
    defaultStyle: settings.defaultStyle,
    defaultBg: settings.defaultBg
  }));
}
__name(renderHome, "renderHome");
function escHtml2(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escHtml2, "escHtml");

// index.js
var cachedTemplate = null;
async function onRequestGet10({ request, env }) {
  const styleChoice = getCookie(request, "styleChoice");
  if (styleChoice && styleChoice !== "none") {
    const htmlFile = `styles${styleChoice}.html`;
    const [navData2, settings2, templateRes] = await Promise.all([
      getData(env),
      getSettings(env),
      env.ASSETS.fetch(new Request(`https://placeholder/backgrounds/${htmlFile}`))
    ]);
    if (templateRes.ok) {
      const navDataJson = JSON.stringify(navData2).replace(/<\/script>/gi, "<\\/script>");
      let htmlText = await templateRes.text();
      htmlText = htmlText.replace(/\{\{NAV_DATA\}\}/g, navDataJson);
      htmlText = htmlText.replace(/\{\{SITE_NAME\}\}/g, escHtml3(settings2.siteName || "\u5BFC\u822A"));
      htmlText = htmlText.replace(/\{\{SITE_DESC\}\}/g, escHtml3(settings2.siteDesc || ""));
      const bgStyles = `
      <style>
        body, .app, .main, .content { background: transparent !important; }
      </style>
      `;
      htmlText = htmlText.replace(/<\/head>/i, bgStyles + "</head>");
      const bgDoms = `
      <!-- \u80CC\u666F\u5C42 -->
      <canvas id="bg-canvas" style="position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
      <div id="bg-image" style="position:fixed;inset:0;width:100%;height:100%;z-index:-2;background-size:cover;background-position:center;pointer-events:none;"></div>
      <select id="bg-select" style="display:none"><option value="none">\u65E0\u80CC\u666F</option></select>
      `;
      htmlText = htmlText.replace(/<body[^>]*>/i, (m) => m + "\n" + bgDoms);
      const injectScript = `
      <script>
      (function() {
        // \u52A8\u6001\u6CE8\u5165\u8BBE\u7F6E\u6309\u94AE
        var btn = document.createElement('button');
        btn.textContent = '\u2699 \u8BBE\u7F6E';
        btn.style.cssText = 'position:fixed;top:12px;right:68px;z-index:9999;background:rgba(255,255,255,0.92);color:#1e293b;border:1px solid rgba(15,23,42,0.15);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-family:sans-serif;';
        btn.onclick = function(e) {
          e.stopPropagation();
          var p = document.getElementById('settings-popup-ssr');
          if (p) p.hidden = !p.hidden;
        };
        document.body.appendChild(btn);

        // \u52A8\u6001\u6CE8\u5165\u8BBE\u7F6E\u5F39\u7A97
        var modal = document.createElement('div');
        modal.id = 'settings-popup-ssr';
        modal.hidden = true;
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
        modal.onclick = function(e) { if(e.target === this) this.hidden = true; };
        
        modal.innerHTML = \`
          <div style="background:#fff;color:#1e293b;width:340px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(15,23,42,0.08);font-weight:700;font-size:15px;">
              <span>\u504F\u597D\u8BBE\u7F6E</span>
              <button style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;padding:0;" onclick="document.getElementById('settings-popup-ssr').hidden=true">\u2715</button>
            </div>
            <div style="padding:20px;">
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">\u60AC\u505C\u97F3\u6548</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:#64748b;">\u5F00\u542F\u60AC\u505C\u97F3\u6548</span>
                  <input type="checkbox" id="sound-toggle-ssr" style="width:18px;height:18px;cursor:pointer;accent-color:#0f766e;">
                </div>
              </div>
              <div style="border-top:1px dashed rgba(15,23,42,0.08);margin:14px 0;"></div>
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">\u52A8\u6001\u80CC\u666F</div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <select id="settings-bg-select-ssr" style="flex:1;height:36px;border:1px solid rgba(15,23,42,0.15);border-radius:8px;padding:0 8px;font-size:13px;outline:none;background:#fff;color:#1e293b;">
                    <option value="none">\u65E0\u80CC\u666F</option>
                  </select>
                  <button style="height:36px;padding:0 12px;background:#f1f5f9;border:1px solid rgba(15,23,42,0.1);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#475569;" onclick="window.open('/bg-preview.html','bg_preview')">\u9884\u89C8</button>
                </div>
              </div>
              <div style="border-top:1px dashed rgba(15,23,42,0.08);margin:14px 0;"></div>
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">\u5BFC\u822A\u98CE\u683C</div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <select id="style-select-ssr" style="flex:1;height:36px;border:1px solid rgba(15,23,42,0.15);border-radius:8px;padding:0 8px;font-size:13px;outline:none;background:#fff;color:#1e293b;">
                    <option value="none">\u9ED8\u8BA4\u98CE\u683C</option>
                  </select>
                  <button style="height:36px;padding:0 12px;background:#f1f5f9;border:1px solid rgba(15,23,42,0.1);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#475569;" onclick="window.open('/style-preview.html','style_preview')">\u9884\u89C8</button>
                </div>
              </div>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);

        // \u7ED1\u5B9A\u97F3\u6548\u903B\u8F91
        var soundToggle = document.getElementById('sound-toggle-ssr');
        soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
        soundToggle.addEventListener('change', function() {
          localStorage.setItem('soundEnabled', this.checked);
          var orig = document.getElementById('soundToggle');
          if (orig) orig.checked = this.checked;
        });

        // \u52A0\u8F7D\u4E0B\u62C9\u6846\u5217\u8868\u6570\u636E
        (async function() {
          try {
            var res = await fetch('/api/backgrounds');
            var data = await res.json();
            
            // \u586B\u5145\u80CC\u666F
            var bgSel = document.getElementById('settings-bg-select-ssr');
            [['rain','\u{1F327} \u4E0B\u96E8'],['snow','\u2744\uFE0F \u4E0B\u96EA'],['forest','\u{1F33F} \u843D\u53F6']].forEach(function(item) {
              var opt = document.createElement('option');
              opt.value = item[0]; opt.textContent = item[1];
              bgSel.appendChild(opt);
            });
            (data.backgrounds || []).forEach(function(item) {
              if (!item.file.startsWith('a') && item.file !== 'rain.html') return;
              var opt = document.createElement('option');
              opt.value = item.file; opt.textContent = item.name || item.file;
              bgSel.appendChild(opt);
            });
            bgSel.value = localStorage.getItem('bgChoice') || 'none';
            bgSel.addEventListener('change', function() {
              var val = this.value;
              localStorage.setItem('bgChoice', val);
              if (window.__setBg) {
                window.__setBg(val);
              } else {
                var hiddenSel = document.getElementById('bg-select');
                if (hiddenSel) {
                  hiddenSel.value = val;
                  hiddenSel.dispatchEvent(new Event('change'));
                }
              }
            });

            // \u586B\u5145\u98CE\u683C
            var styleSel = document.getElementById('style-select-ssr');
            (data.styles || []).forEach(function(item) {
              var opt = document.createElement('option');
              var m = item.file.match(/styles(d+).html/);
              if (!m) return;
              opt.value = m[1]; opt.textContent = item.name || ('\u98CE\u683C ' + m[1]);
              styleSel.appendChild(opt);
            });
            styleSel.value = localStorage.getItem('styleChoice') || 'none';
            styleSel.addEventListener('change', function() {
              var val = this.value;
              if (!val || val === 'none') {
                localStorage.removeItem('styleChoice');
                document.cookie = "styleChoice=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
                window.location.reload();
              } else {
                localStorage.setItem('styleChoice', val);
                document.cookie = "styleChoice=" + val + ";path=/;max-age=31536000;SameSite=Lax";
                window.location.reload();
              }
            });
          } catch(e){}
        })();
      })();
      <\/script>
      <script type="module" src="/js/background.js"><\/script>
      `;
      htmlText = htmlText.replace(/<\/body>/i, injectScript + "</body>");
      return html(htmlText);
    }
  }
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
__name(onRequestGet10, "onRequestGet");
async function getTemplate(env) {
  if (cachedTemplate) return cachedTemplate;
  const res = await env.ASSETS.fetch("https://placeholder/index.html");
  cachedTemplate = await res.text();
  return cachedTemplate;
}
__name(getTemplate, "getTemplate");
function html(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
__name(html, "html");
function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";");
  for (let cookie of cookies) {
    const [k, v] = cookie.trim().split("=");
    if (k === name) return v;
  }
  return null;
}
__name(getCookie, "getCookie");
function escHtml3(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escHtml3, "escHtml");

// _middleware.js
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

// ../.wrangler/tmp/pages-bCI0Al/functionsRoutes-0.7602046918599118.mjs
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
    routePath: "/styles/:id",
    mountPath: "/styles",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/admin",
    mountPath: "/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../../node_modules/path-to-regexp/dist.es2015/index.js
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
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
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
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
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
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
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
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
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
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
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
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../node_modules/wrangler/templates/pages-template-worker.ts
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
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
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
          passThroughOnException: /* @__PURE__ */ __name(() => {
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
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
