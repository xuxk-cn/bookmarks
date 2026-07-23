import json
import os
import re
import ssl
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

# 导入自定义的本地模块
import ai_client
import favicon_fetcher
from bookmark_parser import BookmarkItem, parse_netscape_bookmarks, read_text_file, resolve_item_icon

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
MAX_BYTES_TO_PARSE = 200_000
MAX_ICON_BYTES = favicon_fetcher.MAX_ICON_BYTES

def _make_request(url: str, method: str = "GET") -> Request:
    return Request(
        url,
        method=method,
        headers={
            "User-Agent": DEFAULT_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Connection": "close",
        },
    )

def _make_ssl_context() -> ssl.SSLContext:
    """创建兼容性最强的 SSL context，应对各种服务器 TLS 配置"""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    # 允许旧版 TLS，兼容部分服务器
    ctx.options &= ~getattr(ssl, "OP_NO_SSLv3", 0)
    ctx.options &= ~getattr(ssl, "OP_NO_TLSv1", 0)
    ctx.options &= ~getattr(ssl, "OP_NO_TLSv1_1", 0)
    # 放宽密码套件限制，解决 SSLV3_ALERT_HANDSHAKE_FAILURE
    try:
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
    except ssl.SSLError:
        pass
    return ctx

def _safe_urlopen(req: Request, timeout: int):
    return urlopen(req, timeout=timeout, context=_make_ssl_context())

def validate_url(url: str, timeout: int) -> Tuple[bool, str, int]:
    """验证链接有效性"""
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"unsupported scheme: {parsed.scheme or 'empty'}", 0

    try:
        req = _make_request(url, method="HEAD")
        with _safe_urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if 200 <= status < 400:
                return True, "", status
            if status == 405:
                raise HTTPError(url, status, "Method Not Allowed", hdrs=None, fp=None)
            # 503/502 等服务端暂时错误不算死链
            if status in (502, 503, 504):
                return True, "", status
            return False, f"HTTP {status}", status
    except HTTPError as e:
        if e.code in (405, 403, 401, 404):
            try:
                req = _make_request(url, method="GET")
                with _safe_urlopen(req, timeout=timeout) as resp:
                    status = getattr(resp, "status", 200)
                    if 200 <= status < 400 or status in (401, 403):
                        return True, "", status
                    if status in (502, 503, 504):
                        return True, "", status
                    return False, f"HTTP {status}", status
            except Exception as e2:
                # GET 也报 SSL/超时，保留链接
                if isinstance(e2, HTTPError) and e2.code in (401, 403):
                    return True, "", e2.code
                e2_str = str(e2)
                if any(h in e2_str for h in ("SSL", "ssl", "handshake", "EOF occurred", "timed out", "UNEXPECTED_EOF", "SSLV3")):
                    return True, "", 0
                return False, f"{type(e2).__name__}: {e2}", 0
        # 502/503 不是死链
        if e.code in (502, 503, 504):
            return True, "", e.code
        return False, f"HTTP {e.code}", int(e.code)
    except (URLError, ValueError, TimeoutError) as e:
        err_str = str(e)
        # SSL 握手/协议错误或超时：链接本身可能有效，只是 Python 与服务器 TLS 不兼容
        ssl_hints = ("SSL", "ssl", "handshake", "HANDSHAKE", "EOF occurred", "timed out", "UNEXPECTED_EOF", "SSLV3")
        if any(h in err_str for h in ssl_hints):
            return True, "", 0
        if isinstance(e, TimeoutError) or "timed out" in err_str.lower():
            return True, "", 0
        return False, f"{type(e).__name__}: {e}", 0
    except Exception as e:
        return False, f"{type(e).__name__}: {e}", 0

def _decode_html_bytes(data: bytes, content_type: str = "") -> str:
    m = re.search(r"charset=([\w\-]+)", content_type, flags=re.IGNORECASE)
    if m:
        enc = m.group(1).strip().strip("\"")
        try:
            return data.decode(enc, errors="ignore")
        except Exception:
            pass
    head = data[:5000]
    m = re.search(rb"charset\s*=\s*['\"]?([\w\-]+)", head, flags=re.IGNORECASE)
    if m:
        enc = m.group(1).decode("ascii", errors="ignore")
        try:
            return data.decode(enc, errors="ignore")
        except Exception:
            pass
    return data.decode("utf-8", errors="ignore")

def _fetch_icon_bytes(url: str, timeout: int) -> Optional[bytes]:
    try:
        req = _make_request(url, method="GET")
        req.add_header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
        with _safe_urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if status >= 400:
                return None
            data = resp.read(MAX_ICON_BYTES)
        return data if data else None
    except Exception:
        return None

