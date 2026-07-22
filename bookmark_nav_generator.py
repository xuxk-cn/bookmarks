import argparse
import json
import os
import re
import ssl
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from bookmark_parser import resolve_item_icon


@dataclass
class BookmarkItem:
    title: str
    url: str
    icon: str
    folder_path: str
    order: int
    desc: str = ""
    hover_source: str = ""


DEFAULT_TIMEOUT_SECONDS = 8
MAX_BYTES_TO_PARSE = 200_000
DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def _read_text(path: str) -> str:
    with open(path, "rb") as f:
        raw = f.read()
    for enc in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def _extract_between(text: str, start_pat: str, end_pat: str) -> str:
    s = re.search(start_pat, text, flags=re.IGNORECASE | re.DOTALL)
    if not s:
        return ""
    e = re.search(end_pat, text[s.end() :], flags=re.IGNORECASE | re.DOTALL)
    if not e:
        return ""
    return text[s.end() : s.end() + e.start()]


def parse_netscape_bookmarks(bookmarks_html: str) -> List[BookmarkItem]:
    token_re = re.compile(
        r"(?P<h3><H3\b[^>]*>.*?</H3>)"
        r"|(?P<a><A\b[^>]*>.*?</A>)"
        r"|(?P<dl_open><DL\b[^>]*>)"
        r"|(?P<dl_close></DL>)"
        r"|(?P<dd><DD\b[^>]*>[^<]*)",
        flags=re.IGNORECASE | re.DOTALL,
    )

    stack: List[Tuple[str, str]] = []
    pending_folder: Optional[str] = None
    last_item: Optional[BookmarkItem] = None
    items: List[BookmarkItem] = []
    order_counter = 0

    def current_path() -> str:
        if not stack:
            return ""
        return stack[-1][1]

    for m in token_re.finditer(bookmarks_html):
        if m.group("h3"):
            name = re.sub(r"<.*?>", "", m.group("h3"), flags=re.DOTALL).strip()
            pending_folder = name
            last_item = None
            continue

        if m.group("dl_open"):
            if pending_folder is not None:
                parent_path = stack[-1][1] if stack else ""
                full_path = pending_folder if not parent_path else f"{parent_path}/{pending_folder}"
                stack.append((pending_folder, full_path))
                pending_folder = None
            last_item = None
            continue

        if m.group("dl_close"):
            if stack:
                stack.pop()
            pending_folder = None
            last_item = None
            continue

        if m.group("a"):
            a_tag = m.group("a")
            href_m = re.search(r"\bHREF=\"([^\"]+)\"", a_tag, flags=re.IGNORECASE)
            if not href_m:
                continue
            url = href_m.group(1).strip()

            icon_m = re.search(r"\bICON=\"([^\"]+)\"", a_tag, flags=re.IGNORECASE)
            icon = icon_m.group(1).strip() if icon_m else ""

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

        if m.group("dd"):
            if last_item is not None:
                desc = re.sub(r"^<DD\b[^>]*>", "", m.group("dd"), flags=re.IGNORECASE).strip()
                if desc:
                    last_item.desc = desc
            continue

    return items


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
    return urlopen(req, timeout=timeout, context=ctx)


def validate_url(url: str, timeout: int) -> Tuple[bool, str, int]:
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
        if e.code in (405, 403, 401):
            try:
                req = _make_request(url, method="GET")
                with _safe_urlopen(req, timeout=timeout) as resp:
                    status = getattr(resp, "status", 200)
                    if 200 <= status < 400 or status in (401, 403):
                        return True, "", status
                    return False, f"HTTP {status}", status
            except Exception as e2:  # noqa: BLE001
                return False, f"{type(e2).__name__}: {e2}", 0
        return False, f"HTTP {e.code}", int(e.code)
    except (URLError, ValueError, TimeoutError) as e:
        return False, f"{type(e).__name__}: {e}", 0
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}", 0


def _decode_html_bytes(data: bytes, content_type: str = "") -> str:
    m = re.search(r"charset=([\w\-]+)", content_type, flags=re.IGNORECASE)
    if m:
        enc = m.group(1).strip().strip("\"")
        try:
            return data.decode(enc, errors="ignore")
        except Exception:  # noqa: BLE001
            pass

    head = data[:5000]
    m = re.search(rb"charset\s*=\s*['\"]?([\w\-]+)", head, flags=re.IGNORECASE)
    if m:
        enc = m.group(1).decode("ascii", errors="ignore")
        try:
            return data.decode(enc, errors="ignore")
        except Exception:  # noqa: BLE001
            pass

    return data.decode("utf-8", errors="ignore")


