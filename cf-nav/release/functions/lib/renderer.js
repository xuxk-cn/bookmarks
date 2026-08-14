// 首页 SSR 渲染：把数据注入 HTML 模板占位符

export function renderHome(templateHtml, navData, settings) {
  return templateHtml
    .replace(/\{\{SITE_NAME\}\}/g, escHtml(settings.siteName))
    .replace(/\{\{SITE_DESC\}\}/g, escHtml(settings.siteDesc))
    .replace(/\{\{NAV_DATA\}\}/g, JSON.stringify(navData))
    .replace(/\{\{NAV_SETTINGS\}\}/g, JSON.stringify({
      defaultStyle: settings.defaultStyle,
      defaultBg:    settings.defaultBg,
    }));
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
