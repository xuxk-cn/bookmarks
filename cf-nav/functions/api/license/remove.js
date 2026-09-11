// POST /api/license/remove → 删除已激活的 License
import { json, err } from '../../../src/lib/utils.js';

async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  let body;
  try { body = await request.json(); } catch { return err('Invalid JSON body', 400); }

  const { licenseKey } = body;
  if (!licenseKey) return err('licenseKey is required', 400);

  const siteKey = env.SITE_KEY || 'default';
  const kvKey = `nav_license_${siteKey}`;
  const existing = await env.KV?.get(kvKey, 'json') || { keys: [] };

  const keyHash = await hashKey(licenseKey.trim());
  existing.keys = existing.keys.filter(k => k.hash !== keyHash);
  await env.KV?.put(kvKey, JSON.stringify(existing));

  return json({ ok: true });
}