def _looks_like_cloudflare_challenge(title: str, desc: str, html: str) -> bool:
    t = (title or "").lower()
    d = (desc or "").lower()
    if "just a moment" in t or "attention required" in t or "cloudflare" in t:
        return True
    if "just a moment" in d or "attention required" in d or "cloudflare" in d:
        return True
    h = (html or "")[:8000].lower()
    if "cf-challenge" in h or "cf_turnstile" in h or "cf-verify" in h:
        return True
    if "challenge-platform" in h and "cloudflare" in h:
        return True
    return False


def fetch_hover_text(url: str, timeout: int) -> str:
    try:
        req = _make_request(url, method="GET")
        with _safe_urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if status >= 400:
                return ""
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read(MAX_BYTES_TO_PARSE)

        html = _decode_html_bytes(raw, content_type=content_type)

        title_m = re.search(r"<title\b[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        title = ""
        if title_m:
            title = re.sub(r"\s+", " ", re.sub(r"<.*?>", "", title_m.group(1))).strip()

        desc_m = re.search(
            r"<meta\b[^>]*(?:name=\"description\"|property=\"og:description\")[^>]*content=\"(.*?)\"",
            html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        desc = ""
        if desc_m:
            desc = re.sub(r"\s+", " ", re.sub(r"<.*?>", "", desc_m.group(1))).strip()

        if _looks_like_cloudflare_challenge(title=title, desc=desc, html=html):
            return ""

        text = desc or title
        text = text.strip()
        if not text:
            return ""
        if len(text) > 180:
            text = text[:180].rstrip() + "…"
        return text
    except Exception:  # noqa: BLE001
        return ""


def _contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def _looks_mostly_english(text: str) -> bool:
    s = (text or "").strip()
    if not s:
        return False
    if _contains_cjk(s):
        return False
    if re.search(r"^https?://", s, flags=re.IGNORECASE):
        return False
    letters = len(re.findall(r"[A-Za-z]", s))
    if letters < 8:
        return False
    ratio = letters / max(1, len(s))
    return ratio >= 0.25


def translate_to_zh(text: str, timeout: int) -> str:
    s = (text or "").strip()
    if not s:
        return ""
    if not _looks_mostly_english(s):
        return s

    try:
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": "zh-CN",
            "dt": "t",
            "q": s,
        }
        req_url = "https://translate.googleapis.com/translate_a/single?" + urlencode(params)
        req = Request(
            req_url,
            headers={
                "User-Agent": DEFAULT_UA,
                "Accept": "application/json",
                "Connection": "close",
            },
        )
        with _safe_urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if status >= 400:
                return s
            raw = resp.read(200_000)
        data = json.loads(raw.decode("utf-8", errors="ignore"))
        parts = []
        for seg in (data[0] or []):
            if seg and isinstance(seg, list) and seg[0]:
                parts.append(str(seg[0]))
        out = "".join(parts).strip()
        return out or s
    except Exception:  # noqa: BLE001
        return s


def google_search_link(url: str) -> str:
    q = (url or "").strip()
    if not q:
        return ""
    return "https://www.google.com/search?" + urlencode({"q": q})


def google_search_snippet(url: str, api_key: str, cx: str, timeout: int) -> str:
    api_key = (api_key or "").strip()
    cx = (cx or "").strip()
    if not api_key or not cx:
        return ""

    try:
        query = url
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "num": 1,
            "fields": "items(snippet)",
        }
        req_url = "https://www.googleapis.com/customsearch/v1?" + urlencode(params)
        req = Request(
            req_url,
            headers={
                "User-Agent": DEFAULT_UA,
                "Accept": "application/json",
                "Connection": "close",
            },
        )
        with _safe_urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if status >= 400:
                return ""
            raw = resp.read(200_000)
        data = json.loads(raw.decode("utf-8", errors="ignore"))
        items = data.get("items") or []
        if not items:
            return ""
        snippet = (items[0].get("snippet") or "").strip()
        snippet = re.sub(r"\s+", " ", snippet)
        if len(snippet) > 180:
            snippet = snippet[:180].rstrip() + "…"
        return snippet
    except Exception:  # noqa: BLE001
        return ""


def _normalize_title(title: str, url: str) -> str:
    t = (title or "").strip()
    if t:
        return t
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path
    host = host.strip("/")
    return host or url


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


