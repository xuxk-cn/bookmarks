// 分类 CRUD API
// GET    /api/categories     → 返回所有分类（不含 items 内容，只含 title 和数量）
// POST   /api/categories     → 新增分类
// PUT    /api/categories/:i  → 修改分类名
// DELETE /api/categories/:i  → 删除分类（含下面所有书签）

import { getData, putData } from '../lib/kv.js';
import { json, err } from '../lib/utils.js';

export async function onRequestGet({ env }) {
  const data = await getData(env);
  const cats = data.categories.map((c, i) => ({
    index: i,
    title: c.title,
    count: c.items.length,
  }));
  return json(cats);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.title) return err('缺少分类名称');

  const data = await getData(env);
  data.categories.push({ title: String(body.title).trim(), items: [] });
  await putData(env, data);
  return json({ ok: true, index: data.categories.length - 1 });
}

export async function onRequestPut({ request, env, params }) {
  const i = parseInt(params.i);
  const body = await request.json().catch(() => null);
  if (!body?.title) return err('缺少分类名称');

  const data = await getData(env);
  if (!data.categories[i]) return err('分类不存在');
  data.categories[i].title = String(body.title).trim();
  await putData(env, data);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const i = parseInt(params.i);
  const data = await getData(env);
  if (!data.categories[i]) return err('分类不存在');
  data.categories.splice(i, 1);
  await putData(env, data);
  return json({ ok: true });
}
