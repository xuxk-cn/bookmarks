// License 管理模块 (Paddle)
// 负责：激活弹窗、Paddle Checkout、已购项目检查、功能锁定
(function() {
  'use strict';

  // ── 免费范围配置 ──
  const FREE_STYLE_MAX = 10;
  const FREE_BG_MAX = 20;

  // ── Paddle 配置（创建产品后填入） ──
  // Paddle.js Client Token（前端使用）
  const PADDLE_CLIENT_TOKEN = 'test_c16f8e85ed08daa6add4046924f';
  // 产品 Price ID（Paddle 后台获取）
  const PRICE_IDS = {
    // 风格
    'style:11': 'pri_01m1wsybd5v9h5shryd1pcmq6r',
    // 背景
    'background:a21': 'pri_01m1wsyc0wq2axhrjn8m0e2rkp',
    'background:a22': 'pri_01m1wsycn05r6yqdeq9hjn336w',
    'background:a23': 'pri_01m1wsyd8apgsn81rf21zese3a',
    'background:a24': 'pri_01m1wsydvg73v94y2ytjht26ch',
    'background:a25': 'pri_01m1wsyezye4x72ahcer0wxrt4',
    'background:a26': 'pri_01m1wsyfkmbvnnmwc8xqm6dhjy',
    'background:a27': 'pri_01m1wsygrywkcecbrepav2j1q0',
    'background:a28': 'pri_01m1wsyhckj6n4m3aps9esh4bc',
    'background:a29': 'pri_01m1wsyhzvw82v4gmgmke8gs1v',
    'background:a30': 'pri_01m1wsyjk5bf2fgb7dzdkvtrbd',
    'background:a31': 'pri_01m1wsyk6a5rxver0evaxr9dnt',
    'background:a32': 'pri_01m1wsyksbx8whhs1zdzrmwzg5',
    'background:a33': 'pri_01m1wsymd1svt8699nw7kh2j5b',
    'background:a34': 'pri_01m1wsyn283tf623xk301xd5jg',
    'background:a35': 'pri_01m1wsynpz3axh9mx6gdyj218a',
    'background:a36': 'pri_01m1wsypag90mrj1f22v3jkp09',
    'background:a37': 'pri_01m1wsypzjkcpqztst8trrnv4x',
    'background:a38': 'pri_01m1wsyqmmk7jhsgjgdjhfjmjy',
    'background:a39': 'pri_01m1wsys2hbqsrh16s7ec0vhkp',
    'background:a40': 'pri_01m1wsysp1310tw3sbtx87qy10',
    'background:a41': 'pri_01m1wsyt9me1abzhyvn4wf4atg',
    'background:a42': 'pri_01m1wsytwvwe3af924py5a0t8q',
    'background:a43': 'pri_01m1wsyvg1rf96x9qhgjays0b4',
    'background:a44': 'pri_01m1wsyw3gv8w3w0kga4f927cc',
    'background:a45': 'pri_01m1wsywpscmwccx8f0a208bq3',
    'background:a46': 'pri_01m1wsyxh00n3zqs7b6ah0673b',
    'background:a47': 'pri_01m1wsyy4g00gjbw2fmg3vcmvq',
  };

  // ── 已激活的项目 ──
  let activatedItems = { styles: [], backgrounds: [] };

  // ── Paddle.js 是否已加载 ──
  let paddleLoaded = false;

  // ── 初始化 ──
  async function initLicense() {
    // 从 localStorage 读取缓存
    const cached = localStorage.getItem('nav_license');
    if (cached) {
      try {
        activatedItems = JSON.parse(cached);
      } catch {}
    }

    // 加载 Paddle.js
    loadPaddleJS();

    // 向服务器验证
    await checkActivated();
  }

  // ── 加载 Paddle.js ──
  function loadPaddleJS() {
    if (paddleLoaded) return;

    if (window.Paddle) {
      initPaddle();
      return;
    }

    fetch('/js/paddle.js')
      .then(r => r.text())
      .then(code => {
        (0, eval)(code);
        if (window.Paddle) {
          initPaddle();
        } else {
          console.error('Paddle.js eval succeeded but window.Paddle still undefined');
        }
      })
      .catch(e => console.error('Failed to load paddle.js:', e));
  }

  function initPaddle() {
    try {
      window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      paddleLoaded = true;
      console.log('Paddle.js initialized (sandbox)');
    } catch (e) {
      console.error('Paddle Initialize failed:', e);
    }
  }

  // ── 检查已激活的 License ──
  async function checkActivated() {
    try {
      const res = await fetch('/api/license/check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.purchased) {
          activatedItems = { styles: [], backgrounds: [] };
          for (const p of data.purchased) {
            if (p.type === 'style') activatedItems.styles.push(p.id);
            if (p.type === 'background') activatedItems.backgrounds.push(p.id);
          }
          localStorage.setItem('nav_license', JSON.stringify(activatedItems));
        }
      }
    } catch (e) {
      console.warn('License check failed:', e);
    }
  }

  // ── 检查某个项目是否已激活 ──
  function isActivated(type, id) {
    if (type === 'style') {
      const n = parseInt(id, 10);
      if (n <= FREE_STYLE_MAX) return true;
      return activatedItems.styles.includes(String(n));
    }
    if (type === 'background') {
      // rain.html 免费
      if (id === 'rain.html') return true;
      const m = id.match(/\d+/);
      const n = m ? parseInt(m[0], 10) : 0;
      if (n <= FREE_BG_MAX) return true;
      const cleanId = id.replace(/\.html$/, '');
      return activatedItems.backgrounds.includes(cleanId) || activatedItems.backgrounds.includes(id);
    }
    return false;
  }

  // ── 打开 Paddle Checkout ──
  function openPaddleCheckout(type, id) {
    console.log('openPaddleCheckout called:', type, id);
    console.log('paddleLoaded:', paddleLoaded, 'Paddle:', !!window.Paddle);

    if (!paddleLoaded || !window.Paddle) {
      alert('支付系统加载中，请稍后重试');
      loadPaddleJS();
      return;
    }

    // 去掉 .html 后缀以匹配 PRICE_IDS
    const cleanId = id.replace(/\.html$/, '');
    const priceKey = `${type}:${cleanId}`;
    const priceId = PRICE_IDS[priceKey];
    console.log('priceKey:', priceKey, 'priceId:', priceId);

    if (!priceId) {
      alert('产品配置错误，请联系管理员');
      return;
    }

    console.log('Opening Paddle Checkout...');

    // 打开 Paddle Overlay Checkout
    window.Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      customData: {
        site_key: window.location.hostname,
        item_type: type,
        item_id: cleanId,
      },
      success: function(data) {
        console.log('Paddle checkout success:', data);
        // 自动应用购买的项目
        if (type === 'background') {
          var bgFile = cleanId + '.html';
          localStorage.setItem('bgChoice', bgFile);
          if (window.__setBg) window.__setBg(bgFile, true);
        } else if (type === 'style') {
          var cssFile = 'styles' + cleanId.padStart(2, '0') + '.css';
          localStorage.setItem('styleCSS', cssFile);
          if (window.__applyStyleCSS) window.__applyStyleCSS(cssFile);
        }
        setTimeout(() => {
          checkActivated().then(() => {
            window.location.reload();
          });
        }, 2000);
      },
      close: function() {
        console.log('Paddle checkout closed');
      },
    });
  }

  // ── 显示购买弹窗 ──
  function showPurchaseDialog(type, id) {
    const dialog = document.createElement('div');
    dialog.className = 'license-dialog-overlay';
    dialog.innerHTML = `
      <div class="license-dialog">
        <button class="license-dialog-close" onclick="this.closest('.license-dialog-overlay').remove()">✕</button>
        <div class="license-dialog-icon">🔒</div>
        <h3>付费${type === 'style' ? '风格' : '背景'}</h3>
        <p>此${type === 'style' ? '风格' : '背景'}需要购买后使用</p>
        <p class="license-price">$0.99</p>
        <div class="license-dialog-actions">
          <button class="license-btn-buy" id="license-buy-btn">
            立即购买
          </button>
          <button class="license-btn-activate" onclick="window.__licenseActivate()">
            已有激活码？
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) dialog.remove();
    });

    // 绑定购买按钮
    document.getElementById('license-buy-btn').addEventListener('click', function() {
      dialog.remove();
      openPaddleCheckout(type, id);
    });
  }

  // ── 显示激活弹窗 ──
  function showActivateDialog() {
    // 移除已有的购买弹窗
    const existing = document.querySelector('.license-dialog-overlay');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.className = 'license-dialog-overlay';
    dialog.innerHTML = `
      <div class="license-dialog">
        <button class="license-dialog-close" onclick="this.closest('.license-dialog-overlay').remove()">✕</button>
        <div class="license-dialog-icon">🔑</div>
        <h3>激活 License</h3>
        <p>输入你收到的激活码</p>
        <div class="license-input-group">
          <input type="text" id="license-key-input" placeholder="XXXX-XXXX-XXXX-XXXX" class="license-input">
        </div>
        <div class="license-msg" id="license-msg"></div>
        <div class="license-dialog-actions">
          <button class="license-btn-activate" id="license-activate-btn">
            激活
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) dialog.remove();
    });

    const input = document.getElementById('license-key-input');
    const btn = document.getElementById('license-activate-btn');
    const msg = document.getElementById('license-msg');

    btn.addEventListener('click', async () => {
      const key = input.value.trim();
      if (!key) {
        msg.textContent = '请输入激活码';
        msg.className = 'license-msg license-msg-error';
        return;
      }

      btn.disabled = true;
      btn.textContent = '验证中...';
      msg.textContent = '';

      try {
        const res = await fetch('/api/license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key }),
        });
        const data = await res.json();

        if (data.valid) {
          msg.textContent = '激活成功！';
          msg.className = 'license-msg license-msg-success';

          // 添加到已购列表
          for (const p of (data.purchased || [])) {
            if (p.type === 'style' && !activatedItems.styles.includes(p.id)) {
              activatedItems.styles.push(p.id);
            }
            if (p.type === 'background' && !activatedItems.backgrounds.includes(p.id)) {
              activatedItems.backgrounds.push(p.id);
            }
          }
          localStorage.setItem('nav_license', JSON.stringify(activatedItems));

          setTimeout(() => {
            dialog.remove();
            window.location.reload();
          }, 1500);
        } else {
          msg.textContent = data.error || '激活码无效';
          msg.className = 'license-msg license-msg-error';
        }
      } catch (e) {
        msg.textContent = '网络错误，请重试';
        msg.className = 'license-msg license-msg-error';
      }

      btn.disabled = false;
      btn.textContent = '激活';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }

  // ── 暴露全局方法 ──
  window.__licenseActivate = showActivateDialog;
  window.__licenseCheck = isActivated;
  window.__licenseShowPurchase = showPurchaseDialog;

  // ── 启动 ──
  initLicense();
})();
