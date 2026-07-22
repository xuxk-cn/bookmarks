"""联网抓取站点 favicon，归一化为 64px 并输出 data URI。"""

from __future__ import annotations

import base64
import io
import re
import struct
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

TARGET_SIZE = 64
MAX_ICON_BYTES = 512_000

FetchFn = Callable[[str], Optional[bytes]]


@dataclass
class _IconCandidate:
    data: bytes
    mime: str
    width: int
    height: int
    source: str
    score: int


def favicon_url(url: str, size: int = TARGET_SIZE) -> str:
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path.split("/")[0] or url
    return f"https://www.google.com/s2/favicons?domain={host}&sz={size}"


def _detect_mime(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"\x00\x00\x01\x00"):
        return "image/x-icon"
    return "image/png"


def _png_dimensions(data: bytes) -> Tuple[int, int]:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return 0, 0
    w, h = struct.unpack(">II", data[16:24])
    return int(w), int(h)


def _gif_dimensions(data: bytes) -> Tuple[int, int]:
    if len(data) < 10 or not data.startswith(b"GIF"):
        return 0, 0
    w, h = struct.unpack("<HH", data[6:10])
    return int(w), int(h)


def _jpeg_dimensions(data: bytes) -> Tuple[int, int]:
    if not data.startswith(b"\xff\xd8"):
        return 0, 0
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack(">HH", data[i + 5 : i + 9])
            return int(w), int(h)
        if marker in (0xD8, 0xD9):
            break
        if i + 3 >= len(data):
            break
        seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
        i += 2 + seg_len
    return 0, 0


def _ico_largest_png_or_raw(data: bytes) -> bytes:
    if len(data) < 6 or data[:4] != b"\x00\x00\x01\x00":
        return data
    count = struct.unpack("<H", data[4:6])[0]
    best: Optional[bytes] = None
    best_area = 0
    offset = 6
    for _ in range(count):
        if offset + 16 > len(data):
            break
        w = data[offset] or 256
        h = data[offset + 1] or 256
        size = struct.unpack("<I", data[offset + 8 : offset + 12])[0]
        img_offset = struct.unpack("<I", data[offset + 12 : offset + 16])[0]
        if img_offset + size <= len(data) and w * h > best_area:
            best_area = w * h
            best = data[img_offset : img_offset + size]
        offset += 16
    return best or data


def image_dimensions(data: bytes) -> Tuple[int, int]:
    if not data:
        return 0, 0
    mime = _detect_mime(data)
    if mime == "image/png":
        return _png_dimensions(data)
    if mime == "image/jpeg":
        return _jpeg_dimensions(data)
    if mime == "image/gif":
        return _gif_dimensions(data)
    if mime == "image/x-icon":
        inner = _ico_largest_png_or_raw(data)
        if inner is not data:
            return image_dimensions(inner)
        entry_w = data[6] if len(data) > 6 else 0
        entry_h = data[7] if len(data) > 7 else 0
        return (entry_w or 256, entry_h or 256)
    return 0, 0


