// ─── 内嵌前端资源（由 build_worker.py 自动生成，请勿手动修改）────
const INDEX_HTML = "<!doctype html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>cf-nav \u4e00\u952e\u90e8\u7f72\u5668 v20260825-76</title>\n  <style>:root {\n  color-scheme: light;\n  --bg: #f4f7fb;\n  --panel: rgba(255,255,255,0.78);\n  --panel-strong: rgba(255,255,255,0.92);\n  --text: #101828;\n  --muted: #667085;\n  --line: rgba(15,23,42,0.12);\n  --accent: #0f766e;\n  --accent-strong: #115e59;\n  --accent-soft: rgba(15,118,110,0.12);\n  --danger: #b42318;\n  --shadow: 0 24px 70px rgba(15,23,42,0.12);\n  font-family: ui-sans-serif,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n}\n* { box-sizing: border-box; }\nbody {\n  margin: 0; min-height: 100dvh; color: var(--text);\n  background:\n    radial-gradient(circle at 20% 0%,rgba(20,184,166,0.22),transparent 32%),\n    radial-gradient(circle at 90% 12%,rgba(59,130,246,0.18),transparent 28%),\n    linear-gradient(180deg,#f8fbff 0%,var(--bg) 100%);\n}\nbutton,input,select { font: inherit; }\n.shell { width: min(1080px,calc(100vw - 32px)); margin: 0 auto; padding: 32px 0 56px; }\n\n/* hero */\n.hero {\n  display: grid; grid-template-columns: minmax(0,1fr) 340px;\n  gap: 24px; align-items: end; padding: 36px 0 24px;\n}\n.eyebrow { margin: 0 0 12px; color: var(--accent-strong); font-size: 13px; font-weight: 700; }\nh1 { margin: 0; font-size: clamp(36px,6vw,70px); line-height: 1; }\nh2 { margin: 0; font-size: 17px; line-height: 1.25; }\n.summary { max-width: 560px; margin: 16px 0 0; color: var(--muted); font-size: 17px; line-height: 1.6; }\n\n/* cards & panels */\n.status-card, .panel {\n  border: 1px solid var(--line); background: var(--panel);\n  backdrop-filter: blur(22px) saturate(150%);\n  -webkit-backdrop-filter: blur(22px) saturate(150%);\n  box-shadow: var(--shadow);\n}\n.status-card { border-radius: 24px; padding: 22px; }\n.status-card p { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }\n.status-dot {\n  display: inline-block; width: 10px; height: 10px; margin-right: 8px;\n  border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 6px var(--accent-soft);\n}\n.panel { margin-top: 18px; border-radius: 26px; padding: 22px; }\n.panel-head {\n  display: flex; gap: 18px; align-items: center;\n  justify-content: space-between; margin-bottom: 18px;\n}\n.panel-head p { margin: 6px 0 0; color: var(--muted); line-height: 1.5; }\n.panel-head.compact { margin-bottom: 10px; }\n\n/* grid */\n.grid { display: grid; gap: 14px; }\n.two { grid-template-columns: repeat(2,minmax(0,1fr)); }\n\n/* form */\nlabel span { display: block; margin-bottom: 7px; color: #344054; font-size: 13px; font-weight: 700; }\n.required { color: var(--danger); }\ninput, select {\n  width: 100%; height: 46px; border: 1px solid rgba(15,23,42,0.14);\n  border-radius: 14px; padding: 0 14px; color: var(--text);\n  background: rgba(255,255,255,0.86); outline: none;\n}\ninput[type=\"file\"] {\n  height: auto; padding: 10px 14px; cursor: pointer;\n}\ninput:focus, select:focus {\n  border-color: rgba(15,118,110,0.72); box-shadow: 0 0 0 4px var(--accent-soft);\n}\n.file-label { display: block; }\n.mt { margin-top: 14px; }\n\n/* buttons */\nbutton {\n  min-height: 42px; border: 0; border-radius: 999px; padding: 0 18px;\n  cursor: pointer; transition: transform 0.16s,box-shadow 0.16s,background 0.16s;\n}\nbutton:active { transform: translateY(1px) scale(0.99); }\nbutton:disabled { opacity: 0.5; cursor: not-allowed; }\n.primary {\n  min-height: 52px; padding: 0 36px; color: white; background: var(--accent);\n  box-shadow: 0 18px 38px rgba(15,118,110,0.24); font-weight: 800; font-size: 1.05rem;\n}\n.primary:hover:not(:disabled) { background: var(--accent-strong); }\n.secondary { color: var(--accent-strong); background: rgba(15,118,110,0.1); font-weight: 700; }\n.small { min-height: 34px; padding: 0 14px; }\n\n/* deploy panel */\n.deploy-panel { display: flex; gap: 18px; align-items: center; }\n\n/* result */\n.result {\n  flex: 1; min-height: 52px; display: flex; align-items: center;\n  border: 1px solid var(--line); border-radius: 18px; padding: 0 16px;\n  color: var(--muted); background: var(--panel-strong); line-height: 1.4;\n  word-break: break-all;\n}\n.result.success { color: var(--accent-strong); background: rgba(15,118,110,0.1); }\n.result.error { color: var(--danger); background: rgba(180,35,24,0.08); }\n\n/* logs */\n.logs-panel { padding-bottom: 12px; }\npre {\n  min-height: 180px; max-height: 380px; overflow: auto;\n  margin: 0; border: 1px solid rgba(15,23,42,0.1); border-radius: 18px;\n  padding: 16px; color: #d1fadf; background: #101828;\n  font: 13px/1.55 ui-monospace,\"SF Mono\",Menlo,Consolas,monospace; white-space: pre-wrap;\n}\n\n@media (max-width: 780px) {\n  .hero, .two { grid-template-columns: 1fr; }\n  .deploy-panel { flex-direction: column; align-items: stretch; }\n  .panel-head { flex-direction: column; align-items: stretch; }\n}\n</style>\n</head>\n<body>\n  <main class=\"shell\">\n    <section class=\"hero\">\n      <div>\n        <p class=\"eyebrow\">Cloudflare Pages \u90e8\u7f72\u5de5\u5177 \u00b7 <b style=\"color:#b42318\">v20260825-76</b></p>\n        <h1>cf-nav<br>\u90e8\u7f72\u5668</h1>\n        <p class=\"summary\">\u586b\u5199 Cloudflare \u51ed\u636e\u548c\u7ba1\u7406\u5458\u8d26\u53f7\uff0c\u70b9\u4e00\u6b21\u81ea\u52a8\u5b8c\u6210 KV \u521b\u5efa\u3001\u4e66\u7b7e\u5bfc\u5165\u3001Pages \u90e8\u7f72\u3002</p>\n      </div>\n      <div class=\"status-card\">\n        <span class=\"status-dot\"></span>\n        <strong>\u51ed\u636e\u4e0d\u4f1a\u6301\u4e45\u5316</strong>\n        <p>\u5bc6\u94a5\u4ec5\u7528\u4e8e\u8f6c\u53d1 Cloudflare API \u8bf7\u6c42\uff0c\u4e0d\u5b58\u50a8\u5728\u670d\u52a1\u5668\u7aef\u3002</p>\n      </div>\n    </section>\n\n    <!-- \u6b65\u9aa4 1\uff1aCF \u51ed\u636e -->\n    <section class=\"panel\">\n      <div class=\"panel-head\">\n        <div>\n          <h2>1. Cloudflare \u51ed\u636e</h2>\n          <p>\u9700\u8981 Global API Key\uff08\u4e0d\u662f API Token\uff09\u3002</p>\n        </div>\n        <button id=\"btnLoadAccounts\" class=\"secondary\">\u9a8c\u8bc1\u5e76\u52a0\u8f7d\u8d26\u6237</button>\n      </div>\n      <div class=\"grid two\">\n        <label>\n          <span>\u90ae\u7bb1</span>\n          <input id=\"email\" type=\"email\" autocomplete=\"username\" placeholder=\"you@cloudflare.com\" />\n        </label>\n        <label>\n          <span>Global API Key</span>\n          <input id=\"apiKey\" type=\"password\" autocomplete=\"current-password\" placeholder=\"\u5728 CF \u4e2a\u4eba\u8d44\u6599 \u2192 API Tokens \u83b7\u53d6\" />\n        </label>\n        <label>\n          <span>Account</span>\n          <select id=\"accountId\"><option value=\"\">\u9a8c\u8bc1\u540e\u81ea\u52a8\u52a0\u8f7d</option></select>\n        </label>\n        <label>\n          <span>\u53ef\u9009\uff1a\u7ed1\u5b9a\u57df\u540d\u7684 Zone</span>\n          <select id=\"zoneId\"><option value=\"\">\u4e0d\u7ed1\u5b9a\u81ea\u5b9a\u4e49\u57df\u540d</option></select>\n        </label>\n      </div>\n      <div id=\"credStatus\" class=\"result mt\">\u7b49\u5f85\u9a8c\u8bc1</div>\n    </section>\n\n    <!-- \u6b65\u9aa4 2\uff1a\u90e8\u7f72\u914d\u7f6e -->\n    <section class=\"panel\">\n      <div class=\"panel-head\">\n        <div>\n          <h2>2. \u90e8\u7f72\u914d\u7f6e</h2>\n          <p>\u8bbe\u7f6e\u4f60\u7684\u5bfc\u822a\u7ad9\u4fe1\u606f\u548c\u7ba1\u7406\u5458\u8d26\u53f7\u3002</p>\n        </div>\n        <button id=\"btnRandNames\" class=\"secondary\">\u968f\u673a\u9879\u76ee\u540d</button>\n      </div>\n      <div class=\"grid two\">\n        <label>\n          <span>Pages \u9879\u76ee\u540d</span>\n          <input id=\"projectName\" placeholder=\"nav-xxxxxxxx\uff08\u81ea\u52a8\u968f\u673a\uff09\" />\n        </label>\n        <label>\n          <span>KV \u547d\u540d\u7a7a\u95f4\u540d</span>\n          <input id=\"kvTitle\" placeholder=\"nav-kv-xxxxxxxx\uff08\u81ea\u52a8\u968f\u673a\uff09\" />\n        </label>\n        <label>\n          <span>\u7ad9\u70b9\u540d\u79f0</span>\n          <input id=\"siteName\" value=\"\u6211\u7684\u5bfc\u822a\" />\n        </label>\n        <label>\n          <span>\u53ef\u9009\uff1a\u81ea\u5b9a\u4e49\u57df\u540d</span>\n          <input id=\"hostname\" placeholder=\"nav.yourdomain.com\" />\n        </label>\n        <label>\n          <span>\u7ba1\u7406\u5458\u7528\u6237\u540d</span>\n          <input id=\"adminUsername\" value=\"admin\" />\n        </label>\n        <label>\n          <span>\u7ba1\u7406\u5458\u5bc6\u7801 <span class=\"required\">*</span></span>\n          <input id=\"adminPassword\" type=\"password\" placeholder=\"\u8bf7\u8bbe\u7f6e\u767b\u5f55\u5bc6\u7801\" />\n        </label>\n      </div>\n    </section>\n\n    <!-- \u6b65\u9aa4 3\uff1a\u4e66\u7b7e\u5bfc\u5165\uff08\u53ef\u9009\uff09 -->\n    <section class=\"panel\">\n      <div class=\"panel-head\">\n        <div>\n          <h2>3. \u5bfc\u5165\u4e66\u7b7e\uff08\u53ef\u9009\uff09</h2>\n          <p>\u4e0a\u4f20\u6d4f\u89c8\u5668\u5bfc\u51fa\u7684\u4e66\u7b7e HTML \u6587\u4ef6\uff0c\u81ea\u52a8\u89e3\u6790\u540e\u5199\u5165 KV\u3002</p>\n        </div>\n      </div>\n      <label class=\"file-label\">\n        <span>\u4e66\u7b7e HTML \u6587\u4ef6</span>\n        <input id=\"bookmarksFile\" type=\"file\" accept=\".html,.htm\" />\n      </label>\n      <div id=\"bookmarksStatus\" class=\"result mt\">\u672a\u9009\u62e9\u6587\u4ef6</div>\n    </section>\n\n    <!-- \u90e8\u7f72\u6309\u94ae -->\n    <section class=\"panel deploy-panel\">\n      <button id=\"btnDeploy\" class=\"primary\">\u4e00\u952e\u90e8\u7f72</button>\n      <div id=\"deployResult\" class=\"result\">\u7b49\u5f85\u90e8\u7f72</div>\n    </section>\n\n    <!-- \u65e5\u5fd7 -->\n    <section class=\"panel logs-panel\">\n      <div class=\"panel-head compact\">\n        <h2>\u65e5\u5fd7</h2>\n        <button id=\"btnClearLogs\" class=\"secondary small\">\u6e05\u7a7a</button>\n      </div>\n      <pre id=\"logs\"></pre>\n    </section>\n  </main>\n  <script src=\"/app.js?v=20260825\"></script>\n</body>\n</html>\n";

