// 风格页面 SSR：/styles/1 → 加载 styles1.html 模板注入数据
import { getData, getSettings } from '../lib/kv.js';

export async function onRequestGet({ params, env }) {
  const id = params.id;
  const htmlFile = `styles${id}.html`;

  const [navData, settings, templateRes] = await Promise.all([
    getData(env),
    getSettings(env),
    env.ASSETS.fetch(new Request(`https://placeholder/backgrounds/${htmlFile}`)),
  ]);

  if (!templateRes.ok) {
    return new Response('Style not found', { status: 404 });
  }

  // 转义 </script> 防止 HTML 解析提前截断
  const navDataJson = JSON.stringify(navData).replace(/<\/script>/gi, '<\\/script>');

  let html = await templateRes.text();
  // 替换 nav-data script 内容（兼容占位符和内嵌示例数据两种情况）
  html = html.replace(
    /(<script\s+id="nav-data"[^>]*>)[\s\S]*?(<\/script>)/i,
    '$1' + navDataJson + '$2'
  );
  html = html.replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName || '导航'));
  html = html.replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc || ''));

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
