# Design Document

## Technical Context

### 项目结构

- `cf-nav/functions/api/settings.js` — Cloudflare Pages Function，处理 `/api/settings` GET/POST
- `cf-nav/functions/lib/kv.js` — KV 读写封装，`putSettings` 写入 `nav_settings` 条目
- `cf-nav/functions/lib/auth.js` — `verifyCredentials()` 直接读取 KV 的 `admin_password` 条目
- `cf-nav/public/admin/index.html` — 后台前端，`changePassword()` 函数发起密码修改请求
- `cf-nav/public/index.html` — 首页，包含 `#bg-select` / `#style-select` 及 topbar 结构
- `cf-nav/public/js/background.js` — 背景切换模块，监听 `#bg-select` change 事件
- `cf-nav/public/js/main.js` — 主逻辑，监听 `#style-select` change 事件
- `cf-nav/public/css/main.css` — 全局样式，使用 CSS 变量暗色主题

### 关键约束

- `verifyCredentials()` 读取的是 KV 独立条目 `admin_password`，而非 `nav_settings` JSON 中的字段
- `putSettings` 只写 `nav_settings` 条目，两者完全独立
- `background.js` 和 `main.js` 的逻辑不允许修改

---

## Fix 1：`settings.js` 密码修改处理

### 问题根因

`onRequestPost` 的当前逻辑：
```js
const updated = { ...current, ...body };
delete updated.adminUsername;
delete updated.adminPassword;
await putSettings(env, updated);
```

- `body._changePassword` 会被合并进 `updated` 并写入 `nav_settings`
- 但 `verifyCredentials()` 读的是独立的 `admin_password` KV 条目，该条目从未被更新

### 修复方案

在 `putSettings` 调用之前，检测并处理 `_changePassword`：

```js
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return err('无效请求体');

  // 处理密码修改
  if (body._changePassword) {
    await env.NAV_KV.put('admin_password', body._changePassword.trim());
  }
  delete body._changePassword;  // 不写入 nav_settings

  const current = await getSettings(env);
  const updated = { ...current, ...body };

  delete updated.adminUsername;
  delete updated.adminPassword;

  await putSettings(env, updated);
  return json({ ok: true });
}
```

**要点：**
- 空字符串不触发更新（`if (body._changePassword)` 自然过滤 falsy 值）
- `delete body._changePassword` 在合并前执行，确保不污染 `nav_settings`
- 复用已有的 `env.NAV_KV.put` 直接写独立 KV 条目，与 `verifyCredentials()` 读取路径一致

---

## Fix 2：登录硬编码旁路（暂不实现）

记录设计方案，留待后续任务处理：

删除 `login.js` 中的硬编码条件：
```js
// 删除这一行：
const ok = (username.trim() === 'admin' && password.trim() === 'admin123')
         || await verifyCredentials(env, username, password);

// 改为：
const ok = await verifyCredentials(env, username, password);
```

---

## Feature：背景/风格面板 UI 重设计

### 设计原则

- 仅修改 `index.html` 和 `main.css`，不触碰 `background.js` / `main.js`
- 通过同步更新隐藏 `<select>` 并 dispatch `change` 事件来驱动现有 JS 逻辑
- 纯 CSS + 原生 JS（内联于 `index.html` 的 `<script>` 块），不引入外部依赖

### HTML 结构变更

将现有的 topbar-right 区域从：
```html
<div class="topbar-right">
  <select id="bg-select" ...>...</select>
  <select id="style-select" ...>...</select>
</div>
```

改为：
```html
<div class="topbar-right">
  <!-- 隐藏的原始 select，保留供 JS 模块使用 -->
  <select id="bg-select" style="display:none">...</select>
  <select id="style-select" style="display:none">...</select>

  <!-- 背景按钮 + 面板 -->
  <div class="panel-wrap" id="bg-panel-wrap">
    <button class="panel-btn" id="bg-btn" title="背景选择">🌄 <span id="bg-label">无背景</span></button>
    <div class="panel-popup" id="bg-popup" hidden></div>
  </div>

  <!-- 风格按钮 + 面板 -->
  <div class="panel-wrap" id="style-panel-wrap">
    <button class="panel-btn" id="style-btn" title="卡片风格">🎨 <span id="style-label">风格一</span></button>
    <div class="panel-popup" id="style-popup" hidden>
      <div class="panel-item" data-value="1">风格一</div>
      <div class="panel-item" data-value="2">风格二</div>
      <div class="panel-item" data-value="3">风格三</div>
    </div>
  </div>
</div>
```

