"""
Cloudflare Pages Direct Upload deployment script
Deploys cf-nav-deployer project using CF Pages Direct Upload API
"""

import os
import sys
import json
import hashlib
import base64
import requests

# ── Credentials ──────────────────────────────────────────────────────────────
CF_EMAIL      = ""   # 填入你的 Cloudflare 邮箱
CF_KEY        = ""   # 填入你的 Global API Key
ACCOUNT_ID    = ""   # 填入你的 Account ID
PROJECT_NAME  = "cf-nav-deployer"

# ── File paths ────────────────────────────────────────────────────────────────
DEPLOYER_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_FILES = {
    "/index.html": os.path.join(DEPLOYER_DIR, "index.html"),
    "/styles.css": os.path.join(DEPLOYER_DIR, "styles.css"),
    "/app.js":     os.path.join(DEPLOYER_DIR, "app.js"),
}

# Content type mapping for CF assets upload
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
}
WORKER_FILE = os.path.join(DEPLOYER_DIR, "_worker.js")

# ── Auth headers
# cfk_ prefix → new-format Global API Key (still uses X-Auth-Email + X-Auth-Key)
def make_headers(json_body: bool = False) -> dict:
    h = {
        "X-Auth-Email": CF_EMAIL,
        "X-Auth-Key":   CF_KEY,
    }
    if json_body:
        h["Content-Type"] = "application/json"
    return h

BASE_HEADERS = make_headers()

BASE_URL = "https://api.cloudflare.com/client/v4"

# ─────────────────────────────────────────────────────────────────────────────

def sha256_hex(path: str) -> str:
    """Return lowercase hex SHA-256 of a file's contents."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def file_b64(path: str) -> str:
    """Return base64-encoded contents of a file (for CF assets/upload payload)."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def raise_for_cf(resp: requests.Response, label: str):
    """Raise RuntimeError with CF error detail if the call failed."""
    try:
        data = resp.json()
    except Exception:
        resp.raise_for_status()
        return
    if not data.get("success", True):
        errors = data.get("errors", [])
        raise RuntimeError(f"{label} failed: {errors}")
    if not resp.ok:
        resp.raise_for_status()


# ── Step 1 – Ensure project exists ───────────────────────────────────────────
def ensure_project():
    print(f"[1] Checking / creating Pages project '{PROJECT_NAME}' ...")
    url = f"{BASE_URL}/accounts/{ACCOUNT_ID}/pages/projects"

    # List existing projects
    r = requests.get(url, headers=make_headers())
    raise_for_cf(r, "list projects")
    projects = r.json().get("result", [])
    existing = [p for p in projects if p["name"] == PROJECT_NAME]

    if existing:
        print(f"    Project already exists.")
        return existing[0]

    # Create project
    payload = {
        "name": PROJECT_NAME,
        "production_branch": "main",
    }
    r = requests.post(url, json=payload, headers=make_headers(json_body=True))
    raise_for_cf(r, "create project")
    project = r.json()["result"]
    print(f"    Project created: {project['subdomain']}")
    return project


# ── Step 2 – Get upload JWT token ─────────────────────────────────────────────
def get_upload_token():
    print("[2] Getting upload JWT token ...")
    url = f"{BASE_URL}/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/upload-token"
    r = requests.get(url, headers=make_headers())  # GET, not POST
    raise_for_cf(r, "upload-token")
    jwt = r.json()["result"]["jwt"]
    print(f"    Got JWT (len={len(jwt)})")
    return jwt


# ── Steps 3-6 – Upload static assets via assets API ─────────────────────────
def upload_static_assets(jwt: str) -> dict:
    """
    Returns manifest: { "/path": hash, ... }
    """
    asset_headers = {
        "Authorization": f"Bearer {jwt}",
        "Content-Type":  "application/json",
    }

    # Step 3 – compute hashes
    print("[3] Computing file hashes ...")
    manifest = {}  # path -> hash
    hash_to_path = {}
    for vpath, fpath in STATIC_FILES.items():
        h = sha256_hex(fpath)
        manifest[vpath] = h
        hash_to_path[h] = fpath
        print(f"    {vpath}: {h}")

    # Step 4 – check-missing
    print("[4] Checking which assets are missing on CF ...")
    r = requests.post(
        "https://api.cloudflare.com/client/v4/pages/assets/check-missing",
        headers=asset_headers,
        json={"hashes": list(manifest.values())},
    )
    raise_for_cf(r, "check-missing")
    missing_hashes = r.json().get("result", [])
    print(f"    Missing hashes: {missing_hashes}")

    # Step 5 – upload missing files
    if missing_hashes:
        print("[5] Uploading missing assets ...")
        upload_payload = []
        for h in missing_hashes:
            fpath = hash_to_path[h]
            upload_payload.append({
                "key":   h,
                "value": file_b64(fpath),
                "base64": True,
            })
        r = requests.post(
            "https://api.cloudflare.com/client/v4/pages/assets/upload",
            headers=asset_headers,
            json=upload_payload,
        )
        raise_for_cf(r, "assets/upload")
        print(f"    Upload response: {r.json()}")
    else:
        print("[5] No missing assets, skipping upload.")

    # Step 6 – upsert-hashes
    print("[6] Upserting hashes ...")
    r = requests.post(
        "https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes",
        headers=asset_headers,
        json={"hashes": list(manifest.values())},
    )
    raise_for_cf(r, "upsert-hashes")
    print(f"    Upsert result: {r.json().get('result')}")

    return manifest