function serveStatic(path) {
  if (path === '/' || path === '/index.html') {
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
    });
  }
  return null;
}

// ─── 后端 Worker 逻辑 ─────────────────────────────────────────────
const CF_API = 'https://api.cloudflare.com/client/v4';
const COMPAT_DATE = '2024-09-23';
const KV_BINDING = 'NAV_KV';
const GITHUB_RAW = 'https://raw.githubusercontent.com/xuxk-cn/bookmarks/master/cf-nav/release';

const PUBLIC_FILES = [
  '_headers',
  'admin/index.html',
  'backgrounds/a1.html','backgrounds/a2.html','backgrounds/a3.html','backgrounds/a4.html',
  'backgrounds/a5.html','backgrounds/a6.html','backgrounds/a7.html','backgrounds/a8.html',
  'backgrounds/a9.html','backgrounds/a10.html','backgrounds/a11.html','backgrounds/a12.html',
  'backgrounds/a13.html','backgrounds/a14.html','backgrounds/a15.html','backgrounds/a16.html',
  'backgrounds/a17.html','backgrounds/a18.html','backgrounds/a19.html','backgrounds/a20.html',
  'backgrounds/a21.html','backgrounds/a22.html','backgrounds/a23.html','backgrounds/a24.html',
  'backgrounds/a25.html','backgrounds/a26.html','backgrounds/a27.html','backgrounds/a28.html',
  'backgrounds/a29.html','backgrounds/a30.html','backgrounds/a31.html','backgrounds/a32.html',
  'backgrounds/a33.html','backgrounds/a34.html','backgrounds/a35.html','backgrounds/a36.html',
  'backgrounds/a37.html','backgrounds/a38.html','backgrounds/a39.html','backgrounds/a40.html',
  'backgrounds/a41.html','backgrounds/a42.html','backgrounds/a43.html','backgrounds/a44.html',
  'backgrounds/a45.html','backgrounds/a46.html','backgrounds/a47.html',
  'backgrounds/three.min.js',
  'backgrounds/aurora.js','backgrounds/forest.js','backgrounds/matrix.js','backgrounds/particles.js',
  'backgrounds/rain.html','backgrounds/rain.js','backgrounds/sakura.js','backgrounds/snow.js',
  'backgrounds/stars.js','backgrounds/stream.js',
  'backgrounds/styles1.html','backgrounds/styles2.html','backgrounds/styles3.html',
  'bg-preview.html',
  'css/main.css',
  'css/beauty.css',
  'css/styles01.css','css/styles02.css','css/styles03.css','css/styles04.css',
  'css/styles05.css','css/styles06.css','css/styles07.css','css/styles08.css',
  'css/styles09.css','css/styles10.css','css/styles11.css','css/styles12.css',
  'css/styles13.css','css/styles14.css','css/styles15.css','css/styles16.css',
  'index.html',
  'js/background.js','js/beauty.js','js/main.js','js/search.js','js/shader-runner.js','js/sound.js',
  'style-preview.html',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      const apiPath = path.replace(/^\/api\/?/, '');
      if (request.method === 'POST') return handlePost(apiPath, request, env);
      return jsonResp(405, { ok: false, error: '只支持 POST' });
    }

    // 静态资源交给 ASSETS 绑定处理
    const staticResp = serveStatic(path);
    if (staticResp) return staticResp;
    if (env?.ASSETS?.fetch) {
      const r = await env.ASSETS.fetch(request);
      // js/css 禁缓存：部署器更新后普通刷新即可生效，避免浏览器用旧前端
      if (/\.(js|css)$/i.test(path)) {
        const h = new Headers(r.headers);
        h.set('Cache-Control', 'no-cache, must-revalidate');
        return new Response(r.body, { status: r.status, headers: h });
      }
      return r;
    }
    return new Response('Not Found', { status: 404 });
  }
};
// 获取最新 commit SHA（避免 CDN 缓存）
// 优先走 git 协议 refs 端点（无速率限制），失败再退回 GitHub API
async function getLatestCommitSha() {
  // 方案1: git info/refs —— 不占 API 配额
  try {
    const res = await fetch('https://github.com/xuxk-cn/bookmarks.git/info/refs?service=git-upload-pack', {
      headers: { 'User-Agent': 'cf-nav-deployer' }
    });
    if (res.ok) {
      const text = await res.text();
      const m = text.match(/([0-9a-f]{40}) refs\/heads\/master/);
      if (m) return m[1];
    }
  } catch {}
  // 方案2: GitHub API（匿名 60 次/小时/IP，可能 403）
  const res = await fetch('https://api.github.com/repos/xuxk-cn/bookmarks/commits/master', {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'cf-nav-deployer'
    }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`获取 GitHub commit SHA 失败: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.sha;
}

let GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/xuxk-cn/bookmarks';
let GITHUB_COMMIT_SHA = null;

async function getGithubRawBase() {
  if (!GITHUB_COMMIT_SHA) {
    GITHUB_COMMIT_SHA = await getLatestCommitSha();
  }
  return `${GITHUB_RAW_BASE}/${GITHUB_COMMIT_SHA}/cf-nav/release`;
}



async function handlePost(path, request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    if (path === 'accounts') return await handleAccounts(body);
    if (path === 'zones') return await handleZones(body);
    // 旧的单步部署（保留向后兼容，但因 subrequest 限制会失败）
    if (path === 'deploy') return await handleDeploy(body);
    // 新的分步部署接口
    if (path === 'deploy/prepare')  return await handleDeployPrepare(body);
    if (path === 'deploy/upload-batch') return await handleDeployUploadBatch(body);
    if (path === 'deploy/finalize') return await handleDeployFinalize(body);
    return jsonResp(404, { ok: false, error: '接口不存在' });
  } catch (e) {
    return jsonResp(500, { ok: false, error: e.message || String(e) });
  }
}

// ─── 获取账户列表 ───────────────────────────────────────────────
async function handleAccounts({ credentials }) {
  const accounts = await cfApi(credentials, '/accounts?per_page=50');
  return jsonResp(200, {
    ok: true,
    accounts: accounts.map(a => ({ id: a.id, name: a.name }))
  });
}

// ─── 获取域名列表 ───────────────────────────────────────────────
async function handleZones({ credentials }) {
  const zones = await cfApi(credentials, '/zones?status=active&per_page=100');
  return jsonResp(200, {
    ok: true,
    zones: zones.map(z => ({ id: z.id, name: z.name }))
  });
}

// ─── 主部署流程 ─────────────────────────────────────────────────
async function handleDeploy(data) {
  const logs = [];
  const log = msg => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  const creds = data.credentials;
  if (!creds?.email || !creds?.key) throw new Error('缺少 Cloudflare 邮箱或 Global API Key');

  // 1. 自动获取 accountId
  if (!data.accountId) {
    const accounts = await cfApi(creds, '/accounts?per_page=50');
    if (!accounts.length) throw new Error('当前凭据没有可用账户');
    data.accountId = accounts[0].id;
    log(`使用账户: ${accounts[0].name}`);
  }

  const projectName = cleanName(data.projectName || randName('nav'));
  const siteName = data.siteName || '我的导航';
  const adminUser = data.adminUsername || 'admin';
  const adminPass = data.adminPassword;
  if (!adminPass) throw new Error('请设置管理员密码');

  log(`项目名: ${projectName}`);

  // 2. 创建 KV
  const kvTitle = data.kvTitle || randName('nav-kv');
  const kv = await createKV(creds, data.accountId, kvTitle, log);

  // 3. 初始化 KV 数据（管理员账号 + 默认设置）
  await initKV(creds, data.accountId, kv.id, {
    adminUser, adminPass, siteName,
    bookmarksHtml: data.bookmarksHtml || null
  }, log);

  // 4. 创建 Pages 项目
  await createPagesProject(creds, data.accountId, projectName, kv.id, log);

  // 5. 从 GitHub 拉取并上传所有静态文件
  log(`开始从 GitHub 拉取 ${PUBLIC_FILES.length} 个静态文件...`);
  const manifest = await uploadStaticFiles(creds, data.accountId, projectName, log);

  // 6. 从 GitHub 拉取并打包 functions，上传部署
  log('拉取后端函数文件...');
  const workerCode = await buildWorkerBundle(log);

  // 7. 提交部署
  log('提交 Pages 部署...');
  const deployment = await submitDeployment(creds, data.accountId, projectName, manifest, workerCode, log);

  // 8. 绑定域名（可选）
  let domain = null;
  if (data.hostname && data.zoneId) {
    domain = await bindDomain(creds, data.accountId, projectName, data.hostname, data.zoneId, log);
  }

  log('✅ 部署完成！');
  return jsonResp(200, {
    ok: true,
    projectName,
    url: deployment?.url || `https://${projectName}.pages.dev`,
    domain,
    kv: { id: kv.id, title: kvTitle },
    logs
  });
}