def _fetch_page_html(url: str, timeout: int) -> str:
    try:
        req = _make_request(url, method="GET")
        with _safe_urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read(MAX_BYTES_TO_PARSE)
        return _decode_html_bytes(raw, content_type=content_type)
    except Exception:
        return ""

def google_search_link(url: str) -> str:
    q = (url or "").strip()
    if not q:
        return ""
    return "https://www.google.com/search?" + urlencode({"q": q})

def fetch_google_snippet(url: str, timeout: int) -> str:
    """尝试从 Google 搜索结果中抓取该 URL 的第一条摘要 (Snippet)"""
    search_url = google_search_link(url)
    try:
        req = _make_request(search_url, method="GET")
        # 模拟更像真实浏览器的请求
        req.add_header("Referer", "https://www.google.com/")
        with _safe_urlopen(req, timeout=timeout) as resp:
            data = resp.read(200_000)
            html = data.decode("utf-8", errors="ignore")
            
        # 尝试匹配 Google 搜索结果中的摘要部分 (通常在 <div> 中，包含特定类名如 VwiC3b)
        # 注意：Google 的 HTML 结构经常变动，这里使用较通用的正则匹配
        # 寻找包含该 URL 的结果块附近的文字
        snippet_m = re.search(r"<div[^>]+class=\"VwiC3b[^>]+>(.*?)</div>", html, flags=re.IGNORECASE | re.DOTALL)
        if snippet_m:
            snippet = snippet_m.group(1)
            # 清洗 HTML 标签
            snippet = re.sub(r"<.*?>", "", snippet)
            snippet = re.sub(r"\s+", " ", snippet).strip()
            if snippet:
                return snippet
    except Exception:
        pass
    return ""

def _normalize_title(title: str, url: str) -> str:
    t = (title or "").strip()
    if t:
        return t
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path
    return host.strip("/") or url

def build_categories(items: List[BookmarkItem]) -> List[Dict]:
    seen_order: List[str] = []
    by_title: Dict[str, List[BookmarkItem]] = {}

    for it in items:
        cat = it.folder_path.split("/")[-1] if it.folder_path else "未分类"
        cat = cat.strip() or "未分类"
        if cat not in by_title:
            by_title[cat] = []
            seen_order.append(cat)
        by_title[cat].append(it)

    categories: List[Dict] = []
    for cat in seen_order:
        cat_items: List[Dict] = []
        for it in by_title[cat]:
            cat_items.append(
                {
                    "title": _normalize_title(it.title, it.url),
                    "url": it.url,
                    "icon": resolve_item_icon(it.url, it.icon),
                    "hover": it.desc or "",
                    "valid": True,
                }
            )
        categories.append({"title": cat, "items": cat_items})
    return categories

def generate_html_pure(template_path: str, output_path: str, categories: list):
    """安全地读取前端模板，利用字符串替换注入数据，规避了由于正则提取导致样式崩塌的致命Bug"""
    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()
    
    data_json_str = json.dumps({"categories": categories}, ensure_ascii=False, indent=2)
    
    # 将 JSON 数据注入到模板中的占位符位置
    final_html = template_content.replace("INSERT_DATA_HERE", data_json_str)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_html)

def _write_recognized_list(path: str, items: List[BookmarkItem], duration: float) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"识别成功列表（共 {len(items)} 条）\n")
        f.write(f"耗时: {duration:.2f}s\n\n")
        if not items:
            f.write("（无识别成功项）\n")
            return
        for idx, it in enumerate(items, 1):
            title = _normalize_title(it.title, it.url)
            f.write(f"{idx}. {title}\n")
            f.write(f"   分类: {it.folder_path}\n")
            f.write(f"   链接: {it.url}\n")
            f.write(f"   说明: {it.desc}\n")
            f.write(f"   说明来源: {it.hover_source}\n")
            f.write(f"   图标来源: {it.icon_source}\n\n")


def _write_failed_list(path: str, rows: List[Tuple[BookmarkItem, str]], duration: float) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"识别失败列表（共 {len(rows)} 条）\n")
        f.write(f"耗时: {duration:.2f}s\n\n")
        if not rows:
            f.write("（无失败项）\n")
            return
        for idx, (it, reason) in enumerate(rows, 1):
            title = _normalize_title(it.title, it.url)
            f.write(f"{idx}. {title}\n")
            f.write(f"   分类: {it.folder_path}\n")
            f.write(f"   链接: {it.url}\n")
            f.write(f"   原因: {reason}\n\n")


def load_config() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "api_url": "http://127.0.0.1:8081/v1/chat/completions",
        "max_workers": 4,
        "timeout_seconds": 8,
        "max_text_length": 4000
    }

