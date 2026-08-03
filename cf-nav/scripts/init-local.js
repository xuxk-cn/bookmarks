// 本地开发初始化脚本
// 运行: node scripts/init-local.js
// 会在 .wrangler/state/v3/kv/ 目录写入初始数据

import { execSync } from 'child_process';

const data = {
  'admin_username': 'admin',
  'admin_password': 'admin123',
  'nav_settings': JSON.stringify({
    siteName: '我的导航',
    siteDesc: '个人书签导航站',
    defaultStyle: '1',
    defaultBg: 'none',
    enableSubmit: false,
    aiProvider: 'workers',
    aiModel: '@cf/google/gemma-4-26b-a4b-it',
    aiDelay: 1500,
    faviconApi: 'https://faviconsnap.com/api/favicon?url=',
  }),
  'nav_data': JSON.stringify({
    categories: [
      {
        title: '示例分类',
        items: [
          { title: 'Google', url: 'https://www.google.com', icon: '', hover: '全球最大搜索引擎' },
          { title: 'GitHub', url: 'https://github.com', icon: '', hover: '代码托管平台' },
          { title: 'Cloudflare', url: 'https://cloudflare.com', icon: '', hover: '全球CDN和网络安全服务' },
        ]
      }
    ]
  }),
};

console.log('初始化本地 KV 数据...');
for (const [key, value] of Object.entries(data)) {
  try {
    execSync(
      `npx wrangler kv key put --binding=NAV_KV --local --preview false "${key}" "${value.replace(/"/g, '\\"')}"`,
      { cwd: process.cwd(), stdio: 'pipe' }
    );
    console.log(`✓ ${key}`);
  } catch (e) {
    console.error(`✗ ${key}:`, e.message);
  }
}
console.log('\n完成！运行 npm run dev 启动开发服务器');
console.log('访问 http://localhost:8788');
console.log('后台: http://localhost:8788/admin  账号: admin  密码: admin123');
