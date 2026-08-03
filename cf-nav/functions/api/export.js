// 书签导出 API
// GET /api/export?format=json   → 导出 JSON
// GET /api/export?format=html   → 导出浏览器书签 HTML

import { getData } from '../lib/kv.js';
import { escapeHTML } from '../lib/utils.js';

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const data   = await getData(env);

  if (format === 'html') {
    const html = toBookmarkHtml(data.categories);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Content-Disposition': 'attachment; filename="bookmarks.html"',
      },
    });
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="nav-data.json"',
    },
  });
}

function toBookmarkHtml(categories) {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  for (const cat of categories) {
    lines.push(`    <DT><H3>${escapeHTML(cat.title)}</H3>`);
    lines.push('    <DL><p>');
    for (const item of cat.items) {
      const icon = item.icon ? ` ICON="${item.icon}"` : '';
      lines.push(`        <DT><A HREF="${escapeHTML(item.url)}"${icon}>${escapeHTML(item.title)}</A>`);
    }
    lines.push('    </DL><p>');
  }
  lines.push('</DL><p>');
  return lines.join('\n');
}
