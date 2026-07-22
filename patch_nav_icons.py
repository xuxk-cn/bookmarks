import json
import re
import sys

from bookmark_parser import resolve_item_icon


def patch_html(path: str) -> int:
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    m = re.search(
        r'(<script id="data" type="application/json">\s*)(.*?)(\s*</script>)',
        html,
        re.DOTALL,
    )
    if not m:
        raise SystemExit(f"data block not found in {path}")

    data = json.loads(m.group(2))
    changed = 0
    for cat in data.get("categories", []):
        for item in cat.get("items", []):
            old = item.get("icon", "")
            new = resolve_item_icon(item["url"], old)
            if old != new:
                changed += 1
            item["icon"] = new

    new_json = json.dumps(data, ensure_ascii=False, indent=2)
    new_html = html[: m.start(2)] + new_json + html[m.end(2) :]
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    return changed


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "output/my_nav.html"
    n = patch_html(target)
    print(f"patched {n} icons in {target}")
