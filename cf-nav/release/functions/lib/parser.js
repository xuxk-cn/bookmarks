// 书签 HTML 解析（浏览器导出格式）
import { sanitizeUrl, escapeHTML } from './utils.js';

export function parseBookmarks(html) {
  const categories = [];
  let currentCat = null;

  // 提取所有 <DT> 行
  const lines = html.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 分类标题
    const h3 = trimmed.match(/<H3[^>]*>(.*?)<\/H3>/i);
    if (h3) {
      currentCat = { title: decodeEntities(h3[1]), items: [] };
      categories.push(currentCat);
      continue;
    }

    // 书签条目
    const a = trimmed.match(/<A\s+([^>]*)>(.*?)<\/A>/i);
    if (a) {
      const attrs = a[1], title = decodeEntities(a[2]);
      const hrefM = attrs.match(/HREF="([^"]+)"/i);
      const iconM = attrs.match(/ICON="([^"]+)"/i);
      if (!hrefM) continue;
      const url = sanitizeUrl(hrefM[1]);
      if (!url) continue;

      const item = { title, url, icon: iconM?.[1] || '', hover: '' };
      if (!currentCat) {
        currentCat = { title: '未分类', items: [] };
        categories.push(currentCat);
      }
      currentCat.items.push(item);
    }
  }

  return categories.filter(c => c.items.length > 0);
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
