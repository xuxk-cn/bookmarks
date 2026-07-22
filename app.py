import json
import os
import re
import ssl
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

# 导入自定义的本地模块
import ai_client
from bookmark_parser import BookmarkItem, parse_netscape_bookmarks, read_text_file, resolve_item_icon

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
MAX_BYTES_TO_PARSE = 200_000

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

def _safe_urlopen(req: Request, timeout: int):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # 略过SSL证书校验，提高抓取通过率
    return urlopen(req, timeout=timeout, context=ctx)

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
            return False, f"HTTP {status}", status
    except HTTPError as e:
        if e.code in (405, 403, 401, 404):
            try:
                req = _make_request(url, method="GET")
                with _safe_urlopen(req, timeout=timeout) as resp:
                    status = getattr(resp, "status", 200)
                    if 200 <= status < 400 or status in (401, 403):
                        return True, "", status
                    return False, f"HTTP {status}", status
            except Exception as e2:
                # 🔴 关键修复：如果 GET 请求也报错，但错误码是 403 或 401，
                # 说明链接是存在的，只是服务器防火墙（如 Cloudflare）拦截了 Python 爬虫。
                # 这种情况下不应将其视为“死链”，而应允许其保留在导航页中。
                if isinstance(e2, HTTPError) and e2.code in (401, 403):
                    return True, "", e2.code
                return False, f"{type(e2).__name__}: {e2}", 0
        return False, f"HTTP {e.code}", int(e.code)
    except (URLError, ValueError, TimeoutError) as e:
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
        # 1. 默认先进行链接连通性及死链验证 (可在原有逻辑基础上选择性开关)
        ok, reason, _ = validate_url(it.url, timeout=timeout_seconds)
        if not ok:
            return it, False, reason

        # 2. 如果书签原本就已经自带了非空的有效简介，保留之
        if it.desc.strip():
            it.hover_source = "bookmark"
            return it, True, ""

        # 3. 网络并发抓取源码
        try:
            req = _make_request(it.url, method="GET")
            with _safe_urlopen(req, timeout=timeout_seconds) as resp:
                content_type = resp.headers.get("Content-Type", "")
                raw = resp.read(MAX_BYTES_TO_PARSE)
            html = _decode_html_bytes(raw, content_type=content_type)
        except Exception:
            html = ""

        # 4. 🔴 核心演进：若源码抓取成功，优先投递给本地大模型获取精准摘要
        if html:
            ai_summary = ai_client.request_gemma_summary(html, config)
            if ai_summary:
                it.desc = ai_summary
                it.hover_source = "local_gemma_server"
                return it, True, ""

        # 5. 🟢 优化：若直接抓取失败或 AI 提取失败，尝试从 Google 搜索结果中获取摘要
        google_snippet = fetch_google_snippet(it.url, timeout=timeout_seconds)
        if google_snippet:
            it.desc = google_snippet
            it.hover_source = "google_snippet"
            return it, True, ""

        # 6. 🟡 智能兜底：利用 AI 根据标题和 URL 推测站点功能（优化版）
        guess_prompt = (
            f"你是一个书签助手。请根据以下网站信息，给出一句 15-30 字的中文说明，描述其核心功能。\n"
            f"网站标题：{it.title}\n"
            f"网址：{it.url}\n"
            f"请直接给出描述，不要包含任何前缀。"
        )
        ai_guess = ai_client.request_gemma_summary(guess_prompt, config, is_full_prompt=True)
        if ai_guess and len(ai_guess) > 5 and "错误" not in ai_guess:
            it.desc = ai_guess
            it.hover_source = "ai_inference"
            return it, True, ""

        # 7. 最终方案：若以上全部失败，提供简洁的默认说明
        it.desc = f"优质收藏站点：{it.title}。点击即可访问。"
        it.hover_source = "default_text"
        return it, True, ""

    print(f"正在开启线程池（并发数: {config['max_workers']}）抓取并交由本地大模型处理...")
    with ThreadPoolExecutor(max_workers=int(config["max_workers"])) as ex:
        futs = [ex.submit(process_one, it) for it in raw_items]
        for idx, fut in enumerate(as_completed(futs), 1):
            it, ok, reason = fut.result()
            if ok:
                valid_items.append(it)
                print(f"[{idx}/{len(raw_items)}] 成功 -> {it.title[:15]} ({it.hover_source})")
            else:
                invalid_rows.append((it, reason))
                print(f"[{idx}/{len(raw_items)}] 失败 -> {it.title[:15]} 原因: {reason}")

    valid_items.sort(key=lambda x: x.order)
    categories = build_categories(valid_items)
    
    print("正在向前端模板安全注入数据...")
    generate_html_pure(template_path, output_html_path, categories)

    duration = time.time() - start_time
    print(f"\n任务全部处理完毕！总耗时: {duration:.2f}秒。")
    
    # 写报告
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"总计书签: {len(raw_items)}\n有效留存: {len(valid_items)}\n死链剔除: {len(invalid_rows)}\n耗时: {duration:.2f}s\n\n[精选留存数据]\n")
        for it in valid_items:
            f.write(f"- [{it.folder_path}] {it.title} | {it.url} | ({it.hover_source}) {it.desc}\n")

    print(f"成果站点已生成在: {output_html_path}")
    print(f"详细处理报告保存在: {report_path}")

if __name__ == "__main__":
    main()
def generate_html_pure(template_path: str, output_path: str, categories: list):
    """安全读取前端模板，通过独一无二的占位符将数据和完整的精美 UI 融合"""
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()
    except Exception as e:
        print(f"读取前端模板失败，请检查路径: {template_path}, 错误: {e}")
        return

    # 将分类数据转化为安全的 JSON 字符串
    data_json_str = json.dumps({"categories": categories}, ensure_ascii=False, indent=2)
    
    # 🔴 关键核心：将前端模板中的占位符直接替换为真实数据，同时保留所有 CSS 样式和 JS 渲染逻辑！
    if "" in template_content:
        final_html = template_content.replace("", data_json_str)
    else:
        # 如果模板里找不到占位符，做个健壮性兼容兜底
        print("警告: 未在模板中找到特定的占位符，将尝试默认注入到 body...")
        final_html = template_content.replace('</script>', f'\nconst data = {data_json_str};\n</script>', 1)
    
    # 写入最终的成品导航网页
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_html)
    print(f"✨ 现代化导航页面成功生成至: {output_path}")