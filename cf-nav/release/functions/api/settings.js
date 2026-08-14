// 站点设置 API
// GET  /api/settings         → 返回完整设置（需认证）
// POST /api/settings         → 更新设置（需认证）
// GET  /api/settings/public  → 返回公开设置（无需认证，供首页用）

import { getSettings, putSettings } from '../lib/kv.js';
import { json, err } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  const settings = await getSettings(env);
  // 不返回 aiApiKey
  const { aiApiKey, ...safe } = settings;
  return json(safe);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return err('无效请求体');

  // 处理密码修改：直接更新独立 KV 条目，不写入 nav_settings
  if (body._changePassword) {
    await env.NAV_KV.put('admin_password', body._changePassword.trim());
  }
  delete body._changePassword;

  const current = await getSettings(env);
  const updated = { ...current, ...body };

  // 不允许通过此接口清空管理员密码
  delete updated.adminUsername;
  delete updated.adminPassword;

  await putSettings(env, updated);
  return json({ ok: true });
}

// 公开接口：只返回前端需要的非敏感设置
export async function onRequestGetPublic({ env }) {
  const s = await getSettings(env);
  return json({
    siteName:     s.siteName,
    siteDesc:     s.siteDesc,
    defaultStyle: s.defaultStyle,
    defaultBg:    s.defaultBg,
    enableSubmit: s.enableSubmit,
  });
}