// ─── 分步部署：准备阶段 ─────────────────────────────────────────
// 完成：获取 accountId、创建 KV、写入 admin/settings/bookmarks、创建/更新 Pages 项目、获取 upload-token
// 单次 worker 调用子请求约 10 个（远低于 50 限制）
async function handleDeployPrepare(data) {
  const logs = [];
  const log = msg => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  const creds = data.credentials;
  if (!creds?.email || !creds?.key) throw new Error('缺少 Cloudflare 邮箱或 Global API Key');

  // 1. 自动获取 accountId
  let accountId = data.accountId;
  if (!accountId) {
    const accounts = await cfApi(creds, '/accounts?per_page=50');
    if (!accounts.length) throw new Error('当前凭据没有可用账户');
    accountId = accounts[0].id;
    log(`使用账户: ${accounts[0].name}`);
  }

  const projectName = cleanName(data.projectName || randName('nav'));
  const siteName = data.siteName || '我的导航';
  const adminUser = data.adminUsername || 'admin';
  const adminPass = data.adminPassword;
  if (!adminPass) throw new Error('请设置管理员密码');

  log(`项目名: ${projectName}`);

  // 2. 创建 KV
  const kvTitle = data.kvTitle || randName('nav-kv');
  const kv = await createKV(creds, accountId, kvTitle, log);

  // 3. 初始化 KV 数据
  await initKV(creds, accountId, kv.id, {
    adminUser, adminPass, siteName,
    bookmarksHtml: data.bookmarksHtml || null
  }, log);

  // 4. 创建 Pages 项目
  await createPagesProject(creds, accountId, projectName, kv.id, log);

  // 5. 获取 upload-token + 最新 commit SHA（前端用 raw@SHA 拉文件，绕开 CDN 缓存）
  const [{ jwt }, commitSha] = await Promise.all([
    cfApi(creds, `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/upload-token`),
    getLatestCommitSha()
  ]);
  log(`准备阶段完成（commit ${String(commitSha).slice(0,10)}）`);

  return jsonResp(200, {
    ok: true,
    accountId,
    projectName,
    kvTitle,
    kvId: kv.id,
    jwt,
    commitSha,
    logs
  });
}

