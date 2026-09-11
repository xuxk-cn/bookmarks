// POST /api/license → 验证 License Key (Paddle)
import { json, err } from '../../../src/lib/utils.js';
import { validatePaddleLicense } from '../../../src/lib/paddle.js';

const VARIANT_MAP = {
  'pri_01m1wsybd5v9h5shryd1pcmq6r': { type: 'style', id: '11' },
  'pri_01m1wsyc0wq2axhrjn8m0e2rkp': { type: 'background', id: 'a21' },
  'pri_01m1wsycn05r6yqdeq9hjn336w': { type: 'background', id: 'a22' },
  'pri_01m1wsyd8apgsn81rf21zese3a': { type: 'background', id: 'a23' },
  'pri_01m1wsydvg73v94y2ytjht26ch': { type: 'background', id: 'a24' },
  'pri_01m1wsyezye4x72ahcer0wxrt4': { type: 'background', id: 'a25' },
  'pri_01m1wsyfkmbvnnmwc8xqm6dhjy': { type: 'background', id: 'a26' },
  'pri_01m1wsygrywkcecbrepav2j1q0': { type: 'background', id: 'a27' },
  'pri_01m1wsyhckj6n4m3aps9esh4bc': { type: 'background', id: 'a28' },
  'pri_01m1wsyhzvw82v4gmgmke8gs1v': { type: 'background', id: 'a29' },
  'pri_01m1wsyjk5bf2fgb7dzdkvtrbd': { type: 'background', id: 'a30' },
  'pri_01m1wsyk6a5rxver0evaxr9dnt': { type: 'background', id: 'a31' },
  'pri_01m1wsyksbx8whhs1zdzrmwzg5': { type: 'background', id: 'a32' },
  'pri_01m1wsymd1svt8699nw7kh2j5b': { type: 'background', id: 'a33' },
  'pri_01m1wsyn283tf623xk301xd5jg': { type: 'background', id: 'a34' },
  'pri_01m1wsynpz3axh9mx6gdyj218a': { type: 'background', id: 'a35' },
  'pri_01m1wsypag90mrj1f22v3jkp09': { type: 'background', id: 'a36' },
  'pri_01m1wsypzjkcpqztst8trrnv4x': { type: 'background', id: 'a37' },
  'pri_01m1wsyqmmk7jhsgjgdjhfjmjy': { type: 'background', id: 'a38' },
  'pri_01m1wsys2hbqsrh16s7ec0vhkp': { type: 'background', id: 'a39' },
  'pri_01m1wsysp1310tw3sbtx87qy10': { type: 'background', id: 'a40' },
  'pri_01m1wsyt9me1abzhyvn4wf4atg': { type: 'background', id: 'a41' },
  'pri_01m1wsytwvwe3af924py5a0t8q': { type: 'background', id: 'a42' },
  'pri_01m1wsyvg1rf96x9qhgjays0b4': { type: 'background', id: 'a43' },
  'pri_01m1wsyw3gv8w3w0kga4f927cc': { type: 'background', id: 'a44' },
  'pri_01m1wsywpscmwccx8f0a208bq3': { type: 'background', id: 'a45' },
  'pri_01m1wsyxh00n3zqs7b6ah0673b': { type: 'background', id: 'a46' },
  'pri_01m1wsyy4g00gjbw2fmg3vcmvq': { type: 'background', id: 'a47' },
};

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
  if (!licenseKey || typeof licenseKey !== 'string') return err('licenseKey is required', 400);

  const result = await validatePaddleLicense(licenseKey.trim(), env);
  if (!result.valid) return json({ valid: false, error: result.error || 'Invalid license key' }, 400);

  const purchased = [];
  const variantId = String(result.variantId);
  const mapping = VARIANT_MAP[variantId];
  if (mapping) {
    purchased.push(mapping);
  } else {
    const productId = String(result.productId);
    const PRODUCT_MAP = {
      'pro_01m1wsyas32x41rrpkzayt42ez': { type: 'style', id: '11' },
      'pro_01m1wsybqwpqcv56a9zj0qcz7s': { type: 'background', id: 'a21' },
      'pro_01m1wsycc376zvg9rz39q63bt8': { type: 'background', id: 'a22' },
      'pro_01m1wsyczcmwr0amb3rv2db49t': { type: 'background', id: 'a23' },
      'pro_01m1wsydjh4p1x4v4fkvq09afd': { type: 'background', id: 'a24' },
      'pro_01m1wsye62fsf14edwr9w96gvb': { type: 'background', id: 'a25' },
      'pro_01m1wsyfahcj1t4cnawz782azs': { type: 'background', id: 'a26' },
      'pro_01m1wsygg39fv7m8dxqbrwjprq': { type: 'background', id: 'a27' },
      'pro_01m1wsyh3sgxyefwa7bs6r7ptz': { type: 'background', id: 'a28' },
      'pro_01m1wsyhpzbdmasrezx91kknn3': { type: 'background', id: 'a29' },
      'pro_01m1wsyja3fbgvg1zgf9jytz42': { type: 'background', id: 'a30' },
      'pro_01m1wsyjxhs59nkcrdey4e88dn': { type: 'background', id: 'a31' },
      'pro_01m1wsykgdd02e1ncjyaver535': { type: 'background', id: 'a32' },
      'pro_01m1wsym43ww2hza5mhm50jmt4': { type: 'background', id: 'a33' },
      'pro_01m1wsymqm0g0vd8ja8trj4bsk': { type: 'background', id: 'a34' },
      'pro_01m1wsyne0tk69d32kgzp1edcm': { type: 'background', id: 'a35' },
      'pro_01m1wsyp1hfa5kd9ze42dwyz01': { type: 'background', id: 'a36' },
      'pro_01m1wsypnh9ptwez4f1r02bzeh': { type: 'background', id: 'a37' },
      'pro_01m1wsyqay360fktvmfjhhzk7b': { type: 'background', id: 'a38' },
      'pro_01m1wsyrh2c5a4jpc8a0mebsv1': { type: 'background', id: 'a39' },
      'pro_01m1wsysd9jatd2gvqgqtvbzy7': { type: 'background', id: 'a40' },
      'pro_01m1wsyt0sxwtdygdce7s62b0d': { type: 'background', id: 'a41' },
      'pro_01m1wsytm35nw4f03xf7cq1bsf': { type: 'background', id: 'a42' },
      'pro_01m1wsyv76k36pvgvg1y0wq3hx': { type: 'background', id: 'a43' },
      'pro_01m1wsyvtksfv448mk514s8abr': { type: 'background', id: 'a44' },
      'pro_01m1wsywdyvwv1xacxa9h7svpz': { type: 'background', id: 'a45' },
      'pro_01m1wsyx7a8h8h696eak3hm5qs': { type: 'background', id: 'a46' },
      'pro_01m1wsyxv92q59cdervye03a5k': { type: 'background', id: 'a47' },
    };
    const productMapping = PRODUCT_MAP[productId];
    if (productMapping) purchased.push({ type: productMapping.type, id: variantId });
  }

  const siteKey = env.SITE_KEY || 'default';
  const kvKey = `nav_license_${siteKey}`;
  const existing = await env.KV?.get(kvKey, 'json') || { keys: [] };

  const keyHash = await hashKey(licenseKey.trim());
  if (!existing.keys.find(k => k.hash === keyHash)) {
    existing.keys.push({
      hash: keyHash, variantId, productId: result.productId,
      transactionId: result.transactionId, purchased,
      activatedAt: new Date().toISOString(),
    });
    await env.KV?.put(kvKey, JSON.stringify(existing));
  }

  return json({ valid: true, purchased, licenseKey: licenseKey.trim(), activatedAt: new Date().toISOString() });
}
