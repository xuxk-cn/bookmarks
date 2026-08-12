#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量去除当前目录下 styles1.html ~ styles*.html 中
"xxx.html  ✓应用到导航页  ✕" 底栏组件。

直接运行:
python remove_bar.py
"""

import re, shutil
from pathlib import Path

KEYWORD = "应用到导航页"   # 目标组件识别文字
BACKUP  = True            # 删除前是否生成 .bak 备份


# ---------- 标签扫描 ----------
TOKEN = re.compile(
    r'<!--.*?-->|<!DOCTYPE[^>]*>'
    r'|<(/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*)>',
    re.S
)

VOID = {
    "area","base","br","col","embed","hr","img",
    "input","link","meta","param","source","track","wbr"
}

INLINE = {
    "span","button","a","b","i","em",
    "strong","label","small","code","p"
}


def tags(html, start=0):
    """yield (start,end,是否闭标签,标签名)"""
    for m in TOKEN.finditer(html, start):
        if m.group(2):
            yield (
                m.start(),
                m.end(),
                m.group(1) == "/",
                m.group(2).lower()
            )


def bar_range(html, pos):
    """找包裹 pos 的最小块级容器"""
    stack = []

    for s, e, close, tag in tags(html):
        if s >= pos:
            break

        if close:
            if stack and stack[-1][2] == tag:
                stack.pop()

        elif tag not in VOID:
            stack.append((s, e, tag))

    # 向上退到真正外层容器
    while stack and stack[-1][2] in INLINE:
        stack.pop()

    if not stack:
        return None

    s, e, tag = stack[-1]

    depth = 1

    for _, e2, close, t in tags(html, e):
        if t != tag:
            continue

        depth += -1 if close else 1

        if depth == 0:
            return s, e2, tag

    return None



def remove_bar(html):
    """
    删除所有包含 KEYWORD 的组件
    返回:
    (新html, 删除数量)
    """

    count = 0
    skip = 0

    while True:

        idx = html.find(KEYWORD, skip)

        if idx < 0:
            return html, count

        rng = bar_range(html, idx)

        skip = idx + 1

        if not rng:
            continue

        s, e, tag = rng

        block = html[s:e]

        # 安全保护
        if (
            tag == "script"
            or len(block) > 20000
            or re.search(r'<(html|body|canvas)\b', block, re.I)
        ):
            continue


        html = html[:s] + html[e:]

        skip = 0
        count += 1



# ---------- 批处理 ----------
def main():

    files = [
        p for p in Path(".").glob("styles*.html")
        if re.fullmatch(r"styles\d+\.html", p.name)
    ]


    files.sort(
        key=lambda p: int(
            re.match(r"styles(\d+)", p.name).group(1)
        )
    )


    if not files:
        print("当前目录未找到 styles<数字>.html 文件")
        return



    for p in files:

        try:
            src = p.read_bytes().decode("utf-8")
            enc = "utf-8"

        except UnicodeDecodeError:

            src = p.read_bytes().decode("gbk", "ignore")
            enc = "gbk"



        new, n = remove_bar(src)


        if n:

            if BACKUP:
                shutil.copy2(
                    p,
                    p.with_name(p.name + ".bak")
                )


            p.write_bytes(
                new.encode(enc, "ignore")
            )


            print(f"[已删除 {n} 处] {p.name}")


        else:

            print(f"[未改动]   {p.name}")



if __name__ == "__main__":
    main()