// ─── 分步部署：批量上传静态文件 ──────────────────────────────────
// 入参: { credentials, jwt, assets: [{ path, contentBase64 }] }
// 单次 worker 调用子请求约 3 个（check-missing + upload + upsert-hashes）
async function handleDeployUploadBatch(data) {
  const logs = [];
  const log = msg => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  if (!data.jwt) throw new Error('缺少 upload JWT（请先调用 prepare）');
  const assets = Array.isArray(data.assets) ? data.assets : [];
  if (!assets.length) throw new Error('本次没有上传文件');

  // 每个 asset: { path, contentBase64 }，计算 hash
  const fileEntries = [];
  for (const a of assets) {
    if (!a?.path || !a?.contentBase64) continue;
    const bin = atob(a.contentBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = (a.path.split('.').pop() || 'bin').toLowerCase();
    const hash = await calcHash(bytes, ext);
    fileEntries.push({ path: a.path, bytes, hash, ext });
  }

  // check-missing
  const allHashes = fileEntries.map(f => f.hash);
  const missing = await jwtApi(data.jwt, '/pages/assets/check-missing', {
    method: 'POST', body: { hashes: allHashes }
  });
  const missingSet = new Set(Array.isArray(missing) ? missing : allHashes);
  log(`本批 ${fileEntries.length} 个文件，缺 ${missingSet.size} 需上传`);

  // 上传缺失文件
  const toUpload = fileEntries.filter(f => missingSet.has(f.hash));
  if (toUpload.length) {
    await jwtApi(data.jwt, '/pages/assets/upload', {
      method: 'POST',
      body: toUpload.map(f => ({
        key: f.hash,
        value: bytesToBase64(f.bytes),
        metadata: { contentType: getContentType(f.path) },
        base64: true
      }))
    });
    log(`已上传 ${toUpload.length} 个新文件`);
  }

  // upsert-hashes
  await jwtApi(data.jwt, '/pages/assets/upsert-hashes', {
    method: 'POST', body: { hashes: allHashes }
  }).catch(() => null);

  // 返回本批每文件对应的 path → hash 映射（前端累积传给 finalize）
  const manifestPatch = {};
  for (const f of fileEntries) manifestPatch[`/${f.path}`] = f.hash;

  return jsonResp(200, {
    ok: true,
    manifestPatch,
    batchCount: fileEntries.length,
    missingCount: missingSet.size,
    logs
  });
}

// ─── 分步部署：收尾（拉 worker bundle + 提交部署 + 可选绑定域名）───
// 单次 worker 调用子请求约 3-5 个
async function handleDeployFinalize(data) {
  const logs = [];
  const log = msg => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  const creds = data.credentials;
  if (!creds?.email || !creds?.key) throw new Error('缺少 Cloudflare 凭据');
  if (!data.accountId || !data.projectName) throw new Error('缺少 accountId 或 projectName');
  if (!data.manifest || typeof data.manifest !== 'object') throw new Error('缺少 manifest');

  // 1. 拉取预打包 worker bundle
  log('拉取预打包 Worker 文件...');
  const workerBundle = await buildWorkerBundle(log);

  // 2. 提交部署
  log('提交 Pages 部署...');
  const deployment = await submitDeployment(creds, data.accountId, data.projectName, data.manifest, workerBundle, log);

  // 3. 可选绑定域名
  let domain = null;
  if (data.hostname && data.zoneId) {
    domain = await bindDomain(creds, data.accountId, data.projectName, data.hostname, data.zoneId, log);
  }

  log('✅ 部署完成！');
  return jsonResp(200, {
    ok: true,
    projectName: data.projectName,
    url: deployment?.url || `https://${data.projectName}.pages.dev`,
    domain,
    logs
  });
}

// ─── 创建 KV ────────────────────────────────────────────────────
async function createKV(creds, accountId, title, log) {
  const list = await cfApi(creds, `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  const existing = list.find(k => k.title === title);
  if (existing) {
    log(`复用 KV: ${title}`);
    return existing;
  }
  const result = await cfApi(creds, `/accounts/${accountId}/storage/kv/namespaces`, {
    method: 'POST', body: { title }
  });
  log(`创建 KV: ${title}`);
  return result;
}

// ─── 初始化 KV 数据 ─────────────────────────────────────────────
async function initKV(creds, accountId, kvId, { adminUser, adminPass, siteName, bookmarksHtml }, log) {
  const base = `/accounts/${accountId}/storage/kv/namespaces/${kvId}/values`;

  await kvPut(creds, base, 'admin_username', adminUser);
  await kvPut(creds, base, 'admin_password', adminPass);
  log('管理员账号已写入 KV');

  const settings = {
    siteName, siteDesc: '个人书签导航站', footerText: '',
    defaultStyle: '1', defaultBg: 'none', enableSubmit: false,
    aiProvider: 'workers', aiModel: '@cf/google/gemma-4-26b-a4b-it',
    aiApiKey: '', aiDelay: 1500,
    faviconApi: 'https://faviconsnap.com/api/favicon?url=',
    sessionTtl: 86400
  };
  await kvPut(creds, base, 'nav_settings', JSON.stringify(settings));
  log('默认设置已写入 KV');

  // 解析书签 HTML（如果提供）
  if (bookmarksHtml) {
    const navData = parseBookmarksHtml(bookmarksHtml);
    await kvPut(creds, base, 'nav_data', JSON.stringify(navData));
    const total = navData.categories.reduce((n, c) => n + c.items.length, 0);
    log(`书签已导入: ${navData.categories.length} 个分类，${total} 个书签`);
  } else {
    await kvPut(creds, base, 'nav_data', JSON.stringify({ categories: [] }));
    log('书签数据初始化为空');
  }
}

async function kvPut(creds, base, key, value) {
  await cfApiRaw(creds, `${base}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: value
  });
}

