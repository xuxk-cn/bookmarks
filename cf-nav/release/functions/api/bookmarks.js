// 书签 CRUD API
// GET    /api/bookmarks          → 返回全量数据
// POST   /api/bookmarks          → 新增书签
// PUT    /api/bookmarks/:id      → 修改书签
// DELETE /api/bookmarks/:id      → 删除书签

import { getData, putData } from '../lib/kv.js';
import { sanitizeUrl, json, err } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  const data = await getData(env);
  return json(data);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.url || body.catIndex == null) {
    return err('缺少必要字段');
  }
  const url = sanitizeUrl(body.url);
  if (!url) return err('无效的 URL');

  const data = await getData(env);
  const cat = data.categories[body.catIndex];
  if (!cat) return err('分类不存在');

  const item = {
    title: String(body.title).trim(),
    url,
    icon:  body.icon  || '',
    hover: body.hover || '',
  };
  cat.items.push(item);
  await putData(env, data);
  return json({ ok: true, item });
}

export async function onRequestPut({ request, env, params }) {
  const [ci, ii] = (params.id || '').split('-').map(Number);
  const body = await request.json().catch(() => null);
  if (!body) return err('无效请求体');

  const data = await getData(env);
  const item = data.categories[ci]?.items[ii];
  if (!item) return err('书签不存在');

  if (body.title != null) item.title = String(body.title).trim();
  if (body.url   != null) {
    const url = sanitizeUrl(body.url);
    if (!url) return err('无效的 URL');
    item.url = url;
  }
  if (body.icon  != null) item.icon  = body.icon;
  if (body.hover != null) item.hover = body.hover;

  await putData(env, data);
  return json({ ok: true, item });
}

export async function onRequestDelete({ env, params }) {
  const [ci, ii] = (params.id || '').split('-').map(Number);
  const data = await getData(env);
  if (!data.categories[ci]?.items[ii]) return err('书签不存在');

  data.categories[ci].items.splice(ii, 1);
  await putData(env, data);
  return json({ ok: true });
}

// POST /api/bookmarks/reorder → 调整某分类内书签的排序位置
export async function onRequestReorder({ request, env }) {
  const body = await request.json().catch(() => null);
  const catIndex = body?.catIndex;
  const from = body?.from;
  const to   = body?.to;
  if (catIndex == null || from == null || to == null) return err('缺少必要字段');

  const data = await getData(env);
  const cat = data.categories[catIndex];
  if (!cat) return err('分类不存在');

  const items = cat.items;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return err('索引越界');
  if (from === to) return json({ ok: true });

  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  await putData(env, data);
  return json({ ok: true });
}
