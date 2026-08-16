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
async function deploy() {
  // 基本校验
  const adminPass = $('adminPassword').value.trim();
  if (!adminPass) { setResult('请先设置管理员密码', 'error'); return; }

  setBusy(true);
  setResult('部署中，请稍候（约 1-2 分钟）...');
  $('logs').textContent = '';

  try {
    const creds = getCredentials();
    const payload = {
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
      payload.bookmarksHtml = await readFile(file);
      log(`书签文件已读取: ${file.name}`);
    }

    const result = await post('/api/deploy', payload);
    (result.logs || []).forEach(log);

    const url = result.domain?.hostname
      ? `https://${result.domain.hostname}`
      : result.url || `https://${result.projectName}.pages.dev`;
    setResult(`✅ 部署成功！访问：${url}`, 'success');
    log(`\n🎉 部署完成！`);
    log(`   项目名: ${result.projectName}`);
    log(`   访问地址: ${url}`);
    log(`   管理后台: ${url}/admin`);
    log(`   KV: ${result.kv?.title}`);
  } catch (e) {
    setResult(e.message, 'error');
    log(`❌ 部署失败: ${e.message}`);
  } finally {
    setBusy(false);
  }
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
