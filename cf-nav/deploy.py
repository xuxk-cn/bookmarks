"""
cf-nav 官方部署脚本（安全：重部署永不覆盖书签 / 密码 / 设置）

工作原理
--------
- 首次部署：创建 KV 命名空间 + Pages 项目，并把 KV 绑定到变量 NAV_KV，
  然后写入管理员账号、默认设置、空白书签。
- 之后重部署（更新代码）：只要 KV 里已有 nav_data，就【跳过初始化】，
  只更新静态文件与 _worker.js，已有书签/密码/设置完全保留。

用法
----
设置环境变量（Cloudflare 邮箱 + Global API Key）：
    set CF_EMAIL=you@example.com
    set CF_KEY=cfk_xxxxxxxxxxxxxxxx
可选（均有默认值）：
    CF_ACCOUNT_ID   不填则取第一个账户
    CF_PROJECT      项目名，默认 cf-nav
    CF_KV_TITLE     KV 命名空间名，默认 cf-nav-kv
    ADMIN_USER      首次初始化用的管理员名，默认 admin
    ADMIN_PASS      首次初始化用的管理员密码（重部署不需要）
    SITE_NAME       站点名，默认 我的导航

运行：python deploy.py

依赖：pip install requests
"""
import os
import sys
import json
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
import hashlib
import base64
import requests

CF_EMAIL    = os.environ.get("CF_EMAIL", "")
CF_KEY      = os.environ.get("CF_KEY", "")
ACCOUNT_ID  = os.environ.get("CF_ACCOUNT_ID", "")
PROJECT_NAME = os.environ.get("CF_PROJECT", "cf-nav")
KV_TITLE    = os.environ.get("CF_KV_TITLE", "cf-nav-kv")
ADMIN_USER  = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS  = os.environ.get("ADMIN_PASS", "")
SITE_NAME   = os.environ.get("SITE_NAME", "我的导航")

COMPAT_DATE = "2024-09-23"
KV_BINDING  = "NAV_KV"

RELEASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "release")
PUBLIC_DIR  = os.path.join(RELEASE_DIR, "public")
WORKER_FILE = os.path.join(RELEASE_DIR, "dist", "_worker.js")

BASE = "https://api.cloudflare.com/client/v4"
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".ico":  "image/x-icon",
}


def log(m):
    print(m)


def cf_api(method, path, json_body=None, raw_body=None, ct=None):
    h = {"X-Auth-Email": CF_EMAIL, "X-Auth-Key": CF_KEY}
    data = None
    if json_body is not None:
        h["Content-Type"] = "application/json"
        data = json.dumps(json_body).encode()
    elif raw_body is not None:
        h["Content-Type"] = ct or "application/json"
        data = raw_body
    r = requests.request(method, BASE + path, headers=h, data=data)
    return r


def get_account_id():
    global ACCOUNT_ID
    if not ACCOUNT_ID:
        r = cf_api("GET", "/accounts?per_page=50")
        r.raise_for_status()
        accs = r.json().get("result", [])
        if not accs:
            raise RuntimeError("没有可用的 Cloudflare 账户")
        ACCOUNT_ID = accs[0]["id"]
        log(f"使用账户: {accs[0]['name']}")
    return ACCOUNT_ID


