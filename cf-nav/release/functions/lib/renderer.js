// 首页 SSR 渲染：把数据注入 HTML 模板占位符

export function renderHome(templateHtml, navData, settings) {
  // 站点美化设置单独抽取，避免影响主渲染
  let beautyJson = '{}';
  try {
    beautyJson = JSON.stringify({
      theme:     settings.theme,
      glass:     settings.glass,
      hoverFx:   settings.hoverFx,
      tilt:      settings.tilt,
      waterfall: settings.waterfall,
      shared:    settings.shared,
      searchFx:  settings.searchFx,
      welcome:   settings.welcome,
      weather:   settings.weather,
      noLinkBorder: settings.noLinkBorder,
    }).replace(/</g, '\\u003c');
  } catch (e) { beautyJson = '{}'; }

  return templateHtml
    .replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName))
    .replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc))
    .replace(/\{\{NAV_DATA\}\}/g, JSON.stringify(navData))
    .replace(/\{\{NAV_SETTINGS\}\}/g, JSON.stringify({
      defaultStyle: settings.defaultStyle,
      defaultBg:    settings.defaultBg,
    }))
    .replace(/\{\{NAV_BEAUTY\}\}/g, beautyJson);
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
