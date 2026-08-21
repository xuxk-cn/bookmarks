# cf-nav 部署指南

cf-nav 是一个可一键部署到 Cloudflare Pages 的个人书签导航站。本仓库自带官方部署脚本 `deploy.py`，**重部署不会清空你的书签、登录密码和设置**。

> ⚠️ 不要用仓库里的 `deployer/`（cf-nav-deployer）做“更新代码”式的重部署——它的 `initKV` 会在每次部署时把 `nav_data` 和 `admin_password` 重置为空。首次初始化可以用它，但**代码更新请一律用本脚本**。

## 一、准备

1. 一个 Cloudflare 账号（免费版即可）。
2. Cloudflare **Global API Key**（不是 API Token）：
   登录 CF → 右上角头像 → My Profile → API Tokens → 底部 **Global API Key** → View。
3. 本地装好 Python 3，并安装依赖：
   ```bash
   pip install requests
   ```
4. 已构建好部署产物（见下方“构建”）。`release/` 目录下应有 `public/`、`functions/`、`dist/_worker.js`。

## 二、构建（仅改了 functions/ 或 public/ 后才需要）

部署用的是 esbuild 打包后的单文件 `release/dist/_worker.js`，以及 `release/public/` 下的静态资源。

```bash
# 在项目根目录执行
npx esbuild functions/worker-entry.js --bundle --format=esm --outfile=release/dist/_worker.js
```

> 如果你只改了 `public/` 下的静态文件（如 admin 页面、CSS），也需要重新把对应文件同步进 `release/public/`。

## 三、部署 / 更新

设置环境变量后运行脚本即可。脚本会自动：创建 KV + Pages 项目并绑定 `NAV_KV` → 首次写入管理员账号 → 上传静态资源与 Worker → 提交部署。

### 首次部署

```bash
set CF_EMAIL=you@example.com
set CF_KEY=cfk_xxxxxxxxxxxxxxxx
set CF_PROJECT=cf-nav            # 可选，项目名，默认 cf-nav
set CF_KV_TITLE=cf-nav-kv       # 可选，KV 命名空间名，默认 cf-nav-kv
set ADMIN_USER=admin            # 可选，默认 admin
set ADMIN_PASS=你的密码          # 必填（仅首次初始化需要）
set SITE_NAME=我的导航           # 可选

python deploy.py
```

运行完会输出访问地址：`https://<CF_PROJECT>.pages.dev`（后台在 `/admin`）。

### 更新代码（重部署）

之后任何一次代码更新，**只需要前两个变量**，不要带 `ADMIN_PASS`（带也没关系，脚本检测到已有数据会自动跳过初始化，不会覆盖）：

```bash
set CF_EMAIL=you@example.com
set CF_KEY=cfk_xxxxxxxxxxxxxxxx
set CF_PROJECT=cf-nav
python deploy.py
```

脚本检测到 KV 里已有 `nav_data`，会跳过初始化，**原有书签 / 密码 / 设置全部保留**。

## 四、自定义

- 改外观/栏目/书签：登录后台 `/admin` 操作，数据存在 KV，不受重部署影响。
- 多个项目：用不同的 `CF_PROJECT` + `CF_KV_TITLE` 即可部署多份互不干扰的实例。
- 换账户：设置 `CF_ACCOUNT_ID`（否则取第一个账户）。

## 五、常见问题

- **部署后 CSS/JS 报 500**：几乎都是没重新构建 `dist/_worker.js`，或 `release/public/` 与源码不同步。重新 esbuild 并同步文件后再跑脚本。
- **登录提示密码错误**：确认你用的是自己部署时设置的 `ADMIN_PASS`；如果首次部署漏了 `ADMIN_PASS` 导致密码为空，可直接用 Cloudflare 控制台往 KV 里写 `admin_username` / `admin_password` 两个键（明文）。
- **想重置数据**：在 Cloudflare 控制台删掉对应的 KV 命名空间，再带 `ADMIN_PASS` 重跑脚本即可。
