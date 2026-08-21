// functions/constants.js
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
  SESSION: (tok) => `nav_session_${tok}`
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

// functions/lib/auth.js
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function getSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/nav_session=([^;]+)/);
  return m ? m[1] : null;
}
async function isAuthenticated(request, env) {
  const token = getSessionToken(request);
  if (!token) return false;
  const stored = await env.NAV_KV.get(KV.SESSION(token));
  return stored === "1";
}
async function createSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_KV.put(KV.SESSION(token), "1", { expirationTtl: ttl });
  return token;
}
async function destroySession(request, env) {
  const token = getSessionToken(request);
  if (token) await env.NAV_KV.delete(KV.SESSION(token));
}
async function verifyCredentials(env, username, password) {
  const storedUser = (await env.NAV_KV.get("admin_username") || "").trim();
  const storedPass = (await env.NAV_KV.get("admin_password") || "").trim();
  if (!storedUser || !storedPass) return false;
  return timingSafeEqual(username.trim(), storedUser) && timingSafeEqual(password.trim(), storedPass);
}
function sessionCookie(token, ttl = 86400, clear = false) {
  if (clear) return `nav_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
  return `nav_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}; Path=/`;
}

// functions/lib/utils.js
function escapeHTML(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// functions/_middleware.js
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

// functions/lib/kv.js
async function getData(env) {
  const raw = await env.NAV_KV.get(KV.DATA);
  if (!raw) return { categories: [] };
  return JSON.parse(raw);
}
async function putData(env, data) {
  await env.NAV_KV.put(KV.DATA, JSON.stringify(data));
  await markDirty(env);
}
async function getSettings(env) {
  const raw = await env.NAV_KV.get(KV.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}
async function putSettings(env, settings) {
  await env.NAV_KV.put(KV.SETTINGS, JSON.stringify(settings));
  await markDirty(env);
}
async function getPending(env) {
  const raw = await env.NAV_KV.get(KV.PENDING);
  return raw ? JSON.parse(raw) : [];
}
async function putPending(env, list) {
  await env.NAV_KV.put(KV.PENDING, JSON.stringify(list));
}
async function getHomeCache(env) {
  const dirty = await env.NAV_KV.get(KV.CACHE_DIRTY);
  if (dirty) return null;
  return env.NAV_KV.get(KV.CACHE_HOME);
}
async function putHomeCache(env, html2) {
  await env.NAV_KV.put(KV.CACHE_HOME, html2, { expirationTtl: 3600 });
  await env.NAV_KV.delete(KV.CACHE_DIRTY);
}
async function markDirty(env) {
  await env.NAV_KV.put(KV.CACHE_DIRTY, "1", { expirationTtl: 3600 });
}

// functions/lib/renderer.js
function renderHome(templateHtml, navData, settings) {
  return templateHtml.replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName)).replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc)).replace(/\{\{NAV_DATA\}\}/g, JSON.stringify(navData)).replace(/\{\{NAV_SETTINGS\}\}/g, JSON.stringify({
    defaultStyle: settings.defaultStyle,
    defaultBg: settings.defaultBg
  }));
}
function escHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// functions/index.js
var cachedTemplate = null;
async function onRequestGet({ request, env }) {
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
async function getTemplate(env) {
  if (cachedTemplate) return cachedTemplate;
  const res = await env.ASSETS.fetch("https://placeholder/index.html");
  cachedTemplate = await res.text();
  return cachedTemplate;
}
function html(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}

// functions/admin/login.js
async function onRequestGet2() {
  return new Response(loginHtml(), {
    headers: { "Content-Type": "text/html;charset=utf-8" }
  });
}
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

// functions/admin/logout.js
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

// functions/admin/index.js
async function onRequestGet3({ request, env }) {
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

// functions/api/backgrounds.js
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
  "styles1.html": "\u98CE\u683C 1 \xB7 \u7ECF\u5178\u84DD\u767D",
  "styles2.html": "\u98CE\u683C 2 \xB7 \u661F\u6CB3\u6E10\u53D8",
  "styles3.html": "\u98CE\u683C 3 \xB7 \u9ED1\u66DC\u77F3"
};
function onRequestGet4() {
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

// functions/api/bookmarks.js
async function onRequestGet5({ env }) {
  const data = await getData(env);
  return json(data);
}
async function onRequestPost3({ request, env }) {
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
async function onRequestDelete({ env, params }) {
  const [ci, ii] = (params.id || "").split("-").map(Number);
  const data = await getData(env);
  if (!data.categories[ci]?.items[ii]) return err("\u4E66\u7B7E\u4E0D\u5B58\u5728");
  data.categories[ci].items.splice(ii, 1);
  await putData(env, data);
  return json({ ok: true });
}
async function onRequestReorder({ request, env }) {
  const body = await request.json().catch(() => null);
  const catIndex = body?.catIndex;
  const from = body?.from;
  const to = body?.to;
  if (catIndex == null || from == null || to == null) return err("\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5");
  const data = await getData(env);
  const cat = data.categories[catIndex];
  if (!cat) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  const items = cat.items;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return err("\u7D22\u5F15\u8D8A\u754C");
  if (from === to) return json({ ok: true });
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  await putData(env, data);
  return json({ ok: true });
}

// functions/api/categories.js
async function onRequestGet6({ env }) {
  const data = await getData(env);
  const cats = data.categories.map((c, i) => ({
    index: i,
    title: c.title,
    count: c.items.length
  }));
  return json(cats);
}
async function onRequestPost4({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title) return err("\u7F3A\u5C11\u5206\u7C7B\u540D\u79F0");
  const data = await getData(env);
  data.categories.push({ title: String(body.title).trim(), items: [] });
  await putData(env, data);
  return json({ ok: true, index: data.categories.length - 1 });
}
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
async function onRequestDelete2({ env, params }) {
  const i = parseInt(params.i);
  const data = await getData(env);
  if (!data.categories[i]) return err("\u5206\u7C7B\u4E0D\u5B58\u5728");
  data.categories.splice(i, 1);
  await putData(env, data);
  return json({ ok: true });
}
async function onRequestReorder2({ request, env }) {
  const body = await request.json().catch(() => null);
  const from = body?.from;
  const to = body?.to;
  if (from == null || to == null) return err("\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5");
  const data = await getData(env);
  const cats = data.categories;
  if (from < 0 || from >= cats.length || to < 0 || to >= cats.length) return err("\u7D22\u5F15\u8D8A\u754C");
  if (from === to) return json({ ok: true });
  const [moved] = cats.splice(from, 1);
  cats.splice(to, 0, moved);
  await putData(env, data);
  return json({ ok: true });
}

// functions/api/settings.js
async function onRequestGet7({ env }) {
  const settings = await getSettings(env);
  const { aiApiKey, ...safe } = settings;
  return json(safe);
}
async function onRequestPost5({ request, env }) {
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

// functions/lib/parser.js
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
function decodeEntities(s) {
  return (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// functions/api/import.js
async function onRequestPost6({ request, env }) {
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

// functions/api/export.js
async function onRequestGet8({ request, env }) {
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

// functions/api/pending.js
async function onRequestGet9({ env }) {
  const list = await getPending(env);
  return json(list);
}
async function onRequestDelete3({ env, params }) {
  const id = params.id;
  const list = await getPending(env);
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return err("\u6295\u7A3F\u4E0D\u5B58\u5728");
  list.splice(idx, 1);
  await putPending(env, list);
  return json({ ok: true });
}

// functions/api/ai.js
var PROMPT = (title, url) => `\u7528\u4E0D\u5C11\u4E8E50\u5B57\u7684\u4E2D\u6587\u4ECB\u7ECD\u8BE5\u7F51\u7AD9\u7684\u7528\u9014\u548C\u6838\u5FC3\u529F\u80FD\u3002\u8981\u6C42\uFF1A\u52A1\u5B9E\u3001\u7B80\u6D01\u3001\u7A81\u51FA\u529F\u80FD\uFF0C\u4E0D\u8981\u8425\u9500\u8BDD\u672F\u3002\u7F51\u7AD9\u6807\u9898\uFF1A${title}\uFF0C\u7F51\u5740\uFF1A${url}\u3002\u76F4\u63A5\u8F93\u51FA\u4ECB\u7ECD\u5185\u5BB9\uFF0C\u4E0D\u8981\u4EFB\u4F55\u524D\u7F00\u3002`;
async function onRequestPost7({ request, env }) {
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
function cleanDesc(text) {
  return (text || "").replace(/<[^>]+>/g, "").replace(/^(介绍|描述|说明|网站介绍|功能介绍)[:：]\s*/i, "").trim().split("\n")[0].trim();
}

// functions/styles/[id].js
function onRequestGet10() {
  return new Response(
    "\u6B64\u8DEF\u7531\u5DF2\u505C\u7528\u3002\u98CE\u683C\u76AE\u80A4\u73B0\u901A\u8FC7 index.html \u7684 style-css link \u5207\u6362\uFF0C\u8BF7\u76F4\u63A5\u8BBF\u95EE /\u3002",
    { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}

// functions/worker-entry.js
var worker_entry_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const makeCtx = (handler) => ({
      request,
      env: { ...env, ctx },
      next: () => new Response("Not Found", { status: 404 }),
      params: {},
      data: {},
      functionPath: path,
      waitUntil: ctx.waitUntil?.bind(ctx),
      passThroughOnException: ctx.passThroughOnException?.bind(ctx)
    });
    const mwCtx = {
      ...makeCtx(null),
      next: () => routeRequest(request, env, ctx, url, path, method)
    };
    return onRequest(mwCtx);
  }
};
async function routeRequest(request, env, ctx, url, path, method) {
  const make = (extraParams = {}) => ({
    request,
    env: { ...env, ctx },
    params: extraParams,
    next: () => new Response("Not Found", { status: 404 }),
    data: {}
  });
  if (path === "/" || path === "/index.html") {
    if (method === "GET") return onRequestGet(make());
  }
  if (path === "/admin" || path === "/admin/") {
    if (method === "GET") return onRequestGet3(make());
  }
  if (path === "/admin/login") {
    if (method === "POST") return onRequestPost(make());
    if (method === "GET") return onRequestGet2(make());
  }
  if (path === "/admin/logout") {
    if (method === "POST") return onRequestPost2(make());
  }
  if (path === "/api/backgrounds") {
    if (method === "GET") return onRequestGet4(make());
  }
  if (path === "/api/bookmarks/reorder" && method === "POST") return onRequestReorder(make());
  if (path.startsWith("/api/bookmarks")) {
    if (method === "GET") return onRequestGet5(make());
    if (method === "POST") return onRequestPost3(make());
    if (method === "PUT") return onRequestPut(make());
    if (method === "DELETE") return onRequestDelete(make());
  }
  if (path === "/api/categories/reorder" && method === "POST") return onRequestReorder2(make());
  if (path.startsWith("/api/categories")) {
    if (method === "GET") return onRequestGet6(make());
    if (method === "POST") return onRequestPost4(make());
    if (method === "PUT") return onRequestPut2(make());
    if (method === "DELETE") return onRequestDelete2(make());
  }
  if (path.startsWith("/api/settings")) {
    if (method === "GET") return onRequestGet7(make());
    if (method === "POST") return onRequestPost5(make());
  }
  if (path === "/api/import") {
    if (method === "POST") return onRequestPost6(make());
  }
  if (path === "/api/export") {
    if (method === "GET") return onRequestGet8(make());
  }
  if (path.startsWith("/api/pending")) {
    if (method === "GET") return onRequestGet9(make());
    if (method === "POST") return pendingPost(make());
    if (method === "DELETE") return onRequestDelete3(make());
  }
  if (path === "/api/ai") {
    if (method === "POST") return onRequestPost7(make());
  }
  if (path === "/api/favicon") {
    if (method === "GET") return faviconGet(make());
  }
  const stylesMatch = path.match(/^\/api\/styles\/(.+)$/);
  if (stylesMatch) {
    if (method === "GET") return onRequestGet10(make({ id: stylesMatch[1] }));
  }
  if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
  return new Response("Not Found", { status: 404 });
}
export {
  worker_entry_default as default
};
