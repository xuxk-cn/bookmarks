// KV 读写封装
import { KV, DEFAULT_SETTINGS } from '../constants.js';

export async function getData(env) {
  const raw = await env.NAV_KV.get(KV.DATA);
  if (!raw) return { categories: [] };
  return JSON.parse(raw);
}

export async function putData(env, data) {
  await env.NAV_KV.put(KV.DATA, JSON.stringify(data));
  await markDirty(env);
}

export async function getSettings(env) {
  const raw = await env.NAV_KV.get(KV.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function putSettings(env, settings) {
  await env.NAV_KV.put(KV.SETTINGS, JSON.stringify(settings));
  await markDirty(env);
}

export async function getPending(env) {
  const raw = await env.NAV_KV.get(KV.PENDING);
  return raw ? JSON.parse(raw) : [];
}

export async function putPending(env, list) {
  await env.NAV_KV.put(KV.PENDING, JSON.stringify(list));
}

export async function getHomeCache(env) {
  const dirty = await env.NAV_KV.get(KV.CACHE_DIRTY);
  if (dirty) return null;
  return env.NAV_KV.get(KV.CACHE_HOME);
}

export async function putHomeCache(env, html) {
  await env.NAV_KV.put(KV.CACHE_HOME, html, { expirationTtl: 3600 });
  await env.NAV_KV.delete(KV.CACHE_DIRTY);
}

export async function markDirty(env) {
  await env.NAV_KV.put(KV.CACHE_DIRTY, '1', { expirationTtl: 3600 });
}
