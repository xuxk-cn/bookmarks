const $ = id => document.getElementById(id);

// ─── 初始化 ───────────────────────────────────────────────────────
setRandomNames();

$('bookmarksFile').addEventListener('change', () => {
  const f = $('bookmarksFile').files[0];
  setStatus('bookmarksStatus', f ? `已选择: ${f.name} (${(f.size/1024).toFixed(1)} KB)` : '未选择文件');
});

$('btnRandNames').addEventListener('click', setRandomNames);
$('btnClearLogs').addEventListener('click', () => { $('logs').textContent = ''; });
$('btnLoadAccounts').addEventListener('click', loadAccounts);
$('btnDeploy').addEventListener('click', deploy);

// ─── 加载账户/域名 ────────────────────────────────────────────────
async function loadAccounts() {
  setBusy(true);
  setStatus('credStatus', '验证中...');
  try {
    const creds = getCredentials();
    const [acctRes, zoneRes] = await Promise.all([
      post('/api/accounts', { credentials: creds }),
      post('/api/zones', { credentials: creds })
    ]);
    fillSelect($('accountId'), acctRes.accounts || [], '选择账户');
    fillSelect($('zoneId'), zoneRes.zones || [], '不绑定自定义域名');
    setStatus('credStatus', `验证成功 — ${acctRes.accounts?.length || 0} 个账户，${zoneRes.zones?.length || 0} 个域名`, 'success');
    log(`账户数: ${acctRes.accounts?.length || 0}，可用 Zone: ${zoneRes.zones?.length || 0}`);
  } catch (e) {
    setStatus('credStatus', e.message, 'error');
    log(`验证失败: ${e.message}`);
  } finally {
    setBusy(false);
  }
}

// ─── 部署 ────────────────────────────────────────────────────────
// 与 cf-nav/release/public 下需部署的静态文件清单保持一致
// 文件内容一律从 raw.githubusercontent.com@<commitSha> 拉取：
// SHA 固定不可变，任何 CDN 都不会返回旧版本（jsDelivr @master 有缓存且忽略参数，已弃用）
const REPO = 'xuxk-cn/bookmarks';
let SRC_BASE = ''; // deploy() 里由 prepare 返回的 commitSha 填充
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
  'backgrounds/a45.html','backgrounds/a46.html',
  'backgrounds/aurora.js','backgrounds/forest.js','backgrounds/matrix.js','backgrounds/particles.js',
  'backgrounds/rain.html','backgrounds/rain.js','backgrounds/sakura.js','backgrounds/snow.js',
  'backgrounds/stars.js','backgrounds/stream.js',
  'backgrounds/styles1.html','backgrounds/styles2.html','backgrounds/styles3.html',
  'bg-preview.html',
  'css/main.css',
  'css/beauty.css',
  'css/styles01.css','css/styles02.css','css/styles03.css',
  'index.html',
  'js/background.js','js/beauty.js','js/hover-module.js','js/main.js','js/search.js','js/shader-runner.js','js/sound.js',
  'style-preview.html',
];

const BATCH_SIZE = 8;          // 每批从 GitHub 拉取并上传的文件数（控制单请求 body 体积）
const FETCH_CONCURRENCY = 4;   // 单批内的并发 fetch 数