def kv_get(nsid, key):
    r = cf_api("GET", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{nsid}/values/{key}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.text


def kv_put(nsid, key, value):
    cf_api("PUT", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{nsid}/values/{key}",
           raw_body=value.encode("utf-8"), ct="text/plain; charset=utf-8").raise_for_status()


def create_kv():
    r = cf_api("GET", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces?per_page=100")
    r.raise_for_status()
    existing = [k for k in r.json().get("result", []) if k["title"] == KV_TITLE]
    if existing:
        log(f"复用 KV: {KV_TITLE} ({existing[0]['id']})")
        return existing[0]
    r = cf_api("POST", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces", json_body={"title": KV_TITLE})
    r.raise_for_status()
    kv = r.json()["result"]
    log(f"创建 KV: {KV_TITLE} ({kv['id']})")
    return kv


def safe_init_kv(kv):
    """只有完全没有 nav_data 时才初始化，绝不覆盖已有数据。"""
    if kv_get(kv["id"], "nav_data") is not None:
        log("KV 已有数据，跳过初始化（保留现有书签 / 密码 / 设置）")
        return
    if not ADMIN_PASS:
        raise RuntimeError("首次部署需要提供 ADMIN_PASS（环境变量）来设置管理员密码")
    log("首次初始化 KV ...")
    kv_put(kv["id"], "admin_username", ADMIN_USER)
    kv_put(kv["id"], "admin_password", ADMIN_PASS)
    settings = {
        "siteName": SITE_NAME, "siteDesc": "个人书签导航站", "footerText": "",
        "defaultStyle": "1", "defaultBg": "none", "enableSubmit": False,
        "aiProvider": "workers", "aiModel": "@cf/google/gemma-4-26b-a4b-it",
        "aiApiKey": "", "aiDelay": 1500,
        "faviconApi": "https://faviconsnap.com/api/favicon?url=",
        "sessionTtl": 86400,
    }
    kv_put(kv["id"], "nav_settings", json.dumps(settings))
    kv_put(kv["id"], "nav_data", json.dumps({"categories": []}))
    log(f"初始化完成，管理员: {ADMIN_USER} / {ADMIN_PASS}")


def find_existing_kv():
    """若项目已存在且已绑定 NAV_KV，返回其 namespace_id（重部署时复用，绝不新建/改绑）。"""
    r = cf_api("GET", f"/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    p = r.json().get("result", {})
    kvs = {}
    kvs.update((p.get("latest_deployment") or {}).get("kv_namespaces", {}) or {})
    kvs.update(((p.get("deployment_configs") or {}).get("production") or {}).get("kv_namespaces", {}) or {})
    return kvs.get(KV_BINDING, {}).get("namespace_id")


def create_project(kv):
    env_cfg = {
        "compatibility_date": COMPAT_DATE,
        "kv_namespaces": {KV_BINDING: {"namespace_id": kv["id"]}},
    }
    try:
        cf_api("GET", f"/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}").raise_for_status()
        log("Pages 项目已存在，更新 KV 绑定 ...")
        cf_api("PATCH", f"/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}",
               json_body={"deployment_configs": {"production": env_cfg, "preview": env_cfg}}).raise_for_status()
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            cf_api("POST", f"/accounts/{ACCOUNT_ID}/pages/projects",
                   json_body={"name": PROJECT_NAME, "production_branch": "main",
                              "deployment_configs": {"production": env_cfg, "preview": env_cfg}}).raise_for_status()
            log(f"创建 Pages 项目: {PROJECT_NAME}")
        else:
            raise


# ─── 静态资源上传（与 deployer 一致的哈希算法）─────────────────────
def walk_public():
    out = {}
    for root, _, files in os.walk(PUBLIC_DIR):
        for fn in files:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, PUBLIC_DIR).replace(os.sep, "/")
            out["/" + rel] = full
    return out


def calc_hash(path):
    # 必须与 deployer 的 calcHash 一致: sha256(base64(内容)+扩展名)[:32]
    with open(path, "rb") as f:
        content = f.read()
    b64 = base64.b64encode(content).decode()
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    return hashlib.sha256((b64 + ext).encode()).hexdigest()[:32]


def get_upload_token():
    log("[1] 获取上传令牌 ...")
    r = cf_api("GET", f"/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/upload-token")
    r.raise_for_status()
    return r.json()["result"]["jwt"]


def upload_assets(jwt):
    files = walk_public()
    log(f"[2] 上传 {len(files)} 个静态文件 ...")
    ah = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
    manifest = {}
    paths = list(files.keys())
    batch = 20
    for i in range(0, len(paths), batch):
        grp = paths[i:i + batch]
        info = []
        for p in grp:
            h = calc_hash(files[p])
            manifest[p] = h
            info.append((p, h, files[p]))
        r = requests.post(f"{BASE}/pages/assets/check-missing", headers=ah,
                          json={"hashes": [h for _, h, _ in info]})
        r.raise_for_status()
        missing = set(r.json().get("result", []))
        if missing:
            payload = []
            for p, h, fp in info:
                if h in missing:
                    with open(fp, "rb") as f:
                        b = base64.b64encode(f.read()).decode()
                    ext = os.path.splitext(p)[1].lower()
                    ct = CONTENT_TYPES.get(ext, "application/octet-stream")
                    payload.append({"key": h, "value": b, "metadata": {"contentType": ct}, "base64": True})
            r = requests.post(f"{BASE}/pages/assets/upload", headers=ah, json=payload)
            r.raise_for_status()
            log(f"    本批上传 {len(payload)} 个")
        else:
            log(f"    本批全部已存在，跳过")
        r = requests.post(f"{BASE}/pages/assets/upsert-hashes", headers=ah,
                          json={"hashes": [h for _, h, _ in info]})
        r.raise_for_status()
    return manifest


def submit_deployment(jwt, manifest):
    log("[3] 提交部署 ...")
    with open(WORKER_FILE, "rb") as f:
        worker_bytes = f.read()
    # 与 deployer 的 buildWorkerBundle 完全一致：
    # metadata 无 Content-Type；模块名 worker.js；类型 application/javascript+module
    meta = json.dumps({"main_module": "worker.js", "compatibility_date": COMPAT_DATE})
    inner = "----WebKitFormBoundary" + hashlib.md5(worker_bytes[:32]).hexdigest()[:16]

    def part(name, value, ct=None, fn=None, headers_only_ct=True):
        p = f"--{inner}\r\n".encode()
        if fn:
            p += f'Content-Disposition: form-data; name="{name}"; filename="{fn}"\r\n'.encode()
        else:
            p += f'Content-Disposition: form-data; name="{name}"\r\n'.encode()
        if ct and headers_only_ct:
            p += f"Content-Type: {ct}\r\n".encode()
        p += b"\r\n"
        p += value if isinstance(value, bytes) else value.encode()
        p += b"\r\n"
        return p

    bundle = b""
    bundle += part("metadata", meta)                      # FormData 字符串字段不带 Content-Type
    bundle += part("worker.js", worker_bytes,
                   ct="application/javascript+module", fn="worker.js")
    bundle += f"--{inner}--\r\n".encode()
    bct = f"multipart/form-data; boundary={inner}"

    outer = "----cfnavdeploy" + hashlib.md5(os.urandom(16)).hexdigest()

    def add(name, value, ct=None, fn=None):
        p = f"--{outer}\r\n".encode()
        if fn:
            p += f'Content-Disposition: form-data; name="{name}"; filename="{fn}"\r\n'.encode()
        else:
            p += f'Content-Disposition: form-data; name="{name}"\r\n'.encode()
        if ct:
            p += f"Content-Type: {ct}\r\n".encode()
        p += b"\r\n"
        p += value if isinstance(value, bytes) else value.encode()
        p += b"\r\n"
        return p

    body  = add("manifest", json.dumps(manifest), ct="application/json")
    body += add("branch", "main")
    body += add("commit_dirty", "true")
    body += add("commit_message", "deploy cf-nav")
    body += add("_worker.bundle", bundle, ct=bct, fn="_worker.bundle")
    body += f"--{outer}--\r\n".encode()
    h = {"X-Auth-Email": CF_EMAIL, "X-Auth-Key": CF_KEY,
         "Content-Type": f"multipart/form-data; boundary={outer}"}
    r = requests.post(
        f"{BASE}/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments",
        headers=h, data=body)
    try:
        data = r.json()
    except Exception:
        print(r.text[:500]); r.raise_for_status(); return
    if not data.get("success"):
        raise RuntimeError(f"部署失败: {data.get('errors')}")
    res = data["result"]
    log(f"部署完成! ID={res.get('id')}  URL={res.get('url') or ('https://' + PROJECT_NAME + '.pages.dev')}")


def main():
    if not CF_EMAIL or not CF_KEY:
        print("请设置环境变量 CF_EMAIL 和 CF_KEY"); sys.exit(1)
    if not os.path.isdir(PUBLIC_DIR):
        print(f"找不到 {PUBLIC_DIR}，请在 cf-nav 根目录运行"); sys.exit(1)
    if not os.path.isfile(WORKER_FILE):
        print(f"找不到 {WORKER_FILE}，请先构建（esbuild 打包 functions/worker-entry.js）"); sys.exit(1)
    get_account_id()
    existing_kv = find_existing_kv()
    if existing_kv:
        kv = {"id": existing_kv}
        log(f"复用已有项目 {PROJECT_NAME} 的 NAV_KV 绑定 ({existing_kv})")
    else:
        kv = create_kv()
        create_project(kv)
    safe_init_kv(kv)
    jwt = get_upload_token()
    manifest = upload_assets(jwt)
    submit_deployment(jwt, manifest)
    log(f"\n完成。访问: https://{PROJECT_NAME}.pages.dev  （后台: /admin）")


if __name__ == "__main__":
    main()
