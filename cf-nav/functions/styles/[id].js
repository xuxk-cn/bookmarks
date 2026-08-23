// /styles/[id] 路由已停用
//
// 历史背景：早期实现把"选择风格"做成了"跳转到 /styles/N 加载一整个独立页面"，
// 这违背了"同一张书签导航页只换皮肤"的产品定位，现已废弃。
//
// 现在的"风格选择"完全在 index.html 内进行：通过替换 <link id="style-css">
// 的 href 切到不同的 /css/stylesNN.css，书签的主体内容和 DOM 结构保持不变。
//
// 此路由保留为占位，仅返回提示，不接受请求。

export function onRequestGet() {
  return new Response(
    '此路由已停用。风格皮肤现通过 index.html 的 style-css link 切换，请直接访问 /。',
    { status: 410, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
