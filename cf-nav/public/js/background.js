// ── 背景切换模块 ──────────────────────────────────────
// HTML 背景：iframe 全屏嵌入（自动读取 /api/backgrounds）
// Canvas2D 背景：rain/snow/forest（JS 模块）

const canvas  = document.getElementById('bg-canvas');
const bgImage = document.getElementById('bg-image');
const select  = document.getElementById('bg-select');

// Canvas2D 背景（JS 模块，不走 iframe）
const CANVAS_BG = {
  rain:   () => import('/backgrounds/rain.js'),
  snow:   () => import('/backgrounds/snow.js'),
  forest: () => import('/backgrounds/forest.js'),
};

let currentModule = null;
let currentName   = 'none';

// 创建 iframe 层
function getIframeLayer() {
  let el = document.getElementById('bg-iframe');
  if (!el) {
    el = document.createElement('iframe');
    el.id = 'bg-iframe';
    el.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:none;z-index:0;pointer-events:none;display:none;';
    document.body.insertBefore(el, document.body.firstChild);
  }
  return el;
}

// 动态加载背景列表，填充下拉菜单
async function loadBgList() {
  try {
    const res  = await fetch('/api/backgrounds');
    const data = await res.json();
    const list = data.backgrounds || [];

    // Canvas 背景固定在最前
    const canvasGroup = document.createElement('optgroup');
    canvasGroup.label = 'Canvas 动画';
    [['rain','🌧 下雨'],['snow','❄️ 下雪'],['forest','🌿 落叶']].forEach(([v,t]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      canvasGroup.appendChild(o);
    });
    select.appendChild(canvasGroup);

    if (list.length) {
      const shaderGroup = document.createElement('optgroup');
      shaderGroup.label = 'Shader 特效';
      list.forEach(({ file, name }) => {
        const o = document.createElement('option');
        o.value = file;           // 用文件名作为 value
        o.textContent = name;
        shaderGroup.appendChild(o);
      });
      select.appendChild(shaderGroup);
    }
  } catch(e) {
    console.warn('背景列表加载失败，使用默认列表', e);
    // fallback：仅 Canvas 背景
    [['rain','🌧 下雨'],['snow','❄️ 下雪'],['forest','🌿 落叶']].forEach(([v,t]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      select.appendChild(o);
    });
  }

  // 恢复上次选择（首次访问默认无背景）
  const saved = localStorage.getItem('bgChoice') !== null ? localStorage.getItem('bgChoice') : 'a4.html';
  select.value = saved;
  switchBg(saved);
}

async function switchBg(name) {
  if (name === currentName) return;

  if (currentModule?.stop) {
    try { currentModule.stop(); } catch(e) {}
    currentModule = null;
  }

  const iframe = getIframeLayer();
  iframe.style.display = 'none';
  iframe.src = '';
  canvas.style.display = 'none';
  bgImage.style.backgroundImage = '';
  bgImage.classList.remove('active');

  currentName = name;
  if (!name || name === 'none') return;

  // HTML 文件（以 .html 结尾）→ iframe
  if (name.endsWith('.html')) {
    iframe.src = `/backgrounds/${name}`;
    iframe.style.display = 'block';
    localStorage.setItem('bgChoice', name);
    return;
  }

  // Canvas2D 背景
  if (CANVAS_BG[name]) {
    canvas.style.display = 'block';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    try {
      const mod = await CANVAS_BG[name]();
      currentModule = mod;
      mod.start(canvas);
      localStorage.setItem('bgChoice', name);
    } catch(e) {
      console.warn(`背景 ${name} 加载失败:`, e);
    }
  }
}

window.addEventListener('resize', () => {
  if (canvas.style.display !== 'none') {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

select.addEventListener('change', () => switchBg(select.value));

// 初始化：加载列表后自动恢复上次背景
loadBgList();

// ── 对外接口 ──────────────────────────────────────────
export function setBackground(name) { select.value = name; switchBg(name); }
export function setImageBackground(url) {
  if (currentModule?.stop) try { currentModule.stop(); } catch(e) {}
  currentModule = null; currentName = 'image';
  canvas.style.display = 'none';
  getIframeLayer().style.display = 'none';
  bgImage.style.backgroundImage = `url(${url})`;
  bgImage.classList.add('active');
}
window.__setBg = setBackground;

// 同源 localStorage 共享：在 /backgrounds/a1 调参后，已打开的主页 iframe 实时刷新
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('bgParams:')) return;
  if (!currentName || !currentName.endsWith('.html')) return;
  if (e.key !== 'bgParams:' + currentName) return;
  const f = getIframeLayer();
  if (f && f.style.display !== 'none') {
    try { f.contentWindow.location.reload(); } catch (_) { f.src = f.src; }
  }
});

// 将 Alt+ 组合键转发给背景 iframe：背景层 pointer-events:none 且无法获得键盘焦点，
// 按键事件会跑到父页面，导致 a2.html 等的 Alt+H 设置面板在作为背景时打不开。
// 转发后（输入态除外），这些自带快捷键在背景中也能正常使用。
window.addEventListener('keydown', (e) => {
  if (!e.altKey) return;                                  // 仅转发 Alt 组合键
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return; // 输入时不转发
  const f = getIframeLayer();
  if (!f || f.style.display === 'none' || !f.contentWindow || !f.contentWindow.document) return;
  if (!currentName || !currentName.endsWith('.html')) return;
  try {
    const ev = new f.contentWindow.KeyboardEvent('keydown', {
      key: e.key, code: e.code,
      altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey,
      keyCode: e.keyCode || e.which || 0, which: e.keyCode || e.which || 0,
      bubbles: true, cancelable: true,
    });
    f.contentWindow.document.dispatchEvent(ev);
  } catch (_) {}
});
