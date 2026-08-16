// /admin/login 路由
import { verifyCredentials, createSession, sessionCookie } from '../lib/auth.js';

export async function onRequestGet() {
  return new Response(loginHtml(), {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.redirect('/admin/login', 302);

  const username = form.get('username') || '';
  const password = form.get('password') || '';
  const ttl      = parseInt(form.get('ttl') || '86400');

  const ok = await verifyCredentials(env, username, password);

  if (!ok) {
    return new Response(loginHtml('用户名或密码错误'), {
      status: 401,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  }

  const token = await createSession(env, ttl);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': sessionCookie(token, ttl),
    },
  });
}

function loginHtml(error = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 - 导航后台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
.box{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;width:100%;max-width:360px}
h1{color:#38bdf8;margin-bottom:1.5rem;text-align:center;font-size:1.3rem}
label{font-size:0.85rem;color:#94a3b8;display:block;margin-bottom:0.25rem}
input,select{width:100%;padding:0.6rem 0.8rem;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:0.5rem;font-size:0.95rem;margin-bottom:1rem;outline:none}
input:focus,select:focus{border-color:#38bdf8}
button{width:100%;padding:0.7rem;background:#38bdf8;color:#0f172a;border:none;border-radius:0.5rem;font-size:1rem;font-weight:600;cursor:pointer;margin-top:0.25rem}
button:hover{opacity:0.85}
.error{background:#7f1d1d;color:#fca5a5;padding:0.6rem 0.8rem;border-radius:0.5rem;font-size:0.85rem;margin-bottom:1rem}
</style>
</head>
<body>
<div class="box">
  <h1>导航后台登录</h1>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/admin/login">
    <label>用户名</label>
    <input type="text" name="username" required autofocus>
    <label>密码</label>
    <input type="password" name="password" required>
    <label>会话有效期</label>
    <select name="ttl">
      <option value="86400">1 天</option>
      <option value="604800">7 天</option>
      <option value="2592000">30 天</option>
    </select>
    <button type="submit">登 录</button>
  </form>
</div>
</body>
</html>`;
}
