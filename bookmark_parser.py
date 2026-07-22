import re
from dataclasses import dataclass
from typing import List, Optional, Tuple
from urllib.parse import urlparse

FAVICON_SIZE = 64

@dataclass
class BookmarkItem:
    title: str
    url: str
    icon: str
    folder_path: str
    order: int
    desc: str = ""
    hover_source: str = ""

def read_text_file(path: str) -> str:
    """读取文本文件，自动探测并兼容常见编码，防止乱码"""
    with open(path, "rb") as f:
        raw = f.read()
    for enc in ("utf-8", "utf-8-sig", "gb18030", "gbk"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")

def parse_netscape_bookmarks(bookmarks_html: str) -> List[BookmarkItem]:
    """解析 Netscape HTML 格式的浏览器书签，支持完整的文件夹嵌套层级"""
    token_re = re.compile(
        r"(?P<h3><H3\b[^>]*>.*?</H3>)"
        r"|(?P<a><A\b[^>]*>.*?</A>)"
        r"|(?P<dl_open><DL\b[^>]*>)"
        r"|(?P<dl_close></DL>)"
        r"|(?P<dd><DD\b[^>]*>[^<]*)",
        flags=re.IGNORECASE | re.DOTALL,
    )

    stack: List[Tuple[str, str]] = []  # 存放 (文件夹名, 完整路径) 的栈
    pending_folder: Optional[str] = None
    last_item: Optional[BookmarkItem] = None
    items: List[BookmarkItem] = []
    order_counter = 0

    def current_path() -> str:
        if not stack:
            return ""
        return stack[-1][1]

    for m in token_re.finditer(bookmarks_html):
        # 1. 遇到文件夹标题 <H3>
        if m.group("h3"):
            name = re.sub(r"<.*?>", "", m.group("h3"), flags=re.DOTALL).strip()
            pending_folder = name
            last_item = None
            continue

        # 2. 遇到进入子列表的标记 <DL>
        if m.group("dl_open"):
            if pending_folder is not None:
                parent_path = stack[-1][1] if stack else ""
                full_path = pending_folder if not parent_path else f"{parent_path}/{pending_folder}"
                stack.append((pending_folder, full_path))
                pending_folder = None
            last_item = None
            continue

        # 3. 遇到跳出子列表的标记 </DL>
        if m.group("dl_close"):
            if stack:
                stack.pop()
            pending_folder = None
            last_item = None
            continue

        # 4. 遇到具体的书签链接 <A>
        if m.group("a"):
            a_tag = m.group("a")
            # 容错提取 URL，支持可能没有双引号或带单引号的糟糕格式
            href_m = re.search(r"\bHREF=['\"]?([^'\"\s>]+)['\"]?", a_tag, flags=re.IGNORECASE)
            if not href_m:
                continue
            url = href_m.group(1).strip()

            # 提取 ICON (Base64 数据或 URL)
            icon_m = re.search(r"\bICON=['\"]?([^'\">]+)['\"]?", a_tag, flags=re.IGNORECASE)
            icon = icon_m.group(1).strip() if icon_m else ""

            # 提取书签标题，清洗 HTML 标签
            title = re.sub(r"<.*?>", "", a_tag, flags=re.DOTALL)
            title = re.sub(r"^.*?>", "", title, flags=re.DOTALL).strip()

            folder_path = current_path() or "未分类"
            item = BookmarkItem(
                title=title,
                url=url,
                icon=icon,
                folder_path=folder_path,
                order=order_counter,
            )
            order_counter += 1
            items.append(item)
            last_item = item
            continue

        # 5. 遇到书签原生的自带描述 <DD>（如果有的话）
        if m.group("dd"):
            if last_item is not None:
                desc = re.sub(r"^<DD\b[^>]*>", "", m.group("dd"), flags=re.IGNORECASE).strip()
                if desc:
                    last_item.desc = desc
            continue

    return items


def favicon_url(url: str, size: int = FAVICON_SIZE) -> str:
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path.split("/")[0] or url
    return f"https://www.google.com/s2/favicons?domain={host}&sz={size}"


def resolve_item_icon(url: str, icon: str = "", size: int = FAVICON_SIZE) -> str:
    """书签内嵌图标多为 16x16，统一改用更高清的 favicon 服务。"""
    icon = (icon or "").strip()
    if icon.startswith("data:image"):
        return favicon_url(url, size)
    if icon.startswith(("http://", "https://")):
        return icon
    return favicon_url(url, size)