# ── Step 7 – Submit deployment (with _worker.bundle) ─────────────────────────
def submit_deployment(jwt: str, manifest: dict):
    print("[7] Submitting deployment ...")

    url = f"{BASE_URL}/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"

    with open(WORKER_FILE, "rb") as f:
        worker_js_bytes = f.read()

    worker_metadata = json.dumps({
        "main_module": "_worker.js",
        "compatibility_date": "2024-09-23",
    })

    # 构建内层 _worker.bundle（用 requests files= 方式，让 requests 处理外层 boundary）
    inner_boundary = "inner" + hashlib.md5(worker_js_bytes[:32]).hexdigest()[:16]

    def build_inner_bundle():
        body = b""
        body += f"--{inner_boundary}\r\n".encode()
        body += b'Content-Disposition: form-data; name="metadata"\r\n'
        body += b"Content-Type: application/json\r\n\r\n"
        body += worker_metadata.encode() + b"\r\n"
        body += f"--{inner_boundary}\r\n".encode()
        body += b'Content-Disposition: form-data; name="_worker.js"; filename="_worker.js"\r\n'
        body += b"Content-Type: application/javascript+module\r\n\r\n"
        body += worker_js_bytes + b"\r\n"
        body += f"--{inner_boundary}--\r\n".encode()
        return body

    bundle_bytes = build_inner_bundle()
    bundle_ct = f"multipart/form-data; boundary={inner_boundary}"

    # 构建外层 POST body（完全手动，避免 requests 修改 boundary）
    outer_boundary = "outer9876543210fedcba"

    def add_part(name, value, ct=None, filename=None):
        part = f"--{outer_boundary}\r\n".encode()
        if filename:
            part += f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
        else:
            part += f'Content-Disposition: form-data; name="{name}"\r\n'.encode()
        if ct:
            part += f"Content-Type: {ct}\r\n".encode()
        part += b"\r\n"
        part += value if isinstance(value, bytes) else value.encode()
        part += b"\r\n"
        return part

    body = b""
    body += add_part("manifest", json.dumps(manifest), ct="application/json")
    body += add_part("branch", "main")
    body += add_part("commit_dirty", "true")
    body += add_part("commit_message", "deploy cf-nav-deployer")
    body += add_part("_worker.bundle", bundle_bytes, ct=bundle_ct, filename="_worker.bundle")
    body += f"--{outer_boundary}--\r\n".encode()

    headers = {
        "X-Auth-Email": CF_EMAIL,
        "X-Auth-Key": CF_KEY,
        "Content-Type": f"multipart/form-data; boundary={outer_boundary}",
    }

    r = requests.post(url, headers=headers, data=body)
    try:
        data = r.json()
    except Exception:
        print(f"    Raw response ({r.status_code}): {r.text[:500]}")
        r.raise_for_status()
        return

    if not data.get("success"):
        errors = data.get("errors", [])
        raise RuntimeError(f"Deployment submission failed: {errors}")

    result = data["result"]
    deployment_id = result.get("id", "?")
    subdomain = result.get("url") or (result.get("aliases") or [""])[0]
    print(f"    Deployment ID: {deployment_id}")
    print(f"    Deployment URL: {subdomain}")
    return result


# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print(f"Deploying to Cloudflare Pages: {PROJECT_NAME}")
    print("=" * 60)

    try:
        project  = ensure_project()
        jwt      = get_upload_token()
        manifest = upload_static_assets(jwt)
        result   = submit_deployment(jwt, manifest)

        print()
        print("=" * 60)
        print("Deployment complete!")
        subdomain = result.get("url") or ""
        aliases   = result.get("aliases") or []
        if subdomain:
            print(f"  URL: {subdomain}")
        for a in aliases:
            print(f"  Alias: {a}")
        # Fallback: construct from project subdomain
        if not subdomain:
            proj_subdomain = project.get("subdomain", PROJECT_NAME)
            print(f"  Project URL: https://{proj_subdomain}.pages.dev")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