### 背景面板动态填充

`background.js` 的 `loadBgList()` 会动态向 `#bg-select` 插入 `<option>`。需要在 `index.html` 内用一个 `MutationObserver` 监听 `#bg-select` 子节点变化，将选项同步渲染到 `#bg-popup`：

```js
// 监听 #bg-select 选项变化，同步到 bg-popup
const bgSelect = document.getElementById('bg-select');
const bgPopup  = document.getElementById('bg-popup');

function syncBgPanel() {
  bgPopup.innerHTML = '';
  for (const child of bgSelect.children) {
    if (child.tagName === 'OPTGROUP') {
      const label = document.createElement('div');
      label.className = 'panel-group-label';
      label.textContent = child.label;
      bgPopup.appendChild(label);
      for (const opt of child.children) {
        const item = document.createElement('div');
        item.className = 'panel-item';
        item.dataset.value = opt.value;
        item.textContent = opt.textContent;
        bgPopup.appendChild(item);
      }
    } else if (child.tagName === 'OPTION') {
      const item = document.createElement('div');
      item.className = 'panel-item';
      item.dataset.value = child.value;
      item.textContent = child.textContent;
      bgPopup.appendChild(item);
    }
  }
  updateBgLabel();
}

const bgObserver = new MutationObserver(syncBgPanel);
bgObserver.observe(bgSelect, { childList: true, subtree: true });
```

### 面板交互逻辑

```js
// 通用：点击面板外部关闭
document.addEventListener('click', (e) => {
  if (!e.target.closest('#bg-panel-wrap'))   document.getElementById('bg-popup').hidden   = true;
  if (!e.target.closest('#style-panel-wrap')) document.getElementById('style-popup').hidden = true;
});

// 背景按钮 toggle
document.getElementById('bg-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const p = document.getElementById('bg-popup');
  p.hidden = !p.hidden;
  document.getElementById('style-popup').hidden = true;
});

// 背景面板选项选中
document.getElementById('bg-popup').addEventListener('click', (e) => {
  const item = e.target.closest('.panel-item');
  if (!item) return;
  const val = item.dataset.value;
  bgSelect.value = val;
  bgSelect.dispatchEvent(new Event('change'));
  updateBgLabel();
  document.getElementById('bg-popup').hidden = true;
});

function updateBgLabel() {
  const opt = bgSelect.options[bgSelect.selectedIndex];
  document.getElementById('bg-label').textContent = opt ? opt.textContent : '无背景';
}

// 风格按钮 toggle
document.getElementById('style-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const p = document.getElementById('style-popup');
  p.hidden = !p.hidden;
  document.getElementById('bg-popup').hidden = true;
});

// 风格面板选项选中
document.getElementById('style-popup').addEventListener('click', (e) => {
  const item = e.target.closest('.panel-item');
  if (!item) return;
  const styleSelect = document.getElementById('style-select');
  styleSelect.value = item.dataset.value;
  styleSelect.dispatchEvent(new Event('change'));
  document.getElementById('style-label').textContent = item.textContent;
  document.getElementById('style-popup').hidden = true;
});
```

### localStorage 恢复时同步按钮文字

`background.js` 的 `loadBgList()` 在恢复背景后会设置 `select.value`，但不会触发 `change` 事件中对按钮的更新。需要在 `loadBgList` 完成后（通过 `MutationObserver` 的 `syncBgPanel` 调用 `updateBgLabel()`）自动同步。风格的 localStorage 恢复由 `main.js` 处理，需在 DOM 加载时读取并同步 `#style-label`。

### CSS 新增样式

在 `main.css` 中追加：

```css
/* ── 面板按钮 & 弹出面板 ──────────────────────────── */
.panel-wrap { position: relative; }

.panel-btn {
  background: var(--card-bg);
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
}
.panel-btn:hover { color: var(--text); border-color: var(--accent); }

.panel-popup {
  position: absolute;
  right: 0; top: calc(100% + 6px);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.4rem 0;
  min-width: 140px;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.panel-group-label {
  font-size: 0.7rem;
  color: var(--muted);
  padding: 0.3rem 0.75rem 0.1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-item {
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s;
}
.panel-item:hover { background: var(--hover-bg); }
.panel-item.active { color: var(--accent); }
```

---

## 实现顺序

1. 修复 `settings.js`（Bug 1，高优先级）
2. 实现 UI 面板重设计（`index.html` + `main.css`）
3. Bug 2 留待后续任务处理