def generate_html(template_index_html: str, categories: List[Dict]) -> str:
    style = _extract_between(template_index_html, r"<style\b[^>]*>", r"</style>")
    if not style:
        style = ""

    data_json = json.dumps({"categories": categories}, ensure_ascii=False, indent=2)

    return f"""<!DOCTYPE html>
<html lang=\"zh-CN\">
<head>
<meta charset=\"UTF-8\">
<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
<title>我的导航</title>
<style>
{style}
</style>
</head>
<body>

<header>
  <h1>我的导航</h1>
  <nav class=\"navbar\" id=\"nav\"></nav>
</header>

<div class=\"search-box\">
  <input type=\"text\" id=\"search\" placeholder=\"搜索...\">
</div>

<div id=\"main\" class=\"container\"></div>

<script id=\"data\" type=\"application/json\">
{data_json}
</script>

<script>
const data = JSON.parse(document.getElementById('data').textContent);
const main = document.getElementById('main');
const nav = document.getElementById('nav');
const search = document.getElementById('search');

const tooltip = document.createElement('div');
tooltip.style.position = 'fixed';
tooltip.style.background = 'rgba(0,0,0,0.8)';
tooltip.style.color = '#fff';
tooltip.style.padding = '6px 10px';
tooltip.style.borderRadius = '4px';
tooltip.style.fontSize = '12px';
tooltip.style.maxWidth = '260px';
tooltip.style.pointerEvents = 'none';
tooltip.style.zIndex = '9999';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

const TOOLTIP_OFFSET_X = 22;
const TOOLTIP_OFFSET_Y = 32;

function getDescription(item){{
  if (item.hover && String(item.hover).trim()) return String(item.hover).trim();
  if (item.desc && String(item.desc).trim()) return String(item.desc).trim();
  if (item.title && String(item.title).trim()) return `【${{String(item.title).trim()}}】相关站点，点击可在新窗口打开。`;
  return `收藏站点，点击可在新窗口打开：${{item.url}}`;
}}

let currentCat = null;
data.categories.forEach((cat, idx)=>{{
  const btn = document.createElement('button');
  btn.textContent = cat.title;
  btn.onclick = ()=>switchCategory(cat.title, btn);
  if(idx===0){{btn.classList.add('active'); currentCat = cat.title;}}
  nav.appendChild(btn);
}});

function switchCategory(title, btn){{
  document.querySelectorAll('.navbar button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentCat = title;
  render();
}}

function render(){{
  main.innerHTML='';
  const cat = data.categories.find(c=>c.title===currentCat);
  if(!cat) return;
  cat.items.forEach(item=>{{
    const div=document.createElement('div');
    div.className='card';
    div.onclick=()=>window.open(item.url,'_blank');
    div.innerHTML=`<img src="${{item.icon||'https://www.google.com/s2/favicons?domain='+new URL(item.url).hostname+'&sz=64'}}" alt="">
                   <div>${{item.title}}</div>`;

    div.addEventListener('mouseenter', (e)=>{{
      tooltip.textContent = getDescription(item);
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + TOOLTIP_OFFSET_X) + 'px';
      tooltip.style.top = (e.clientY + TOOLTIP_OFFSET_Y) + 'px';
    }});
    div.addEventListener('mousemove', (e)=>{{
      tooltip.style.left = (e.clientX + TOOLTIP_OFFSET_X) + 'px';
      tooltip.style.top = (e.clientY + TOOLTIP_OFFSET_Y) + 'px';
    }});
    div.addEventListener('mouseleave', ()=>{{
      tooltip.style.display = 'none';
    }});

    main.appendChild(div);
  }});
}}

search.addEventListener('input', e=>{{
  const val=e.target.value.toLowerCase();
  document.querySelectorAll('.card').forEach(c=>{{
    c.style.display=c.textContent.toLowerCase().includes(val)?'':'none';
  }});
}});

render();
</script>
</body>
</html>
"""