// ─── 创建 Pages 项目 ─────────────────────────────────────────────
async function createPagesProject(creds, accountId, projectName, kvId, log) {
  try {
    await cfApi(creds, `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`);
    log('Pages 项目已存在，更新 KV 绑定...');
    const envCfg = {
      compatibility_date: COMPAT_DATE,
      kv_namespaces: { [KV_BINDING]: { namespace_id: kvId } }
    };
    await cfApi(creds, `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, {
      method: 'PATCH',
      body: { deployment_configs: { production: envCfg, preview: envCfg } }
    });
  } catch (e) {
    if (!String(e.message).includes('404')) throw e;
    const envCfg = {
      compatibility_date: COMPAT_DATE,
      kv_namespaces: { [KV_BINDING]: { namespace_id: kvId } }
    };
    await cfApi(creds, `/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      body: {
        name: projectName,
        production_branch: 'main',
        deployment_configs: { production: envCfg, preview: envCfg }
      }
    });
    log('Pages 项目已创建');
  }
}

// ─── 上传静态文件 ────────────────────────────────────────────────
async function uploadStaticFiles(creds, accountId, projectName, log) {
  // 获取上传 JWT
  const { jwt } = await cfApi(creds,
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/upload-token`
  );

  // 获取 GitHub raw base URL (含 commit SHA)
  const githubRawBase = await getGithubRawBase();

  // 并发拉取所有文件（分批，每批 10 个）
  const BATCH = 10;
  const fileEntries = [];
  for (let i = 0; i < PUBLIC_FILES.length; i += BATCH) {
    const batch = PUBLIC_FILES.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (path) => {
      const url = `${githubRawBase}/public/${path}?t=${Date.now()}`;
      const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (!resp.ok) throw new Error(`拉取文件失败: ${path} (${resp.status})`);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const ext = path.split('.').pop() || 'bin';
      const hash = await calcHash(bytes, ext);
      return { path, bytes, hash, ext };
    }));
    fileEntries.push(...results);
    log(`已拉取 ${Math.min(i + BATCH, PUBLIC_FILES.length)}/${PUBLIC_FILES.length} 个文件`);
  }

  // check-missing
  const allHashes = fileEntries.map(f => f.hash);
  const missing = await jwtApi(jwt, '/pages/assets/check-missing', {
    method: 'POST', body: { hashes: allHashes }
  });
  const missingSet = new Set(Array.isArray(missing) ? missing : allHashes);
  log(`需要上传 ${missingSet.size} 个新文件（共 ${fileEntries.length} 个）`);

  // 上传缺失文件（分批，每批 20 个）
  const toUpload = fileEntries.filter(f => missingSet.has(f.hash));
  for (let i = 0; i < toUpload.length; i += 20) {
    const batch = toUpload.slice(i, i + 20);
    await jwtApi(jwt, '/pages/assets/upload', {
      method: 'POST',
      body: batch.map(f => ({
        key: f.hash,
        value: bytesToBase64(f.bytes),
        metadata: { contentType: getContentType(f.path) },
        base64: true
      }))
    });
  }

  // upsert-hashes
  await jwtApi(jwt, '/pages/assets/upsert-hashes', {
    method: 'POST', body: { hashes: allHashes }
  }).catch(() => null);

  // 构建 manifest（路径 → hash 的映射）
  const manifest = {};
  for (const f of fileEntries) {
    manifest[`/${f.path}`] = f.hash;
  }
  log('静态文件上传完成');
  return manifest;
}

// ─── 拉取预打包的 Worker bundle ──────────────────────────────────
async function buildWorkerBundle(log) {
  // 直接拉取 GitHub 上预先用 esbuild 打包好的单文件 _worker.js
  const githubRawBase = await getGithubRawBase();
  const url = `${githubRawBase}/dist/_worker.js?t=${Date.now()}`;
  log('拉取预打包 Worker 文件...');
  const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!resp.ok) throw new Error(`拉取 Worker 文件失败: ${resp.status} ${resp.statusText}`);
  const workerCode = await resp.text();
  if (!workerCode.trim()) throw new Error('拉取 Worker 文件失败: 文件为空');
  log(`Worker 文件已拉取 (${(workerCode.length / 1024).toFixed(1)} KB)`);

  // 完全照抄 deploy-panel 的 生成WorkerBundle 函数
  const inner = new FormData();
  const metadata = {
    main_module: 'worker.js',
    compatibility_date: COMPAT_DATE
  };
  inner.set('metadata', JSON.stringify(metadata));
  inner.set('worker.js', new Blob([workerCode], { type: 'application/javascript+module' }), 'worker.js');
  return await new Response(inner).blob();
}

// ─── 提交部署 ────────────────────────────────────────────────────
async function submitDeployment(creds, accountId, projectName, manifest, workerBundle, log) {
  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));
  form.append('branch', 'main');
  form.append('commit_dirty', 'true');
  form.append('commit_message', 'deploy via cf-nav deployer');
  form.append('_worker.bundle', workerBundle, '_worker.bundle');

  const result = await cfApi(creds,
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
    { method: 'POST', body: form }
  );
  if (result?.url) log(`部署地址: ${result.url}`);
  return result;
}

// ─── 绑定域名 ────────────────────────────────────────────────────
async function bindDomain(creds, accountId, projectName, hostname, zoneId, log) {
  try {
    const result = await cfApi(creds,
      `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/domains`,
      { method: 'POST', body: { name: hostname } }
    );
    log(`域名已绑定: ${hostname}`);
    // 创建 CNAME 记录
    try {
      await cfApi(creds, `/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: { type: 'CNAME', name: hostname, content: `${projectName}.pages.dev`, proxied: true }
      });
      log(`CNAME 记录已创建: ${hostname} → ${projectName}.pages.dev`);
    } catch (dnsErr) {
      log(`CNAME 记录跳过（可能已存在）: ${dnsErr.message}`);
    }
    return { hostname: result.name || hostname };
  } catch (e) {
    log(`域名绑定失败: ${e.message}`);
    return null;
  }
}

