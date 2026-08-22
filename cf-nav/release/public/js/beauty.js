// ============================================================
// 站点美化模块（独立 ES Module，任何错误都被隔离，不影响主程序）
// 读取 SSR 注入的 #nav-beauty 配置，逐项应用动效
// ============================================================
(function () {
  'use strict';
  try {
    const raw = document.getElementById('nav-beauty')?.textContent || '{}';
    const cfg = JSON.parse(raw || '{}');

    const on = (k) => cfg[k] === true;
    const body = document.body;

    // ── 主题 ──────────────────────────────────────────
    try {
      let theme = cfg.theme || 'dark';
      if (theme === 'system') {
        theme = matchMedia('(prefers-color-scheme: light)').matches ? 'minimal' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}

    // ── 开关类 ────────────────────────────────────────
    if (on('glass'))     body.classList.add('b-glass');
    if (on('hoverFx'))   body.classList.add('b-hover');
    if (on('tilt'))      body.classList.add('b-tilt');
    if (on('waterfall')) body.classList.add('b-waterfall');
    if (on('searchFx'))  body.classList.add('b-search');
    if (on('shared'))    body.classList.add('b-shared');

    // ── 3D 倾斜（事件委托，兼容动态重渲染） ───────────
    if (on('tilt')) {
      const main = document.getElementById('main');
      let last = null;
      const reset = (card) => { if (card) { card.style.transform = ''; card.style.boxShadow = ''; } };
      main?.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.card');
        if (!card || card === last) return;
        reset(last); last = card;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(8px)`;
        card.style.boxShadow = `${-px * 14}px ${py * 14}px 26px rgba(0,0,0,0.35)`;
      });
      main?.addEventListener('mouseleave', () => { reset(last); last = null; });
    }

    // ── 瀑布流错落淡入（为新卡片设置递增 delay） ───────
    if (on('waterfall')) {
      const apply = (root) => {
        const cards = root.querySelectorAll('.card');
        cards.forEach((c, i) => { c.style.animationDelay = (i * 0.05) + 's'; });
      };
      const main = document.getElementById('main');
      apply(main);
      if (main && 'MutationObserver' in window) {
        new MutationObserver(() => apply(main)).observe(main, { childList: true });
      }
    }

    // ── 共享元素过渡（点击卡片放大） ───────────────────
    if (on('shared')) {
      const main = document.getElementById('main');
      main?.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;
        card.classList.add('beauty-shared');
        setTimeout(() => card.classList.remove('beauty-shared'), 360);
      });
    }

    // ── 动态欢迎语 + 天气联动 ─────────────────────────
    if (on('welcome')) {
      const el = document.getElementById('welcome');
      const h = new Date().getHours();
      const greet = h < 5  ? '夜深了，注意休息 🌙'
                  : h < 11 ? '早安，新的一天开始了 ☀️'
                  : h < 13 ? '中午好，记得按时吃饭 🍱'
                  : h < 18 ? '下午好，喝杯咖啡提提神 ☕'
                  : h < 23 ? '晚上好，放松一下吧 🌆'
                  : '夜深了，注意休息 🌙';
      el.innerHTML = '<span class="w-em">' + greet + '</span>';
      el.hidden = false;

      if (on('weather')) {
        loadWeather().then((w) => {
          if (!w) return;
          const span = document.createElement('span');
          span.className = 'w-weather';
          span.textContent = `${w.icon} ${w.temp}°C ${w.desc}`;
          el.appendChild(span);
        }).catch(() => {});
      }
    }

    async function loadWeather() {
      const ip = await fetch('https://ipapi.co/json/').then((r) => r.json());
      if (ip == null || ip.latitude == null) return null;
      const w = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${ip.latitude}&longitude=${ip.longitude}&current_weather=true`
      ).then((r) => r.json());
      const cw = w.current_weather;
      if (!cw) return null;
      return { temp: Math.round(cw.temperature), icon: weatherIcon(cw.weathercode), desc: weatherText(cw.weathercode) };
    }

    function weatherIcon(code) {
      if (code == null) return '🌡';
      if (code === 0) return '☀️';
      if (code <= 3) return '⛅️';
      if (code <= 48) return '🌫';
      if (code <= 67) return '🌧';
      if (code <= 77) return '❄️';
      if (code <= 82) return '🌦';
      return '⛈';
    }
    function weatherText(code) {
      if (code == null) return '';
      if (code === 0) return '晴朗';
      if (code <= 3) return '多云';
      if (code <= 48) return '有雾';
      if (code <= 67) return '降雨';
      if (code <= 77) return '降雪';
      if (code <= 82) return '阵雨';
      return '雷暴';
    }
  } catch (e) {
    // 美化模块出错：静默降级，主程序不受影响
    console.warn('[beauty] 模块加载失败，已跳过：', e);
  }
})();
