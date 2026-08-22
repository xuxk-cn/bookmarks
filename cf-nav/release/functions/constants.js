// KV key 前缀
export const KV = {
  DATA:        'nav_data',          // 全量书签 JSON
  SETTINGS:    'nav_settings',      // 站点设置 JSON
  PENDING:     'nav_pending',       // 待审核投稿 JSON
  CACHE_HOME:  'nav_cache_home',    // 首页 HTML 缓存
  CACHE_DIRTY: 'nav_cache_dirty',   // 缓存重建标记
  SESSION:     (tok) => `nav_session_${tok}`,
};

// 默认设置
export const DEFAULT_SETTINGS = {
  siteName:        '我的导航',
  siteDesc:        '个人书签导航站',
  footerText:      '',
  defaultStyle:    '1',           // 卡片风格 1/2/3
  defaultBg:       'none',        // 默认背景
  enableSubmit:    false,         // 是否开放用户投稿
  aiProvider:      'workers',     // workers / gemini / openai
  aiModel:         '@cf/google/gemma-4-26b-a4b-it',
  aiApiKey:        '',
  aiDelay:         1500,          // 批量 AI 间隔 ms
  faviconApi:      'https://faviconsnap.com/api/favicon?url=',
  sessionTtl:      86400,         // Session 有效期（秒），默认 1 天

  // ── 站点美化设置（独立模块，出错不影响主程序） ──
  theme:           'dark',   // dark | cyberpunk | minimal | forest | system
  glass:           true,    // 毛玻璃卡片
  hoverFx:         true,    // 图标悬停弹跳/变色/形态变换
  tilt:            true,    // 3D 倾斜
  waterfall:       true,    // 瀑布流错落淡入
  shared:          true,    // 共享元素过渡（点击放大）
  searchFx:        true,    // 搜索框呼吸光 + 展开
  welcome:         true,    // 动态欢迎语
  weather:         false,   // 天气联动（结合欢迎语）
};
