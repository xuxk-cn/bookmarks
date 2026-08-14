// /admin 主页路由（需认证，由中间件保证）
import { getSettings } from '../lib/kv.js';

export async function onRequestGet({ request, env }) {
  const settings = await getSettings(env);
  const csrf     = crypto.randomUUID();

  const res  = await env.ASSETS.fetch(new Request('https://placeholder/admin/index.html'));
  const html = (await res.text())
    .replace('{{SITE_NAME}}', settings.siteName || '导航后台')
    .replace('{{CSRF_TOKEN}}', csrf);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Set-Cookie': `nav_csrf=${csrf}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    },
  });
}
