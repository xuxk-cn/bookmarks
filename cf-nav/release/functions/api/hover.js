// Hover/Description 抓取 API
// POST /api/hover  → 批量抓取悬停介绍
// 请求体: { urls: string[] } 或 { all: true } 或 { catIndex: number }

import { getData, putData } from '../lib/kv.js';
import { fetchHovers } from '../lib/hover.js';
import { json, err } from '../lib/utils.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.urls?.length && body?.all !== true && body?.catIndex == null) {
    return err('缺少 urls / all / catIndex 字段');
  }

  const data = await getData(env);
  let targets = [];

  if (body.all) {
    // 抓取所有空悬停介绍的书签
    data.categories.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (!item.hover || !item.hover.trim()) targets.push({ ci, ii, url: item.url });
      });
    });
  } else if (body.catIndex != null) {
    // 抓取指定分类
    const cat = data.categories[body.catIndex];
    if (!cat) return err('分类不存在');
    cat.items.forEach((item, ii) => {
      if (!item.hover || !item.hover.trim()) targets.push({ ci: body.catIndex, ii, url: item.url });
    });
  } else {
    // 抓取指定 URL 列表
    targets = body.urls.map(url => {
      for (let ci = 0; ci < data.categories.length; ci++) {
        const ii = data.categories[ci].items.findIndex(i => i.url === url);
        if (ii !== -1) return { ci, ii, url };
      }
      return null;
    }).filter(Boolean);
  }

  if (!targets.length) return json({ ok: true, updated: 0, message: '没有需要抓取的悬停介绍' });

  const urls = [...new Set(targets.map(t => t.url))];
  const hoverMap = await fetchHovers(urls, 5);

  let updated = 0;
  targets.forEach(({ ci, ii, url }) => {
    if (hoverMap[url]) {
      data.categories[ci].items[ii].hover = hoverMap[url];
      updated++;
    }
  });

  if (updated > 0) await putData(env, data);

  return json({ ok: true, updated, total: targets.length });
}