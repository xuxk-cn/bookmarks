import { onRequestGet as __admin_login_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\admin\\login.js"
import { onRequestPost as __admin_login_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\admin\\login.js"
import { onRequestPost as __admin_logout_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\admin\\logout.js"
import { onRequestPost as __api_ai_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\ai.js"
import { onRequestGet as __api_backgrounds_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\backgrounds.js"
import { onRequestDelete as __api_bookmarks_js_onRequestDelete } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\bookmarks.js"
import { onRequestGet as __api_bookmarks_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\bookmarks.js"
import { onRequestPost as __api_bookmarks_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\bookmarks.js"
import { onRequestPut as __api_bookmarks_js_onRequestPut } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\bookmarks.js"
import { onRequestDelete as __api_categories_js_onRequestDelete } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\categories.js"
import { onRequestGet as __api_categories_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\categories.js"
import { onRequestPost as __api_categories_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\categories.js"
import { onRequestPut as __api_categories_js_onRequestPut } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\categories.js"
import { onRequestGet as __api_export_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\export.js"
import { onRequestPost as __api_favicon_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\favicon.js"
import { onRequestPost as __api_import_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\import.js"
import { onRequestDelete as __api_pending_js_onRequestDelete } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\pending.js"
import { onRequestGet as __api_pending_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\pending.js"
import { onRequestPut as __api_pending_js_onRequestPut } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\pending.js"
import { onRequestGet as __api_settings_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\settings.js"
import { onRequestPost as __api_settings_js_onRequestPost } from "E:\\projects\\bookmarks\\cf-nav\\functions\\api\\settings.js"
import { onRequestGet as __admin_index_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\admin\\index.js"
import { onRequestGet as __index_js_onRequestGet } from "E:\\projects\\bookmarks\\cf-nav\\functions\\index.js"
import { onRequest as ___middleware_js_onRequest } from "E:\\projects\\bookmarks\\cf-nav\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/admin/login",
      mountPath: "/admin",
      method: "GET",
      middlewares: [],
      modules: [__admin_login_js_onRequestGet],
    },
  {
      routePath: "/admin/login",
      mountPath: "/admin",
      method: "POST",
      middlewares: [],
      modules: [__admin_login_js_onRequestPost],
    },
  {
      routePath: "/admin/logout",
      mountPath: "/admin",
      method: "POST",
      middlewares: [],
      modules: [__admin_logout_js_onRequestPost],
    },
  {
      routePath: "/api/ai",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_js_onRequestPost],
    },
  {
      routePath: "/api/backgrounds",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_backgrounds_js_onRequestGet],
    },
  {
      routePath: "/api/bookmarks",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_bookmarks_js_onRequestDelete],
    },
  {
      routePath: "/api/bookmarks",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_bookmarks_js_onRequestGet],
    },
  {
      routePath: "/api/bookmarks",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_bookmarks_js_onRequestPost],
    },
  {
      routePath: "/api/bookmarks",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_bookmarks_js_onRequestPut],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_categories_js_onRequestDelete],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_categories_js_onRequestGet],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_categories_js_onRequestPost],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_categories_js_onRequestPut],
    },
  {
      routePath: "/api/export",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_export_js_onRequestGet],
    },
  {
      routePath: "/api/favicon",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_favicon_js_onRequestPost],
    },
  {
      routePath: "/api/import",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_import_js_onRequestPost],
    },
  {
      routePath: "/api/pending",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_pending_js_onRequestDelete],
    },
  {
      routePath: "/api/pending",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_pending_js_onRequestGet],
    },
  {
      routePath: "/api/pending",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_pending_js_onRequestPut],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_settings_js_onRequestGet],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_settings_js_onRequestPost],
    },
  {
      routePath: "/admin",
      mountPath: "/admin",
      method: "GET",
      middlewares: [],
      modules: [__admin_index_js_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__index_js_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]