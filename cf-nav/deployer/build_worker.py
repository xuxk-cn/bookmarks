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
