/**
 * Hover Description 抓取模块
 * 可在 admin/index.html 中通过 <script type="module" src="/js/hover-module.js"></script> 引入
 * 提供：batchHoverSelected, fetchAllHovers, batchHoverCategory
 */

// 批量抓取选中书签的悬停介绍
export async function batchHoverSelected() {
  const checked = [...document.querySelectorAll('#bm-tbody input[type=checkbox]:checked')];
  if (!checked.length) return toast('请先选择书签', 'err');
  const urls = checked.map(c => {
    const ci = parseInt(c.dataset.ci), ii = parseInt(c.dataset.ii);
    return allData.categories[ci]?.items[ii]?.url;
  }).filter(Boolean);
  await fetchHoversChunked(urls, '抓取悬停');
}

// 批量抓取当前分类的悬停介绍
export async function batchHoverCategory(catIndex) {
  const cat = allData.categories[catIndex];
  if (!cat) return toast('分类不存在', 'err');
  const urls = cat.items
    .filter(it => !it.hover || !it.hover.trim())
    .map(it => it.url);
  if (!urls.length) return toast('该分类无需抓取悬停介绍', 'err');
  await fetchHoversChunked(urls, `抓取分类悬停`);
}

// 批量抓取全部空悬停介绍
export async function fetchAllHovers() {
  if (!confirm('将抓取所有空悬停介绍的书签，可能需要较长时间，确定吗？')) return;
  const urls = [];
  allData.categories.forEach(c => c.items.forEach(it => { if (!it.hover || !it.hover.trim()) urls.push(it.url); }));
  await fetchHoversChunked(urls, '批量抓取悬停');
}

// 核心抓取逻辑
async function fetchHoversChunked(urls, label) {
  if (!urls.length) return toast('没有需要抓取的悬停介绍', 'err');
  const chunkSize = 5; // hover 抓取较慢，并发降低
  let updated = 0;
  showFavProgress(0, urls.length, label);
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const res = await api('/api/hover', { method: 'POST', body: { urls: chunk } });
    updated += res?.updated || 0;
    showFavProgress(Math.min(i + chunkSize, urls.length), urls.length, label);
    await new Promise(r => setTimeout(r, 200)); // hover 抓取较慢，稍微延迟
  }
  hideFavProgress();
  await loadBookmarks();
  toast(`完成，${updated} 个悬停介绍已更新`);
}

// 注册全局函数供内联 onclick 调用（可选，也可直接用模块导入）
window.batchHoverSelected = batchHoverSelected;
window.batchHoverCategory = batchHoverCategory;
window.fetchAllHovers = fetchAllHovers;