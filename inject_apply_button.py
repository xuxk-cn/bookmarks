# inject_apply_button.py
"""
给 cf-nav/backgrounds/ 下的 a*.html 和 styles*.html 文件
注入"应用到导航页"悬浮按钮，以及修改 bg-preview.html / style-preview.html
让卡片点击直接新窗口打开对应文件。
"""

from pathlib import Path
from bs4 import BeautifulSoup
import re

BACKGROUNDS_DIR = Path("cf-nav/backgrounds")
PUBLIC_BACKGROUNDS_DIR = Path("cf-nav/public/backgrounds")

APPLY_BUTTON_HTML = """
<!-- 应用到导航页 悬浮按钮（由 inject_apply_button.py 注入） -->
<div id="__apply-btn-wrap__" style="
  position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
  z-index:99999; display:flex; gap:0.75rem; align-items:center;
  background:rgba(13,17,23,0.92); border:1px solid #334155;
  border-radius:2rem; padding:0.5rem 1.25rem;
  box-shadow:0 4px 20px rgba(0,0,0,0.5); backdrop-filter:blur(8px);
">
  <span style="font-size:0.82rem; color:#94a3b8;">__FILENAME__</span>
  <button id="__apply-btn__" onclick="__applyToNav__()" style="
    background:#238636; color:#fff; border:none; border-radius:1.5rem;
    padding:0.45rem 1.2rem; font-size:0.88rem; font-weight:600;
    cursor:pointer; transition:background 0.15s; white-space:nowrap;
  " onmouseover="this.style.background='#2ea043'"
    onmouseout="this.style.background='#238636'">
    ✓ 应用到导航页
  </button>
  <button onclick="document.getElementById('__apply-btn-wrap__').style.display='none'" style="
    background:none; border:none; color:#64748b; cursor:pointer;
    font-size:1rem; padding:0 0.25rem;
  " title="隐藏">✕</button>
</div>
<script>
function __applyToNav__() {
  var file = '__FILENAME__';
  localStorage.setItem('__APPLY_KEY__', file);
  var btn = document.getElementById('__apply-btn__');
  btn.textContent = '✔ 已应用！';
  btn.style.background = '#1a7f37';
  setTimeout(function() {
    btn.textContent = '✓ 应用到导航页';
    btn.style.background = '#238636';
  }, 2000);
}
</script>
"""

def inject_button(html_path: Path, apply_key: str) -> bool:
    text = html_path.read_text(encoding="utf-8")
    if "__apply-btn-wrap__" in text:
        return False
    filename = html_path.name
    btn_html = APPLY_BUTTON_HTML.replace("__FILENAME__", filename).replace("__APPLY_KEY__", apply_key)
    if "</body>" in text:
        text = text.replace("</body>", btn_html + "\n</body>", 1)
    else:
        text += btn_html
    html_path.write_text(text, encoding="utf-8")
    return True


def patch_preview_page(preview_path: Path, apply_key: str):
    text = preview_path.read_text(encoding="utf-8")
    if "__patched_by_inject__" in text:
        print(f"  已跳过（已修改过）：{preview_path.name}")
        return

    listen_script = f"""
<!-- 监听子窗口应用操作（由 inject_apply_button.py 注入） -->
<!-- __patched_by_inject__ -->
<script>
window.addEventListener('storage', function(e) {{
  if (e.key === '{apply_key}' && e.newValue) {{
    var label = document.getElementById('selected-label');
    if (label) label.textContent = e.newValue;
    document.querySelectorAll('.card').forEach(function(c) {{
      c.classList.toggle('active', c.dataset.file === e.newValue);
    }});
    var tip = document.createElement('div');
    tip.textContent = '✔ 已应用：' + e.newValue;
    tip.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);background:#238636;color:#fff;padding:0.5rem 1.5rem;border-radius:1rem;font-size:0.9rem;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(tip);
    setTimeout(function() {{ tip.remove(); }}, 3000);
  }}
}});
</script>
"""

    old_click = "card.addEventListener('click', () => updateSelected(file, name));"
    new_click = """card.addEventListener('click', function() {
      updateSelected(file, name);
      window.open('/backgrounds/' + file, '_blank');
    });"""

    text = text.replace(old_click, new_click)
    text = text.replace("</body>", listen_script + "\n</body>", 1)
    preview_path.write_text(text, encoding="utf-8")
    print(f"  已修改预览页：{preview_path.name}")


def main():
    print("=" * 55)
    print("注入「应用到导航页」按钮")
    print("=" * 55)

    print("\n[1] 处理动态背景文件 (a*.html)...")
    a_files = sorted(BACKGROUNDS_DIR.glob("a*.html"),
                     key=lambda p: int(re.search(r'\d+', p.stem).group()) if re.search(r'\d+', p.stem) else 0)
    ok = skip = 0
    for f in a_files:
        if inject_button(f, "bgChoice"):
            print(f"  ✔ 注入：{f.name}")
            ok += 1
        else:
            skip += 1
        # 无论是否新注入，都强制同步到 public/backgrounds/
        dst = PUBLIC_BACKGROUNDS_DIR / f.name
        dst.write_bytes(f.read_bytes())
        print(f"    → 同步到 public/backgrounds/{f.name}")
    print(f"  完成：{ok} 个注入，{skip} 个跳过")

    print("\n[2] 处理风格样式文件 (styles*.html)...")
    s_files = sorted(BACKGROUNDS_DIR.glob("styles*.html"),
                     key=lambda p: int(re.search(r'\d+', p.stem).group()) if re.search(r'\d+', p.stem) else 0)
    ok = skip = 0
    for f in s_files:
        if inject_button(f, "styleChoice"):
            print(f"  ✔ 注入：{f.name}")
            ok += 1
            dst = PUBLIC_BACKGROUNDS_DIR / f.name
            dst.write_bytes(f.read_bytes())
            print(f"    → 同步到 public/backgrounds/")
        else:
            skip += 1
    print(f"  完成：{ok} 个注入，{skip} 个跳过")

    print("\n[3] 修改预览页...")
    patch_preview_page(Path("cf-nav/public/bg-preview.html"), "bgChoice")
    patch_preview_page(Path("cf-nav/public/style-preview.html"), "styleChoice")

    print("\n全部完成！重启 Wrangler 后生效。")


if __name__ == "__main__":
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        import subprocess, sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
        from bs4 import BeautifulSoup
    main()