// ─── 书签 HTML 解析 ──────────────────────────────────────────────
function parseBookmarksHtml(html) {
  const categories = [];
  // 匹配 <H3>分类名</H3> 和其后的 <DL> 书签列表
  const catRe = /<H3[^>]*>([^<]+)<\/H3>\s*<DL[^>]*>([\s\S]*?)<\/DL>/gi;
  const linkRe = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
  let catMatch;
  while ((catMatch = catRe.exec(html)) !== null) {
    const title = catMatch[1].trim();
    const block = catMatch[2];
    const items = [];
    let linkMatch;
    while ((linkMatch = linkRe.exec(block)) !== null) {
      items.push({ url: linkMatch[1], title: linkMatch[2].trim(), icon: '', hover: '' });
    }
    if (items.length) categories.push({ title, items });
  }
  return { categories };
}

// ─── CF API 工具函数 ──────────────────────────────────────────────
async function cfApi(creds, path, options = {}) {
  const headers = {
    'X-Auth-Email': creds.email,
    'X-Auth-Key': creds.key,
    ...(options.headers || {})
  };
  return reqJson(`${CF_API}${path}`, headers, options);
}

async function cfApiRaw(creds, path, options = {}) {
  const headers = {
    'X-Auth-Email': creds.email,
    'X-Auth-Key': creds.key,
    ...(options.headers || {})
  };
  const resp = await fetch(`${CF_API}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body
  });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return resp;
}

async function jwtApi(jwt, path, options = {}) {
  const headers = {
    Authorization: `Bearer ${jwt}`,
    ...(options.headers || {})
  };
  return reqJson(`${CF_API}${path}`, headers, options);
}

async function reqJson(url, headers, options = {}) {
  let body = options.body;
  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }
  const resp = await fetch(url, { method: options.method || 'GET', headers, body });
  const ct = resp.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await resp.json() : await resp.text();
  if (!resp.ok) {
    const msg = typeof data === 'string' ? data
      : (data?.errors || []).map(e => e.message || JSON.stringify(e)).join('; ');
    throw new Error(`${resp.status} ${resp.statusText}${msg ? ` - ${msg}` : ''}`);
  }
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success) {
      const msg = (data.errors || []).map(e => e.message || JSON.stringify(e)).join('; ');
      throw new Error(msg || 'CF API 请求失败');
    }
    return data.result;
  }
  return data;
}

// ─── 工具函数 ─────────────────────────────────────────────────────
async function calcHash(bytes, ext) {
  const digest = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(`${bytesToBase64(bytes)}${ext}`)
  );
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.slice(i, i + CHUNK));
  }
  return btoa(bin);
}

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    ico: 'image/x-icon',
  };
  return map[ext] || 'text/plain';
}

function cleanName(name) {
  return String(name).trim().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || randName('nav');
}

function randName(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function jsonResp(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}