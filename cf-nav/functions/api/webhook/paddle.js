// POST /api/webhook/paddle → Paddle Webhook 回调
import { json, err } from '../../../src/lib/utils.js';
import { verifyWebhookSignature } from '../../../src/lib/paddle.js';

async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  const signature = request.headers.get('paddle-signature');
  if (!signature) return err('Missing paddle-signature header', 400);

  const body = await request.text();

  const webhookSecret = env.PADDLE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
    if (!isValid) return err('Invalid webhook signature', 403);
  }

  let event;
  try { event = JSON.parse(body); } catch { return err('Invalid JSON', 400); }

  if (event.event_type === 'transaction.completed') {
    const transaction = event.data;
    const customData = transaction.custom_data || {};
    const siteKey = customData.site_key || env.SITE_KEY || 'default';
    const itemId = customData.item_id;
    const itemType = customData.item_type;

    if (itemId && itemType) {
      const kvKey = `nav_license_${siteKey}`;
      const existing = await env.KV?.get(kvKey, 'json') || { keys: [] };

      const txHash = await hashKey(transaction.id);
      if (!existing.keys.find(k => k.hash === txHash)) {
        existing.keys.push({
          hash: txHash,
          transactionId: transaction.id,
          variantId: String(transaction.items?.[0]?.price_id || ''),
          productId: String(transaction.items?.[0]?.product_id || ''),
          purchased: [{ type: itemType, id: itemId }],
          activatedAt: new Date().toISOString(),
        });
        await env.KV?.put(kvKey, JSON.stringify(existing));
      }
    }
  }

  return json({ ok: true });
}
