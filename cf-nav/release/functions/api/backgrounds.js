// GET /api/backgrounds → 返回 backgrounds/ 目录下的 HTML 文件列表
import { json } from '../lib/utils.js';

const NAME_MAP = {
  'rain.html':    '🌧 下雨(Canvas)',
  'a1.html':  '✨ 特效1',
  'a2.html':  '🔥 特效2',
  'a3.html':  '🌀 特效3',
  'a4.html':  '🌊 特效4',
  'a5.html':  '☁️ 特效5',
  'a6.html':  '💫 特效6',
  'a7.html':  '🎨 特效7',
  'a8.html':  '🌤 特效8',
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
  'a21.html': '✨ 特效21',
  'a22.html': '✨ 特效22',
  'a23.html': '✨ 特效23',
  'a24.html': '✨ 特效24',
  'a25.html': '✨ 特效25',
  'a26.html': '✨ 特效26',
  'a27.html': '✨ 特效27',
  'a28.html': '✨ 特效28',
  'a29.html': '✨ 特效29',
  'a30.html': '✨ 特效30',
  'a31.html': '✨ 特效31',
  'a32.html': '✨ 特效32',
  'a33.html': '✨ 特效33',
  'a34.html': '✨ 特效34',
  'a35.html': '✨ 特效35',
  'a36.html': '✨ 特效36',
  'a37.html': '✨ 特效37',
  'a38.html': '✨ 特效38',
  'a39.html': '✨ 特效39',
  'a40.html': '✨ 特效40',
  'a41.html': '✨ 特效41',
  'a42.html': '✨ 特效42',
  'a43.html': '✨ 特效43',
  'a44.html': '✨ 特效44',
  'a45.html': '✨ 特效45',
  'a46.html': '✨ 特效46',
  'a47.html': '✨ 特效47',
};

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
};

export function onRequestGet() {
  const files = Object.entries(NAME_MAP).map(([file, name]) => ({ file, name }));

  files.sort((a, b) => {
    if (a.file === 'rain.html') return -1;
    if (b.file === 'rain.html') return 1;
    const na = parseInt(a.file.match(/\d+/)?.[0] || '0');
    const nb = parseInt(b.file.match(/\d+/)?.[0] || '0');
    return na - nb;
  });

  const styleFiles = Object.entries(STYLES_MAP)
    .map(([file, name]) => ({ file, name }))
    .sort((a, b) => {
      const na = parseInt(a.file.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.file.match(/\d+/)?.[0] || '0');
      return na - nb;
    });

  return json({ backgrounds: files, styles: styleFiles });
}
