// AI 补描述 API
// POST /api/ai  → 为指定书签批量生成介绍
// 请求体: { items: [{catIndex, itemIndex}], provider?, model?, apiKey? }

import { getData, putData, getSettings } from '../lib/kv.js';
import { json, err } from '../lib/utils.js';

const PROMPT = (title, url) =>
  `用不少于50字的中文介绍该网站的用途和核心功能。要求：务实、简洁、突出功能，不要营销话术。网站标题：${title}，网址：${url}。直接输出介绍内容，不要任何前缀。`;

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body?.items?.length) return err('缺少 items 字段');

  const settings = await getSettings(env);
  const data      = await getData(env);

  const provider = body.provider || settings.aiProvider || 'workers';
  const model    = body.model    || settings.aiModel;
  const apiKey   = body.apiKey   || settings.aiApiKey;
  const delay    = settings.aiDelay || 1500;

  const results = [];

  for (const { catIndex: ci, itemIndex: ii } of body.items) {
    const item = data.categories[ci]?.items[ii];
    if (!item) { results.push({ ci, ii, ok: false, error: '书签不存在' }); continue; }

    try {
      const desc = await generateDesc(env, item.title, item.url, provider, model, apiKey);
      if (desc) {
        item.hover = desc;
        results.push({ ci, ii, ok: true, hover: desc });
      } else {
        results.push({ ci, ii, ok: false, error: 'AI 返回为空' });
      }
    } catch (e) {
      results.push({ ci, ii, ok: false, error: String(e.message) });
    }

    // 批量处理时加延迟，避免触发限速
    if (body.items.length > 1) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  await putData(env, data);
  return json({ ok: true, results });
}

async function generateDesc(env, title, url, provider, model, apiKey) {
  const prompt = PROMPT(title, url);

  if (provider === 'workers') {
    // CF Workers AI（需绑定 AI 服务）
    if (!env.AI) throw new Error('未绑定 Workers AI 服务');
    const res = await env.AI.run(model || '@cf/google/gemma-4-26b-a4b-it', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });
    return cleanDesc(res?.response || res?.result?.response || '');
  }

  if (provider === 'gemini') {
    if (!apiKey) throw new Error('未配置 Gemini API Key');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash-lite'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    return cleanDesc(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
  }

  if (provider === 'openai') {
    if (!apiKey) throw new Error('未配置 OpenAI API Key');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    return cleanDesc(data?.choices?.[0]?.message?.content || '');
  }

  throw new Error(`不支持的 provider: ${provider}`);
}

function cleanDesc(text) {
  return (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/^(介绍|描述|说明|网站介绍|功能介绍)[:：]\s*/i, '')
    .trim()
    .split('\n')[0]
    .trim();
}
