#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量去除当前目录下 a1.html ~ a*.html 中
"xxx.html  ✓应用到导航页  ✕" 底栏组件(如图)。
直接运行:  python remove_bar.py
"""
import re, shutil
from pathlib import Path

KEYWORD = "应用到导航页"   # 目标组件的识别文字
BACKUP  = True            # 删除前是否生成 .bak 备份

# ---------- 标签扫描 ----------
TOKEN = re.compile(
    r'<!--.*?-->|<!DOCTYPE[^>]*>'   # 注释/doctype(跳过)
    r'|<(/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)>',
    re.S)
VOID   = {"area","base","br","col","embed","hr","img","input",
          "link","meta","param","source","track","wbr"}
INLINE = {"span","button","a","b","i","em","strong","label","small","code","p"}

def tags(html, start=0):
    """yield (start, end, 是否闭标签, 标签名)"""
    for m in TOKEN.finditer(html, start):
        if m.group(2):
            yield m.start(), m.end(), m.group(1) == "/", m.group(2).lower()

def bar_range(html, pos):
    """找包裹 pos 的最小块级容器, 返回 (起始, 结束, 标签名)"""
    stack = []
    for s, e, close, tag in tags(html):
        if s >= pos: break
        if close:
            if stack and stack[-1][2] == tag: stack.pop()
        elif tag not in VOID:
            stack.append((s, e, tag))
    # 栈顶通常是 button/span, 向上退到“条”本身
    while stack and stack[-1][2] in INLINE: stack.pop()
    if not stack: return None
    s, e, tag = stack[-1]
    depth = 1
    for _, e2, close, t in tags(html, e):
        if t != tag: continue
        depth += -1 if close else 1
        if depth == 0: return s, e2, tag
    return None

def remove_bar(html):
    """删除所有含 KEYWORD 的组件, 返回 (新内容, 删除处数)"""
    count, skip = 0, 0
    while True:
        idx = html.find(KEYWORD, skip)
        if idx < 0: return html, count
        rng, skip = bar_range(html, idx), idx + 1
        if not rng: continue
        s, e, tag = rng
        block = html[s:e]
        # 保险: 不删 <script> 本身, 也不动页面级大节点
        if tag == "script" or len(block) > 20000 \
           or re.search(r'<(html|body|canvas)\b', block, re.I):
            continue
        html = html[:s] + html[e:]
        skip, count = 0, count + 1

# ---------- 批处理 ----------
def main():
    files = [p for p in Path(".").glob("a*.html")
             if re.fullmatch(r"a\d+\.html", p.name)]
    files.sort(key=lambda p: int(re.match(r"a(\d+)", p.name).group(1)))
    if not files:
        print("当前目录未找到 a<数字>.html 文件"); return

    for p in files:
        try:
            src, enc = p.read_bytes().decode("utf-8"), "utf-8"
        except UnicodeDecodeError:
            src, enc = p.read_bytes().decode("gbk", "ignore"), "gbk"
        new, n = remove_bar(src)
        if n:
            if BACKUP: shutil.copy2(p, p.with_name(p.name + ".bak"))
            p.write_bytes(new.encode(enc, "ignore"))
            print(f"[已删 {n} 处] {p.name}")
        else:
            print(f"[未改动]   {p.name}")

if __name__ == "__main__":
    main()