def main_cli(argv: List[str]) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--bookmarks", default="bookmarks.html")
    p.add_argument("--template", default="index.html")
    p.add_argument("--output-html", default="generated_from_bookmarks.html")
    p.add_argument("--report", default="report.txt")
    p.add_argument("--max-workers", type=int, default=16)
    p.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    p.add_argument("--validate-links", action="store_true")
    p.add_argument("--no-hover-fetch", action="store_true")
    p.add_argument("--google-api-key", default="")
    p.add_argument("--google-cx", default="")
    p.add_argument("--no-google-fallback", action="store_true")
    p.add_argument("--no-translate-hover", action="store_true")
    args = p.parse_args(argv)

    timeout_seconds = max(1, int(args.timeout))

    base_dir = os.getcwd()
    bookmarks_path = os.path.abspath(os.path.join(base_dir, args.bookmarks))
    template_path = os.path.abspath(os.path.join(base_dir, args.template))
    output_html_path = os.path.abspath(os.path.join(base_dir, args.output_html))
    report_path = os.path.abspath(os.path.join(base_dir, args.report))

    if not os.path.exists(bookmarks_path):
        print(f"bookmarks not found: {bookmarks_path}", file=sys.stderr)
        return 2
    if not os.path.exists(template_path):
        print(f"template not found: {template_path}", file=sys.stderr)
        return 2

    bookmarks_html = _read_text(bookmarks_path)
    template_html = _read_text(template_path)

    raw_items = parse_netscape_bookmarks(bookmarks_html)

    start = time.time()

    valid_items: List[BookmarkItem] = []
    invalid_rows: List[Tuple[BookmarkItem, str]] = []

    def process_one(it: BookmarkItem) -> Tuple[BookmarkItem, bool, str]:
        def maybe_translate_desc() -> None:
            if args.no_translate_hover:
                return
            if it.hover_source == "google_link":
                return
            if not it.desc.strip():
                return
            it.desc = translate_to_zh(it.desc, timeout=timeout_seconds)

        if args.validate_links:
            ok, reason, status = validate_url(it.url, timeout=timeout_seconds)
            if not ok:
                return it, False, reason

        existing = it.desc.strip()
        if existing:
            it.desc = existing
            it.hover_source = "bookmark"
            maybe_translate_desc()
            return it, True, ""

        if args.no_hover_fetch:
            return it, True, ""

        hover = fetch_hover_text(it.url, timeout=timeout_seconds)
        if hover:
            it.desc = hover
            it.hover_source = "web"
            maybe_translate_desc()
            return it, True, ""

        if not args.no_google_fallback:
            snippet = ""
            if args.google_api_key and args.google_cx:
                snippet = google_search_snippet(
                    it.url,
                    api_key=args.google_api_key,
                    cx=args.google_cx,
                    timeout=timeout_seconds,
                )
            if snippet:
                it.desc = snippet
                it.hover_source = "google_api"
                maybe_translate_desc()
                return it, True, ""

            link = google_search_link(it.url)
            if link:
                it.desc = f"Google 搜索：{link}"
                it.hover_source = "google_link"
        return it, True, ""

    with ThreadPoolExecutor(max_workers=max(1, int(args.max_workers))) as ex:
        futs = [ex.submit(process_one, it) for it in raw_items]
        for fut in as_completed(futs):
            it, ok, reason = fut.result()
            if ok:
                valid_items.append(it)
            else:
                invalid_rows.append((it, reason))

    valid_items.sort(key=lambda x: x.order)

    categories = build_categories(valid_items)
    html_out = generate_html(template_html, categories)

    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_out)

    duration = time.time() - start

    kept = len(valid_items)
    dropped = len(invalid_rows)

    invalid_rows.sort(key=lambda r: r[0].order)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"Input: {bookmarks_path}\n")
        f.write(f"Template: {template_path}\n")
        f.write(f"Output: {output_html_path}\n")
        f.write(f"Validation: {'enabled' if args.validate_links else 'skipped'}\n")
        f.write(f"Total: {len(raw_items)}\n")
        f.write(f"Kept(valid): {kept}\n")
        f.write(f"Dropped(invalid): {dropped}\n")
        f.write(f"Time: {duration:.2f}s\n")
        f.write("\n")

        if args.validate_links:
            f.write("[DROPPED]\n")
            for it, reason in invalid_rows:
                f.write(f"- [{it.folder_path}] {it.url} | {reason}\n")

        f.write("\n[KEPT]\n")
        for it in valid_items:
            title = _normalize_title(it.title, it.url)
            hover = (it.desc or "").replace("\n", " ").strip()
            src = (it.hover_source or "").strip()
            if hover:
                if src:
                    f.write(f"- [{it.folder_path}] {title} | {it.url} | ({src}) {hover}\n")
                else:
                    f.write(f"- [{it.folder_path}] {title} | {it.url} | {hover}\n")
            else:
                f.write(f"- [{it.folder_path}] {title} | {it.url}\n")

    print(f"Wrote: {output_html_path}")
    print(f"Report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli(sys.argv[1:]))
