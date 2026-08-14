// ── 搜索模块 ──────────────────────────────────────────
// 跨分类多字段搜索，返回评分排序后的结果
// 对外暴露 search(query, allItems) → [{item, score}]

export function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlight(text, words) {
  if (!text || !words.length) return escHtml(text || '');
  let result = escHtml(text);
  words.forEach(w => {
    const re = new RegExp(escRe(escHtml(w)), 'gi');
    result = result.replace(re, m =>
      `<mark style="background:#0ea5e9;color:#0f172a;border-radius:2px;padding:0 2px">${m}</mark>`
    );
  });
  return result;
}

function scoreItem(item, words) {
  const t = (item.title || '').toLowerCase();
  const u = (item.url || '').toLowerCase();
  const h = (item.hover || '').toLowerCase();
  // AND 逻辑：所有词都必须命中
  for (const w of words) {
    if (!t.includes(w) && !u.includes(w) && !h.includes(w)) return -1;
  }
  let score = 0;
  for (const w of words) {
    if (t === w)              score += 100;
    else if (t.startsWith(w)) score += 60;
    else if (t.includes(w))   score += 40;
    if (u.includes(w)) score += 10;
    if (h.includes(w)) score += 5;
  }
  return score;
}

export function search(query, allItems) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return allItems
    .map(item => ({ item, score: scoreItem(item, words) }))
    .filter(r => r.score >= 0)
    .sort((a, b) => b.score - a.score);
}
