// 首页 SSR 入口
import { getData, getSettings, getHomeCache, putHomeCache } from './lib/kv.js';
import { renderHome } from './lib/renderer.js';

let cachedTemplate = null;

export async function onRequestGet({ request, env }) {
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
