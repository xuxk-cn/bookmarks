// Session 认证
import { KV } from '../constants.js';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getSessionToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/nav_session=([^;]+)/);
  return m ? m[1] : null;
}

export async function isAuthenticated(request, env) {
  const token = getSessionToken(request);
  if (!token) return false;
  const stored = await env.NAV_KV.get(KV.SESSION(token));
  return stored === '1';
}

export async function createSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_KV.put(KV.SESSION(token), '1', { expirationTtl: ttl });
  return token;
}

export async function destroySession(request, env) {
  const token = getSessionToken(request);
  if (token) await env.NAV_KV.delete(KV.SESSION(token));
}

export async function verifyCredentials(env, username, password) {
  const storedUser = (await env.NAV_KV.get('admin_username') || '').trim();
  const storedPass = (await env.NAV_KV.get('admin_password') || '').trim();
  if (!storedUser || !storedPass) return false;
  return timingSafeEqual(username.trim(), storedUser) && timingSafeEqual(password.trim(), storedPass);
}

export function sessionCookie(token, ttl = 86400, clear = false) {
  if (clear) return `nav_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
  return `nav_session=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}; Path=/`;
}
