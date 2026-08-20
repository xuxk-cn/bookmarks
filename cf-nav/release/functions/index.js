// 首页 SSR 入口
import { getData, getSettings, getHomeCache, putHomeCache } from './lib/kv.js';
import { renderHome } from './lib/renderer.js';

let cachedTemplate = null;

export async function onRequestGet({ request, env }) {
  const styleChoice = getCookie(request, 'styleChoice');

  // 如果有特殊的风格选择，不使用默认的主页缓存，直接实时渲染对应的风格模板
  if (styleChoice && styleChoice !== 'none') {
    const htmlFile = `styles${styleChoice}.html`;
    const [navData, settings, templateRes] = await Promise.all([
      getData(env),
      getSettings(env),
      env.ASSETS.fetch(new Request(`https://placeholder/backgrounds/${htmlFile}`)),
    ]);

    if (templateRes.ok) {
      const navDataJson = JSON.stringify(navData).replace(/<\/script>/gi, '<\\/script>');
      let htmlText = await templateRes.text();
      htmlText = htmlText.replace(/\{\{NAV_DATA\}\}/g, navDataJson);
      htmlText = htmlText.replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName || '导航'));
      htmlText = htmlText.replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc || ''));

      // 1. 注入 CSS 穿透和统一的重置背景色逻辑，确保 Canvas 能透出来
      const bgStyles = `
      <style>
        body, .app, .main, .content { background: transparent !important; }
      </style>
      `;
      htmlText = htmlText.replace(/<\/head>/i, bgStyles + '</head>');

      // 2. 注入背景需要的 Canvas 容器 DOM
      const bgDoms = `
      <!-- 背景层 -->
      <canvas id="bg-canvas" style="position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
      <div id="bg-image" style="position:fixed;inset:0;width:100%;height:100%;z-index:-2;background-size:cover;background-position:center;pointer-events:none;"></div>
      <select id="bg-select" style="display:none"><option value="none">无背景</option></select>
      `;
      htmlText = htmlText.replace(/<body[^>]*>/i, (m) => m + '\n' + bgDoms);

      // 3. 注入偏好设置弹窗和通用配置逻辑，以及引入 /js/background.js
      const injectScript = `
      <script>
      (function() {
        // 动态注入设置按钮
        var btn = document.createElement('button');
        btn.textContent = '⚙ 设置';
        btn.style.cssText = 'position:fixed;top:12px;right:68px;z-index:9999;background:rgba(255,255,255,0.92);color:#1e293b;border:1px solid rgba(15,23,42,0.15);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1);font-family:sans-serif;';
        btn.onclick = function(e) {
          e.stopPropagation();
          var p = document.getElementById('settings-popup-ssr');
          if (p) p.hidden = !p.hidden;
        };
        document.body.appendChild(btn);

        // 动态注入设置弹窗
        var modal = document.createElement('div');
        modal.id = 'settings-popup-ssr';
        modal.hidden = true;
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
        modal.onclick = function(e) { if(e.target === this) this.hidden = true; };
        
        modal.innerHTML = \`
          <div style="background:#fff;color:#1e293b;width:340px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(15,23,42,0.08);font-weight:700;font-size:15px;">
              <span>偏好设置</span>
              <button style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;padding:0;" onclick="document.getElementById('settings-popup-ssr').hidden=true">✕</button>
            </div>
            <div style="padding:20px;">
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">悬停音效</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:#64748b;">开启悬停音效</span>
                  <input type="checkbox" id="sound-toggle-ssr" style="width:18px;height:18px;cursor:pointer;accent-color:#0f766e;">
                </div>
              </div>
              <div style="border-top:1px dashed rgba(15,23,42,0.08);margin:14px 0;"></div>
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">动态背景</div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <select id="settings-bg-select-ssr" style="flex:1;height:36px;border:1px solid rgba(15,23,42,0.15);border-radius:8px;padding:0 8px;font-size:13px;outline:none;background:#fff;color:#1e293b;">
                    <option value="none">无背景</option>
                  </select>
                  <button style="height:36px;padding:0 12px;background:#f1f5f9;border:1px solid rgba(15,23,42,0.1);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#475569;" onclick="window.open('/bg-preview.html','bg_preview')">预览</button>
                </div>
              </div>
              <div style="border-top:1px dashed rgba(15,23,42,0.08);margin:14px 0;"></div>
              <div style="margin-bottom:16px;">
                <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#334155;">导航风格</div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                  <select id="style-select-ssr" style="flex:1;height:36px;border:1px solid rgba(15,23,42,0.15);border-radius:8px;padding:0 8px;font-size:13px;outline:none;background:#fff;color:#1e293b;">
                    <option value="none">默认风格</option>
                  </select>
                  <button style="height:36px;padding:0 12px;background:#f1f5f9;border:1px solid rgba(15,23,42,0.1);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#475569;" onclick="window.open('/style-preview.html','style_preview')">预览</button>
                </div>
              </div>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);

        // 绑定音效逻辑
        var soundToggle = document.getElementById('sound-toggle-ssr');
        soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
        soundToggle.addEventListener('change', function() {
          localStorage.setItem('soundEnabled', this.checked);
          var orig = document.getElementById('soundToggle');
          if (orig) orig.checked = this.checked;
        });

        // 加载下拉框列表数据
        (async function() {
          try {
            var res = await fetch('/api/backgrounds');
            var data = await res.json();
            
            // 填充背景
            var bgSel = document.getElementById('settings-bg-select-ssr');
            [['rain','🌧 下雨'],['snow','❄️ 下雪'],['forest','🌿 落叶']].forEach(function(item) {
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

            // 填充风格
            var styleSel = document.getElementById('style-select-ssr');
            (data.styles || []).forEach(function(item) {
              var opt = document.createElement('option');
              var m = item.file.match(/styles(\d+)\.html/);
              if (!m) return;
              opt.value = m[1]; opt.textContent = item.name || ('风格 ' + m[1]);
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
      </script>
      <script type="module" src="/js/background.js"></script>
      `;
      htmlText = htmlText.replace(/<\/body>/i, injectScript + '</body>');

      return html(htmlText);
    }
  }

  // 尝试读 KV 缓存
  const cached = await getHomeCache(env);
  if (cached) return html(cached);

  // 并行读取数据和模板
  const [navData, settings, templateHtml] = await Promise.all([
    getData(env),
    getSettings(env),
    getTemplate(env),
  ]);

  const rendered = renderHome(templateHtml, navData, settings);

  // 异步写缓存，不阻塞响应
  env.ctx?.waitUntil(putHomeCache(env, rendered));

  return html(rendered);
}

async function getTemplate(env) {
  if (cachedTemplate) return cachedTemplate;
  const res = await env.ASSETS.fetch('https://placeholder/index.html');
  cachedTemplate = await res.text();
  return cachedTemplate;
}

function html(body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';');
  for (let cookie of cookies) {
    const [k, v] = cookie.trim().split('=');
    if (k === name) return v;
  }
  return null;
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
