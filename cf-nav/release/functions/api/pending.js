// 用户投稿审核 API
// GET    /api/pending         → 获取待审核列表（需认证）
// POST   /api/submit          → 用户提交书签（公开，可配置关闭）
// PUT    /api/pending/:id     → 通过（写入书签数据）
// DELETE /api/pending/:id     → 拒绝

import { getData, putData, getPending, putPending, getSettings } from '../lib/kv.js';
import { sanitizeUrl, json, err } from '../lib/utils.js';

// 获取待审核列表（需认证，由中间件保证）
export async function onRequestGet({ env }) {
  const list = await getPending(env);
  return json(list);
}

// 用户公开提交（无需认证）
export async function onRequestPostSubmit({ request, env }) {
  const settings = await getSettings(env);
  if (!settings.enableSubmit) return err('投稿功能已关闭', 403);

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.url) return err('缺少标题或链接');

  const url = sanitizeUrl(body.url);
  if (!url) return err('无效的 URL');

  const list = await getPending(env);
  list.push({
    id:        crypto.randomUUID(),
    title:     String(body.title).trim(),
    url,
    hover:     String(body.hover || '').trim(),
    category:  String(body.category || '').trim(),
    createdAt: Date.now(),
  });
  await putPending(env, list);
  return json({ ok: true });
}

// 通过投稿（需认证）
export async function onRequestPut({ env, params }) {
  const id   = params.id;
  const list = await getPending(env);
  const idx  = list.findIndex(i => i.id === id);
  if (idx === -1) return err('投稿不存在');

  const submission = list[idx];
  const data = await getData(env);

  // 找到目标分类，没有则新建
  let cat = data.categories.find(c => c.title === submission.category);
  if (!cat) {
    cat = { title: submission.category || '未分类', items: [] };
    data.categories.push(cat);
  }
  cat.items.push({
    title: submission.title,
    url:   submission.url,
    icon:  '',
    hover: submission.hover,
  });

  list.splice(idx, 1);
  await Promise.all([putData(env, data), putPending(env, list)]);
  return json({ ok: true });
}

// 拒绝投稿（需认证）
export async function onRequestDelete({ env, params }) {
  const id   = params.id;
  const list = await getPending(env);
  const idx  = list.findIndex(i => i.id === id);
  if (idx === -1) return err('投稿不存在');
  list.splice(idx, 1);
  await putPending(env, list);
  return json({ ok: true });
}
