// ── 主逻辑模块 ────────────────────────────────────────
import { search, highlight, escHtml } from '/js/search.js';

// ── 数据 ──────────────────────────────────────────────
const navData     = JSON.parse(document.getElementById('nav-data').textContent);
const navSettings = JSON.parse(document.getElementById('nav-settings').textContent);
const categories  = navData.categories || [];

// 打平所有书签，附带板块名（供跨分类搜索）
const allItems = [];
categories.forEach(cat => {
  cat.items.forEach(item => allItems.push({ ...item, catTitle: cat.title }));
});

// ── DOM 引用 ──────────────────────────────────────────
const navbar     = document.getElementById('navbar');
const main       = document.getElementById('main');
const searchInput = document.getElementById('search');
const searchClear = document.getElementById('search-clear');
const searchInfo  = document.getElementById('search-info');
const tooltip     = document.getElementById('tooltip');
const ttUrl       = document.getElementById('tt-url');
const ttDesc      = document.getElementById('tt-desc');

// ── 状态 ──────────────────────────────────────────────
let currentCat  = categories[0]?.title || null;
let cardStyle   = parseInt(localStorage.getItem('cardStyle') || navSettings.defaultStyle || '1');
let searchTimer = null;

// ── 设置按钮（导航栏第一个） ──────────────────────────
(function() {
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '设置';
  settingsBtn.id = 'nav-settings-btn';
  settingsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const popup = document.getElementById('settings-popup');
    if (popup) popup.hidden = !popup.hidden;
  });
  navbar.insertBefore(settingsBtn, navbar.firstChild);
})();

// ── 初始化导航栏 ──────────────────────────────────────
categories.forEach((cat, i) => {
  const btn = document.createElement('button');
  btn.textContent = cat.title;
  btn.onclick = () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    searchInfo.textContent = '';
    navbar.style.opacity = '1';
    navbar.style.pointerEvents = '';
    currentCat = cat.title;
    document.querySelectorAll('.navbar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCategory();
  };
  if (i === 0) btn.classList.add('active');
  navbar.appendChild(btn);
});

// ── 卡片工厂 ──────────────────────────────────────────
function iconTag(item, size) {
  const icons = window.__NAV_ICONS__ || {};
  const src   = icons[item.url] || item.icon || '';
  if (src) {
    const img = document.createElement('img');
    img.className = `card-icon`;
    img.src = src;
    img.alt = '';
    img.onerror = () => { img.replaceWith(placeholder()); };
    img.style.width = img.style.height = size + 'px';
    return img;
  }
  return placeholder(size);
}

function placeholder(size = 56) {
  const d = document.createElement('div');
  d.className = 'card-icon-placeholder';
  d.style.width = d.style.height = size + 'px';
  d.textContent = '🔗';
  return d;
}

function makeCard(item, words = [], showCat = false) {
  const card = document.createElement('div');
  card.className = 'card';
  card.onclick = () => window.open(item.url, '_blank');

  card.addEventListener('mouseenter', (e) => {
    ttUrl.textContent  = item.url;
    ttDesc.textContent = item.hover || '';
    ttDesc.style.display = item.hover ? '' : 'none';
    tooltip.style.display = 'block';
    posTooltip(e);
  });
  card.addEventListener('mousemove', posTooltip);
  card.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

  if (cardStyle === 1) {
    if (showCat) {
      const badge = document.createElement('div');
      badge.className = 'card-cat-badge';
      badge.textContent = item.catTitle || '';
      card.appendChild(badge);
    }
    card.appendChild(iconTag(item, 56));
    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = highlight(item.title, words);
    card.appendChild(title);
  } else if (cardStyle === 2) {
    card.appendChild(iconTag(item, 40));
    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = highlight(item.title, words);
    body.appendChild(title);
    if (item.hover) {
      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = item.hover;
      body.appendChild(desc);
    }
    if (showCat) {
      const badge = document.createElement('div');
      badge.className = 'card-cat-badge';
      badge.textContent = item.catTitle || '';
      body.insertBefore(badge, body.firstChild);
    }
    card.appendChild(body);
  } else if (cardStyle === 3) {
    if (showCat) {
      const badge = document.createElement('div');
      badge.className = 'card-cat-badge';
      badge.textContent = item.catTitle || '';
      card.appendChild(badge);
    }
    card.appendChild(iconTag(item, 64));
    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = highlight(item.title, words);
    card.appendChild(title);
  }

  return card;
}

// ── 渲染：板块模式 ────────────────────────────────────
function renderCategory() {
  navbar.style.opacity = '1';
  navbar.style.pointerEvents = '';
  main.className = `container cards-style${cardStyle}`;
  main.innerHTML = '';

  const cat = categories.find(c => c.title === currentCat);
  if (!cat) return;
  cat.items.forEach(item => main.appendChild(makeCard(item)));
}

// ── 渲染：搜索模式 ────────────────────────────────────
function renderSearch(query) {
  navbar.style.opacity = '0.3';
  navbar.style.pointerEvents = 'none';
  main.className = `container cards-style${cardStyle}`;
  main.innerHTML = '';

  const words  = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const scored = search(query, allItems);

  if (!scored.length) {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.textContent = '未找到匹配书签';
    main.appendChild(el);
    searchInfo.textContent = '无结果';
    return;
  }

  searchInfo.textContent = `找到 ${scored.length} 条`;
  scored.forEach(({ item }) => main.appendChild(makeCard(item, words, true)));
}

// ── Tooltip 定位 ──────────────────────────────────────
function posTooltip(e) {
  const x = e.clientX + 14, y = e.clientY + 14;
  tooltip.style.left = (x + tooltip.offsetWidth  > window.innerWidth  ? e.clientX - tooltip.offsetWidth  - 14 : x) + 'px';
  tooltip.style.top  = (y + tooltip.offsetHeight > window.innerHeight ? e.clientY - tooltip.offsetHeight - 14 : y) + 'px';
}

// ── 搜索监听 ──────────────────────────────────────────
searchInput.addEventListener('input', (e) => {
  const q = e.target.value;
  searchClear.style.display = q ? 'block' : 'none';
  clearTimeout(searchTimer);
  if (!q.trim()) {
    searchInfo.textContent = '';
    navbar.style.opacity = '1';
    navbar.style.pointerEvents = '';
    renderCategory();
    return;
  }
  searchTimer = setTimeout(() => renderSearch(q), 200);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  searchInfo.textContent = '';
  navbar.style.opacity = '1';
  navbar.style.pointerEvents = '';
  renderCategory();
});

// ── 初始渲染 ──────────────────────────────────────────
renderCategory();
