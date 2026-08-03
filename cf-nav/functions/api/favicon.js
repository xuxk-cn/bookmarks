// Favicon 抓取 API
// POST /api/favicon  → 批量抓取 favicon
// 请求体: { urls: string[], catIndex?: number }

import { getData, putData, getSettings } from '../lib/kv.js';
import { fetchFavicons } from '../lib/favicon.js';
import { json, err } from '../lib/utils.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.urls?.length && body?.all !== true) {
    return err('缺少 urls 字段');
  }

  const settings = await getSettings(env);
  const apiPrefix = settings.faviconApi || 'https://faviconsnap.com/api/favicon?url=';

  const data = await getData(env);
  let targets = [];

  if (body.all) {
    // 抓取所有空图标的书签
    data.categories.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (!item.icon) targets.push({ ci, ii, url: item.url });
      });
    });
  } else if (body.catIndex != null) {
    // 抓取指定分类
    const cat = data.categories[body.catIndex];
    if (!cat) return err('分类不存在');
    cat.items.forEach((item, ii) => {
      if (!item.icon) targets.push({ ci: body.catIndex, ii, url: item.url });
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

  if (!targets.length) return json({ ok: true, updated: 0, message: '没有需要抓取的图标' });

  const urls = [...new Set(targets.map(t => t.url))];
  const faviconMap = await fetchFavicons(urls, apiPrefix, 5);

  let updated = 0;
  targets.forEach(({ ci, ii, url }) => {
    if (faviconMap[url]) {
      data.categories[ci].items[ii].icon = faviconMap[url];
      updated++;
    }
  });

  if (updated > 0) await putData(env, data);

  return json({ ok: true, updated, total: targets.length });
}
