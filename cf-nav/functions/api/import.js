// 书签导入 API
// POST /api/import  → 上传书签 HTML，解析后写入 KV（覆盖或合并）

import { getData, putData } from '../lib/kv.js';
import { parseBookmarks } from '../lib/parser.js';
import { json, err } from '../lib/utils.js';

export async function onRequestPost({ request, env }) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return err('无效的表单数据');

  const file = formData.get('file');
  if (!file) return err('未找到文件');

  const html = await file.text();
  const categories = parseBookmarks(html);

  if (!categories.length) return err('未解析到任何书签，请检查文件格式');

  const mode = formData.get('mode') || 'merge'; // merge | replace

  if (mode === 'replace') {
    await putData(env, { categories });
  } else {
    // 合并：同名分类追加，新分类直接加
    const existing = await getData(env);
    const catMap = {};
    for (const c of existing.categories) catMap[c.title] = c;

    for (const c of categories) {
      if (catMap[c.title]) {
        // 去重：同 URL 不重复添加
        const existingUrls = new Set(catMap[c.title].items.map(i => i.url));
        for (const item of c.items) {
          if (!existingUrls.has(item.url)) {
            catMap[c.title].items.push(item);
          }
        }
      } else {
        existing.categories.push(c);
        catMap[c.title] = c;
      }
    }
    await putData(env, existing);
  }

  const total = categories.reduce((s, c) => s + c.items.length, 0);
  return json({ ok: true, categories: categories.length, items: total });
}
