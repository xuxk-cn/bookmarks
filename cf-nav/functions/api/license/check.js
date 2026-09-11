// POST /api/license/check → 检查已激活的 License
import { json } from '../../../src/lib/utils.js';

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const siteKey = env.SITE_KEY || url.hostname || 'default';
  const kvKey = `nav_license_${siteKey}`;
  const existing = await env.KV?.get(kvKey, 'json') || { keys: [] };

  const purchased = [];
  for (const k of existing.keys) purchased.push(...k.purchased);

  const unique = [];
  const seen = new Set();
  for (const p of purchased) {
    const key = `${p.type}:${p.id}`;
    if (!seen.has(key)) { seen.add(key); unique.push(p); }
  }

  return json({ valid: existing.keys.length > 0, purchased: unique });
}