def _decode_data_uri(uri: str) -> Optional[Tuple[bytes, str]]:
    uri = (uri or "").strip()
    if not uri.startswith("data:image"):
        return None
    m = re.match(r"data:(image/[^;]+);base64,(.+)", uri, flags=re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    try:
        raw = base64.b64decode(m.group(2), validate=False)
    except Exception:
        return None
    if not raw or len(raw) > MAX_ICON_BYTES:
        return None
    return raw, m.group(1)


def _to_data_uri(data: bytes, mime: str = "image/png") -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _normalize_icon(data: bytes, target: int = TARGET_SIZE) -> Tuple[bytes, str]:
    mime = _detect_mime(data)
    if mime == "image/x-icon":
        data = _ico_largest_png_or_raw(data)
        mime = _detect_mime(data)

    head = data[:200].lstrip()
    if mime == "image/svg+xml" or head.startswith(b"<svg") or head.startswith(b"<?xml"):
        return data, "image/svg+xml"

    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        img = img.convert("RGBA")
        w, h = img.size
        if w <= 0 or h <= 0:
            raise ValueError("invalid image size")
        scale = target / max(w, h)
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        resample = getattr(Image, "Resampling", Image).LANCZOS
        img = img.resize((nw, nh), resample)
        canvas = Image.new("RGBA", (target, target), (255, 255, 255, 0))
        canvas.paste(img, ((target - nw) // 2, (target - nh) // 2), img)
        out = io.BytesIO()
        canvas.save(out, format="PNG", optimize=True)
        return out.getvalue(), "image/png"
    except Exception:
        w, h = image_dimensions(data)
        if w >= target // 2 and h >= target // 2:
            return data, mime
        return data, mime


def _candidate_score(width: int, height: int, source: str) -> int:
    side = max(width, height, 1)
    bonus = {
        "site_link": 40,
        "site_path": 30,
        "bookmark": 15,
        "google": 0,
    }.get(source, 0)
    if source == "bookmark" and side >= 32:
        bonus += 20
    if side >= TARGET_SIZE:
        return side * 10 + bonus + 500
    return side * 10 + bonus


def _add_candidate(
    candidates: List[_IconCandidate],
    data: Optional[bytes],
    source: str,
) -> None:
    if not data or len(data) < 16 or len(data) > MAX_ICON_BYTES:
        return
    mime = _detect_mime(data)
    w, h = image_dimensions(data)
    if w <= 0 or h <= 0:
        w = h = 16
    candidates.append(
        _IconCandidate(
            data=data,
            mime=mime,
            width=w,
            height=h,
            source=source,
            score=_candidate_score(w, h, source),
        )
    )


def _parse_icon_links(html: str, page_url: str) -> List[Tuple[str, int]]:
    if not html:
        return []
    found: List[Tuple[str, int]] = []
    for m in re.finditer(r"<link\b([^>]+)>", html, flags=re.IGNORECASE):
        attrs = m.group(1)
        rel_m = re.search(r"""rel\s*=\s*['"]([^'"]+)['"]""", attrs, flags=re.IGNORECASE)
        if not rel_m:
            continue
        rel = rel_m.group(1).lower()
        if not any(k in rel for k in ("icon", "apple-touch-icon", "shortcut icon")):
            continue
        href_m = re.search(r"""href\s*=\s*['"]([^'"]+)['"]""", attrs, flags=re.IGNORECASE)
        if not href_m:
            continue
        href = urljoin(page_url, href_m.group(1).strip())
        if href.startswith("data:"):
            continue
        size = 0
        sizes_m = re.search(r"""sizes\s*=\s*['"]([^'"]+)['"]""", attrs, flags=re.IGNORECASE)
        if sizes_m:
            for part in sizes_m.group(1).split():
                if "x" in part.lower():
                    try:
                        size = max(size, int(part.lower().split("x", 1)[0]))
                    except ValueError:
                        pass
        if "apple-touch-icon" in rel:
            size = max(size, 180)
        if "icon" in rel and "shortcut" not in rel:
            size = max(size, 32)
        found.append((href, size))

    found.sort(key=lambda x: x[1], reverse=True)
    dedup: List[Tuple[str, int]] = []
    seen = set()
    for href, size in found:
        if href not in seen:
            seen.add(href)
            dedup.append((href, size))
    return dedup


def resolve_favicon(
    page_url: str,
    html: str,
    bookmark_icon: str,
    fetch: FetchFn,
) -> Tuple[str, str]:
    """按优先级联网抓取 favicon，返回 (data_uri 或 URL, source)。"""
    candidates: List[_IconCandidate] = []

    for href, _ in _parse_icon_links(html, page_url):
        _add_candidate(candidates, fetch(href), "site_link")

    parsed = urlparse(page_url)
    if parsed.scheme and parsed.netloc:
        root = f"{parsed.scheme}://{parsed.netloc}"
        for path in (
            "/apple-touch-icon.png",
            "/apple-touch-icon-precomposed.png",
            "/favicon.ico",
            "/favicon.png",
        ):
            _add_candidate(candidates, fetch(urljoin(root, path)), "site_path")

    decoded = _decode_data_uri(bookmark_icon)
    if decoded:
        _add_candidate(candidates, decoded[0], "bookmark")

    if not candidates or max(c.score for c in candidates) < _candidate_score(32, 32, "bookmark"):
        _add_candidate(candidates, fetch(favicon_url(page_url, TARGET_SIZE)), "google")

    if not candidates:
        return favicon_url(page_url, TARGET_SIZE), "google_url"

    best = max(candidates, key=lambda c: c.score)
    normalized, mime = _normalize_icon(best.data, TARGET_SIZE)
    return _to_data_uri(normalized, mime), best.source
