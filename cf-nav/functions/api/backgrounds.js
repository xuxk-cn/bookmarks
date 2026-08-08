// GET /api/backgrounds → 返回 backgrounds/ 目录下的 HTML 文件列表
// CF Pages 的静态文件通过 ASSETS 服务，无法直接列目录
// 所以用 manifest 方式：扫描已知文件，返回存在的

import { json } from '../lib/utils.js';

// 背景文件的显示名称映射（可按需添加）
const NAME_MAP = {
  'rain.html':    '🌧 下雨(Canvas)',
  'snow.html':    '❄️ 下雪(Canvas)',
  'forest.html':  '🌿 落叶(Canvas)',
  'a1.html':  '✨ 特效1',
  'a2.html':  '🔥 特效2',
  'a3.html':  '🌀 特效3',
  'a4.html':  '🌊 海浪',
  'a5.html':  '☁️ 云雾',
  'a6.html':  '💫 特效6',
  'a7.html':  '🎨 特效7',
  'a8.html':  '🌤 天空',
  'a9.html':  '⚡ 特效9',
  'a10.html': '🎭 特效10',
  'a11.html': '🌌 特效11',
  'a12.html': '🔮 特效12',
  'a13.html': '🎪 特效13',
  'a14.html': '🌈 特效14',
  'a15.html': '🏄 特效15',
  'a16.html': '💠 特效16',
  'a17.html': '🌺 特效17',
  'a18.html': '🌫 特效18',
  'a19.html': '🎆 特效19',
  'a20.html': '🎇 特效20',
};

// 风格文件映射（可按需添加）
const STYLES_MAP = {
  'styles1.html':  '风格 1',
  'styles2.html':  '风格 2',
  'styles3.html':  '风格 3',
  'styles4.html':  '风格 4',
  'styles5.html':  '风格 5',
  'styles6.html':  '风格 6',
  'styles7.html':  '风格 7',
  'styles8.html':  '风格 8',
  'styles9.html':  '风格 9',
  'styles10.html': '风格 10',
  'styles11.html': '风格 11',
  'styles12.html': '风格 12',
  'styles13.html': '风格 13',
  'styles14.html': '风格 14',
  'styles15.html': '风格 15',
  'styles16.html': '风格 16',
  'styles17.html': '风格 17',
  'styles18.html': '风格 18',
  'styles19.html': '风格 19',
  'styles20.html': '风格 20',
};

export async function onRequestGet({ env }) {
  const files = [];

  // 逐个探测文件是否存在
  const candidates = Object.keys(NAME_MAP);
  await Promise.all(candidates.map(async (filename) => {
    try {
      const res = await env.ASSETS.fetch(
        new Request(`https://placeholder/backgrounds/${filename}`, { method: 'HEAD' })
      );
      if (res.status === 200) {
        files.push({ file: filename, name: NAME_MAP[filename] || filename });
      }
    } catch {}
  }));

  // 按文件名排序：Canvas 背景在前，a*.html 按数字排序
  files.sort((a, b) => {
    const order = ['rain.html', 'snow.html', 'forest.html'];
    const ai = order.indexOf(a.file);
    const bi = order.indexOf(b.file);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    // a*.html 按数字排
    const na = parseInt(a.file.match(/\d+/)?.[0] || '0');
    const nb = parseInt(b.file.match(/\d+/)?.[0] || '0');
    return na - nb;
  });

  // 探测 styles 文件
  const styleFiles = [];
  await Promise.all(Object.keys(STYLES_MAP).map(async (filename) => {
    try {
      const res = await env.ASSETS.fetch(
        new Request(`https://placeholder/backgrounds/${filename}`, { method: 'HEAD' })
      );
      if (res.status === 200) {
        styleFiles.push({ file: filename, name: STYLES_MAP[filename] });
      }
    } catch {}
  }));
  styleFiles.sort((a, b) => {
    const na = parseInt(a.file.match(/\d+/)?.[0] || '0');
    const nb = parseInt(b.file.match(/\d+/)?.[0] || '0');
    return na - nb;
  });

  return json({ backgrounds: files, styles: styleFiles });
}