def main():
    config = load_config()
    timeout_seconds = config["timeout_seconds"]

    bookmarks_path = "bookmarks.html"
    template_path = os.path.join("templates", "index.html")
    output_html_path = os.path.join("output", "my_nav.html")
    report_path = os.path.join("output", "report.txt")
    recognized_path = os.path.join("output", "recognized.txt")
    failed_path = os.path.join("output", "failed.txt")

    os.makedirs("output", exist_ok=True)

    if not os.path.exists(bookmarks_path):
        print(f"错误: 未在根目录下找到书签文件 '{bookmarks_path}'，请将导出的书签放入项目根目录。")
        return
    if not os.path.exists(template_path):
        print(f"错误: 未在 'templates/' 下找到前端模板文件 '{template_path}'。")
        return

    print("正在解析书签结构...")
    bookmarks_html = read_text_file(bookmarks_path)
    raw_items = parse_netscape_bookmarks(bookmarks_html)
    print(f"成功导入 {len(raw_items)} 个原始书签！")

    start_time = time.time()
    valid_items: List[BookmarkItem] = []
    invalid_rows: List[Tuple[BookmarkItem, str]] = []

    def process_one(it: BookmarkItem) -> Tuple[BookmarkItem, bool, str]:
        ok, reason, _ = validate_url(it.url, timeout=timeout_seconds)
        if not ok:
            # 解析失败也保留，icon 置空
            it.icon = ""
            it.icon_source = "failed"
            it.desc = it.desc or ""
            it.hover_source = "failed"
            return it, False, reason

        bookmark_icon = it.icon
        html = _fetch_page_html(it.url, timeout=timeout_seconds)

        def fetch_icon(url: str) -> Optional[bytes]:
            return _fetch_icon_bytes(url, timeout=timeout_seconds)

        icon_uri, icon_src = favicon_fetcher.resolve_favicon(
            it.url, html, bookmark_icon, fetch_icon
        )
        it.icon = icon_uri
        it.icon_source = icon_src

        if it.desc.strip():
            it.hover_source = "bookmark"
            return it, True, ""

        if html:
            site_info = ai_client.extract_site_info(html, url=it.url, title=it.title)
            if site_info:
                ai_summary = ai_client.request_gemma_summary(site_info, config, is_full_prompt=False)
                if ai_summary:
                    it.desc = ai_summary
                    it.hover_source = "local_gemma_server"
                    return it, True, ""

        google_snippet = fetch_google_snippet(it.url, timeout=timeout_seconds)
        if google_snippet:
            it.desc = google_snippet
            it.hover_source = "google_snippet"
            return it, True, ""

        it.desc = ""
        it.hover_source = "none"
        return it, True, ""

    print(f"正在开启线程池（并发数: {config['max_workers']}）抓取并交由本地大模型处理...")
    with ThreadPoolExecutor(max_workers=int(config["max_workers"])) as ex:
        futs = [ex.submit(process_one, it) for it in raw_items]
        for idx, fut in enumerate(as_completed(futs), 1):
            it, ok, reason = fut.result()
            if ok:
                valid_items.append(it)
                print(f"[{idx}/{len(raw_items)}] 成功 -> {it.title[:15]} ({it.hover_source}/{it.icon_source})")
            else:
                invalid_rows.append((it, reason))
                valid_items.append(it)  # 失败的也保留，icon 为空
                print(f"[{idx}/{len(raw_items)}] 失败(保留) -> {it.title[:15]} 原因: {reason}")

    valid_items.sort(key=lambda x: x.order)
    invalid_rows.sort(key=lambda r: r[0].order)
    categories = build_categories(valid_items)
    
    print("正在向前端模板安全注入数据...")
    generate_html_pure(template_path, output_html_path, categories)

    duration = time.time() - start_time
    print(f"\n任务全部处理完毕！总耗时: {duration:.2f}秒。")
    
    # 写报告与识别结果文本
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"总计书签: {len(raw_items)}\n有效留存: {len(valid_items)}\n死链剔除: {len(invalid_rows)}\n耗时: {duration:.2f}s\n\n[精选留存数据]\n")
        for it in valid_items:
            f.write(f"- [{it.folder_path}] {it.title} | {it.url} | ({it.hover_source}/{it.icon_source}) {it.desc}\n")

    _write_recognized_list(recognized_path, valid_items, duration)
    _write_failed_list(failed_path, invalid_rows, duration)

    print(f"成果站点已生成在: {output_html_path}")
    print(f"详细处理报告保存在: {report_path}")
    print(f"识别成功列表保存在: {recognized_path}")
    print(f"识别失败列表保存在: {failed_path}")

if __name__ == "__main__":
    main()