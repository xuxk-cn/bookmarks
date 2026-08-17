"""
重新生成 deployer/_worker.js：
  1. 读取 index.html / styles.css / app.js，内联成单一 HTML 字符串
  2. 读取 _worker.js 中 'export default {' 开始的后端逻辑
  3. 拼接成干净的新 _worker.js，不产生任何重复声明
"""
import json, re, os

base = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(base, '_worker.js')

# ── 读取前端资源 ─────────────────────────────────────────────────
with open(os.path.join(base, 'index.html'), encoding='utf-8') as f:
    html = f.read()
with open(os.path.join(base, 'styles.css'), encoding='utf-8') as f:
    css = f.read()
with open(os.path.join(base, 'app.js'), encoding='utf-8') as f:
    js = f.read()

# 把外链替换成内联
html = html.replace('<link rel="stylesheet" href="/styles.css" />', f'<style>{css}</style>')
html = html.replace('<script src="/app.js"></script>', f'<script>{js}</script>')

html_js = json.dumps(html)  # 转义成 JS 字符串字面量

# ── 读取后端逻辑（从 'export default {' 行开始到文件末尾）────────
with open(out_path, encoding='utf-8') as f:
    original = f.read()

# 找到后端逻辑的起始位置
marker = 'export default {'
idx = original.find(marker)
if idx == -1:
    raise RuntimeError('找不到 "export default {" 标记，请检查 _worker.js 结构')

backend_logic = original[idx:]

# ── 组装新的 _worker.js ──────────────────────────────────────────
new_worker = f"""// ─── 内嵌前端资源（由 build_worker.py 自动生成，请勿手动修改）────
const INDEX_HTML = {html_js};

function serveStatic(path) {{
  if (path === '/' || path === '/index.html') {{
    return new Response(INDEX_HTML, {{
      headers: {{ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }}
    }});
  }}
  return null;
}}

// ─── 后端 Worker 逻辑 ─────────────────────────────────────────────
const CF_API = 'https://api.cloudflare.com/client/v4';
const COMPAT_DATE = '2024-09-23';
const KV_BINDING = 'NAV_KV';
const GITHUB_RAW = 'https://raw.githubusercontent.com/xuxk-cn/bookmarks/master/cf-nav/release';

const PUBLIC_FILES = [
  '_headers',
  'admin/index.html',
  'backgrounds/a1.html','backgrounds/a2.html','backgrounds/a3.html','backgrounds/a4.html',
  'backgrounds/a5.html','backgrounds/a6.html','backgrounds/a7.html','backgrounds/a8.html',
  'backgrounds/a9.html','backgrounds/a10.html','backgrounds/a11.html','backgrounds/a12.html',
  'backgrounds/a13.html','backgrounds/a14.html','backgrounds/a15.html','backgrounds/a16.html',
  'backgrounds/a17.html','backgrounds/a18.html','backgrounds/a19.html','backgrounds/a20.html',
  'backgrounds/a21.html','backgrounds/a22.html','backgrounds/a23.html','backgrounds/a24.html',
  'backgrounds/a25.html','backgrounds/a26.html','backgrounds/a27.html','backgrounds/a28.html',
  'backgrounds/a29.html','backgrounds/a30.html','backgrounds/a31.html','backgrounds/a32.html',
  'backgrounds/a33.html','backgrounds/a34.html','backgrounds/a35.html','backgrounds/a36.html',
  'backgrounds/a37.html','backgrounds/a38.html','backgrounds/a39.html','backgrounds/a40.html',
  'backgrounds/a41.html','backgrounds/a42.html','backgrounds/a43.html','backgrounds/a44.html',
  'backgrounds/a45.html','backgrounds/a46.html',
  'backgrounds/aurora.js','backgrounds/forest.js','backgrounds/matrix.js','backgrounds/particles.js',
  'backgrounds/rain.html','backgrounds/rain.js','backgrounds/sakura.js','backgrounds/snow.js',
  'backgrounds/stars.js','backgrounds/stream.js',
  'backgrounds/styles1.html','backgrounds/styles2.html','backgrounds/styles3.html',
  'backgrounds/styles4.html','backgrounds/styles5.html','backgrounds/styles6.html',
  'backgrounds/styles7.html','backgrounds/styles8.html','backgrounds/styles9.html',
  'backgrounds/styles10.html','backgrounds/styles11.html','backgrounds/styles12.html',
  'backgrounds/styles13.html','backgrounds/styles14.html','backgrounds/styles15.html',
  'backgrounds/styles16.html',
  'bg-preview.html',
  'css/main.css',
  'css/styles01.css','css/styles02.css','css/styles03.css','css/styles04.css',
  'css/styles05.css','css/styles06.css','css/styles07.css','css/styles08.css',
  'css/styles09.css','css/styles10.css','css/styles11.css','css/styles12.css',
  'css/styles13.css','css/styles14.css','css/styles15.css','css/styles16.css',
  'index.html',
  'js/background.js','js/main.js','js/search.js','js/shader-runner.js','js/sound.js',
  'style-preview.html',
];

{backend_logic}"""

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(new_worker)

# 验证没有重复声明
count = new_worker.count('const INDEX_HTML')
assert count == 1, f'ERROR: INDEX_HTML 出现了 {count} 次！'
count2 = new_worker.count('function serveStatic')
assert count2 == 1, f'ERROR: serveStatic 出现了 {count2} 次！'

size = os.path.getsize(out_path)
print(f'Generated _worker.js: {size/1024:.1f} KB')
print(f'INDEX_HTML declarations: {count}  serveStatic declarations: {count2}')
print('Done!')
