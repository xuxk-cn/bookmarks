/**
 * cf-nav Worker 入口文件
 * 把所有 Pages Functions 路由整合成单个 Worker（用于 Direct Upload 部署）
 */
import { onRequest as middleware } from './_middleware.js';
import { onRequestGet as indexGet } from './index.js';
import { onRequestGet as adminLoginGet, onRequestPost as adminLogin } from './admin/login.js';
import { onRequestPost as adminLogout } from './admin/logout.js';
import { onRequestGet as adminIndex } from './admin/index.js';
import { onRequestGet as bgGet } from './api/backgrounds.js';
import { onRequestGet as bookmarksGet, onRequestPost as bookmarksPost, onRequestPut as bookmarksPut, onRequestDelete as bookmarksDelete } from './api/bookmarks.js';
import { onRequestGet as categoriesGet, onRequestPost as categoriesPost, onRequestPut as categoriesPut, onRequestDelete as categoriesDelete } from './api/categories.js';
import { onRequestGet as settingsGet, onRequestPost as settingsPost, onRequestGetPublic as settingsGetPublic } from './api/settings.js';
import { onRequestPost as importPost } from './api/import.js';
import { onRequestGet as exportGet } from './api/export.js';
import { onRequestGet as pendingGet, onRequestPostSubmit as pendingPostSubmit, onRequestPut as pendingPut, onRequestDelete as pendingDelete } from './api/pending.js';
import { onRequestPost as aiPost } from './api/ai.js';
import { onRequestPost as faviconPost } from './api/favicon.js';
import { onRequestGet as stylesGet } from './styles/[id].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 构建类似 Pages Functions 的 context 对象
    const makeCtx = (handler) => ({
      request,
      env: { ...env, ctx },
      next: () => new Response('Not Found', { status: 404 }),
      params: {},
      data: {},
      functionPath: path,
      waitUntil: ctx.waitUntil?.bind(ctx),
      passThroughOnException: ctx.passThroughOnException?.bind(ctx),
    });

    // 中间件（认证 + CSRF）
    const mwCtx = {
      ...makeCtx(null),
      next: () => routeRequest(request, env, ctx, url, path, method),
    };

    return middleware(mwCtx);
  }
};

async function routeRequest(request, env, ctx, url, path, method) {
  const make = (extraParams = {}) => ({
    request,
    env: { ...env, ctx },
    params: extraParams,
    next: () => new Response('Not Found', { status: 404 }),
    data: {},
  });

  // ── 首页 ──────────────────────────────────────────────────────
  if (path === '/' || path === '/index.html') {
    if (method === 'GET') return indexGet(make());
  }

  // ── admin ─────────────────────────────────────────────────────
  if (path === '/admin' || path === '/admin/') {
    if (method === 'GET') return adminIndex(make());
  }
  if (path === '/admin/login') {
    if (method === 'POST') return adminLogin(make());
    if (method === 'GET') return adminLoginGet(make());
  }
  if (path === '/admin/logout') {
    if (method === 'POST') return adminLogout(make());
  }

  // ── API 路由 ─────────────────────────────────────────────────
  if (path === '/api/backgrounds') {
    if (method === 'GET') return bgGet(make());
  }

  if (path.startsWith('/api/bookmarks')) {
    if (method === 'GET') return bookmarksGet(make());
    if (method === 'POST') return bookmarksPost(make());
    if (method === 'PUT') return bookmarksPut(make());
    if (method === 'DELETE') return bookmarksDelete(make());
  }

  if (path.startsWith('/api/categories')) {
    if (method === 'GET') return categoriesGet(make());
    if (method === 'POST') return categoriesPost(make());
    if (method === 'PUT') return categoriesPut(make());
    if (method === 'DELETE') return categoriesDelete(make());
  }

  if (path.startsWith('/api/settings')) {
    if (method === 'GET') return settingsGet(make());
    if (method === 'POST') return settingsPost(make());
  }

  if (path === '/api/import') {
    if (method === 'POST') return importPost(make());
  }

  if (path === '/api/export') {
    if (method === 'GET') return exportGet(make());
  }

  if (path.startsWith('/api/pending')) {
    if (method === 'GET') return pendingGet(make());
    if (method === 'POST') return pendingPost(make());
    if (method === 'DELETE') return pendingDelete(make());
  }

  if (path === '/api/ai') {
    if (method === 'POST') return aiPost(make());
  }

  if (path === '/api/favicon') {
    if (method === 'GET') return faviconGet(make());
  }

  // ── styles/[id] ───────────────────────────────────────────────
  // 注意：源 functions/styles/[id].js 的实际路径是 /styles/<id>，
  // 前端 style-preview.html 也调用 /styles/<id>，不要带 /api/ 前缀。
  const stylesMatch = path.match(/^\/styles\/(.+)$/);
  if (stylesMatch) {
    if (method === 'GET') return stylesGet(make({ id: stylesMatch[1] }));
  }

  // ── 静态资源（交给 ASSETS 绑定）─────────────────────────────
  if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
  return new Response('Not Found', { status: 404 });
}