const EXPECTED_FILES = 76; // 与下方清单严格一致；不符说明加载了旧版脚本
if (PUBLIC_FILES.length !== EXPECTED_FILES) { alert('部署器版本异常: 清单 '+PUBLIC_FILES.length+'/'+EXPECTED_FILES+'，请 Ctrl+F5 强制刷新'); return; }
async function deploy() {
  const adminPass = $('adminPassword').value.trim();
  if (!adminPass) { setResult('请先设置管理员密码', 'error'); return; }

  setBusy(true);
  setResult('部署中，请稍候（约 2-4 分钟）...');
  $('logs').textContent = '';
  const startedAt = Date.now();

  try {
    const creds = getCredentials();
    const basePayload = {
      credentials: creds,
      accountId: $('accountId').value,
      projectName: $('projectName').value.trim(),
      kvTitle: $('kvTitle').value.trim(),
      siteName: $('siteName').value.trim() || '我的导航',
      adminUsername: $('adminUsername').value.trim() || 'admin',
      adminPassword: adminPass,
      hostname: $('hostname').value.trim(),
      zoneId: $('zoneId').value,
    };

    // 读取书签文件
    const file = $('bookmarksFile').files[0];
    if (file) {
      basePayload.bookmarksHtml = await readFile(file);
      log(`书签文件已读取: ${file.name}`);
    }

    // ── Step 1: prepare ─────────────────────────────────────
    setResult('1/3 准备环境（创建 KV、Pages 项目）...');
    log('\n[1/3] 准备环境...');
    const prepare = await post('/api/deploy/prepare', basePayload);
    (prepare.logs || []).forEach(log);

    if (!prepare.commitSha) throw new Error('prepare 未返回 commitSha');
    SRC_BASE = `https://raw.githubusercontent.com/${REPO}/${prepare.commitSha}/cf-nav/release`;
    log(`代码源: GitHub raw @ ${prepare.commitSha.slice(0, 10)}`);

    const { accountId, projectName, jwt } = prepare;
    const manifest = {};

    // ── Step 2: 上传静态文件（前端直接从 GitHub raw 拉取并 base64 后送 worker）──
    setResult(`2/3 上传静态文件（共 ${PUBLIC_FILES.length} 个）...`);
    log(`\n[2/3] 上传 ${PUBLIC_FILES.length} 个静态文件，分批拉取 GitHub raw...`);
    let uploaded = 0;
    for (let i = 0; i < PUBLIC_FILES.length; i += BATCH_SIZE) {
      const batchPaths = PUBLIC_FILES.slice(i, i + BATCH_SIZE);
      // 分组并发：缓解 GitHub raw 单连接慢
      const assets = await fetchBatchBase64(batchPaths);
      const resp = await post('/api/deploy/upload-batch', { jwt, assets });
      (resp.logs || []).forEach(log);
      Object.assign(manifest, resp.manifestPatch || {});
      uploaded += batchPaths.length;
      setResult(`2/3 上传中... ${uploaded}/${PUBLIC_FILES.length}`);
      log(`  已上传 ${uploaded}/${PUBLIC_FILES.length}（本批 ${batchPaths.length}，缺 ${resp.missingCount} 真传）`);
    }
    log(`静态文件 manifest 收集完成，共 ${Object.keys(manifest).length} 项`);

    // ── Step 3: finalize ─────────────────────────────────────
    setResult('3/3 提交 Pages 部署...');
    log('\n[3/3] 提交部署...');
    const finalize = await post('/api/deploy/finalize', {
      credentials: creds,
      accountId,
      projectName,
      manifest,
      hostname: basePayload.hostname,
      zoneId: basePayload.zoneId,
    });
    (finalize.logs || []).forEach(log);

    const url = finalize.domain?.hostname
      ? `https://${finalize.domain.hostname}`
      : finalize.url || `https://${projectName}.pages.dev`;
    setResult(`✅ 部署成功！访问：${url}`, 'success');
    const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
    log(`\n🎉 部署完成！(用时 ${secs}s)`);
    log(`   项目名: ${finalize.projectName}`);
    log(`   访问地址: ${url}`);
    log(`   管理后台: ${url}/admin`);
  } catch (e) {
    setResult(e.message, 'error');
    log(`❌ 部署失败: ${e.message}`);
  } finally {
    setBusy(false);
  }
}

// 并发从 CDN 拉取一批文件，返回 [{path, contentBase64}]
// 用 jsdelivr CDN 镜像 GitHub raw：不限流、有边缘缓存，
// 避免 raw.githubusercontent.com 未鉴权 60 次/小时被 429。
// 失败时按指数退避重试 3 次。
async function fetchBatchBase64(paths) {
  const out = [];
  for (let i = 0; i < paths.length; i += FETCH_CONCURRENCY) {
    const group = paths.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(group.map(async (path) => {
      const buf = await fetchWithRetry(path);
      const bytes = new Uint8Array(buf);
      let bin = '';
      const CHUNK = 0x8000;
      for (let j = 0; j < bytes.length; j += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(j, j + CHUNK));
      }
      return { path, contentBase64: btoa(bin) };
    }));
    out.push(...results);
  }
  return out;
}

// 带重试的拉取：raw@SHA 内容不可变，失败按指数退避重试 3 次
async function fetchWithRetry(path) {
  const url = `${SRC_BASE}/public/${path}`;
  const backoffs = [0, 600, 2500];
  let lastErr = null;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await sleep(backoffs[attempt]);
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (resp.ok) return await resp.arrayBuffer();
      if (resp.status === 404) throw new Error(`拉取 ${path} 失败: 404 (文件不存在)`);
      lastErr = new Error(`拉取 ${path} 失败: ${resp.status}`);
      await sleep(500 * Math.pow(2, attempt));
    } catch (e) {
      if (String(e.message).includes('404')) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error(`拉取 ${path} 失败`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 工具函数 ─────────────────────────────────────────────────────
function getCredentials() {
  const email = $('email').value.trim();
  const key = $('apiKey').value.trim();
  if (!email || !key) throw new Error('请填写 Cloudflare 邮箱和 Global API Key');
  return { email, key };
}

function setRandomNames() {
  $('projectName').value = randName('nav');
  $('kvTitle').value = randName('nav-kv');
}

function randName(prefix) {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `${prefix}-${[...bytes].map(b => b.toString(16).padStart(2,'0')).join('')}`;
}

function fillSelect(select, items, emptyLabel) {
  select.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = ''; opt.textContent = emptyLabel;
  select.append(opt);
  for (const item of items) {
    const o = document.createElement('option');
    o.value = item.id; o.textContent = `${item.name}`;
    select.append(o);
  }
  if (items.length === 1) select.value = items[0].id;
}

async function post(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok || !data.ok) throw new Error(data.error || `请求失败: ${resp.status}`);
  return data;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

function setStatus(id, text, type = '') {
  const el = $(id);
  el.textContent = text;
  el.className = `result mt ${type}`.trim();
}

function setResult(text, type = '') {
  const el = $('deployResult');
  el.textContent = text;
  el.className = `result ${type}`.trim();
}

function setBusy(busy) {
  document.querySelectorAll('button').forEach(b => b.disabled = busy);
}

function log(text) {
  const el = $('logs');
  el.textContent += `${text}\n`;
  el.scrollTop = el.scrollHeight;
}
