// 全局中间件：认证校验、CSRF 防护
import { isAuthenticated } from './lib/auth.js';
import { err } from './lib/utils.js';

const PUBLIC_PATHS = [
  '/api/settings/public',
  '/api/submit',
  '/api/backgrounds',
];

export async function onRequest({ request, env, next }) {
  const url  = new URL(request.url);
  const path = url.pathname;

  // 需要认证的路径
  const ADMIN_PUBLIC = ['/admin/login', '/admin/logout'];
  const needsAuth = path.startsWith('/admin') || path.startsWith('/api/');
  const isPublic  = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))
                 || ADMIN_PUBLIC.includes(path);

  if (needsAuth && !isPublic) {
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      // admin 页面重定向到登录
      if (path.startsWith('/admin')) {
        return Response.redirect(new URL('/admin/login', request.url), 302);
      }
      return err('Unauthorized', 401);
    }

    // CSRF 校验（写操作）
    if (['POST','PUT','DELETE','PATCH'].includes(request.method)) {
      const csrf = request.headers.get('X-CSRF-Token');
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/nav_csrf=([^;]+)/);
      if (!csrf || !m || csrf !== m[1]) {
        return err('Invalid CSRF token', 403);
      }
    }
  }

  return next();
}
