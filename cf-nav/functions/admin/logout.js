// /admin/logout 路由
import { destroySession, sessionCookie } from '../lib/auth.js';

export async function onRequestPost({ request, env }) {
  await destroySession(request, env);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': sessionCookie('', 0, true),
    },
  });
}
