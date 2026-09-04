# cf-nav · 个人书签导航站

> 一键部署到 Cloudflare Pages 的个人书签 / 网址导航站。
> 数据（书签、密码、设置）全部存在 **你自己的 Cloudflare KV** 里，与他人完全隔离，免费额度即可长期运行。

---

## ✨ 功能特性

- **8 套皮肤**：经典蓝白双栏、Bento 便当盒、卡片仪表盘、新标签页中性、赛博霓虹、东京之夜、极简瑞士、日系木漏 —— 每套**布局与配色都不同**，不只是换色调。
- **57 个动态背景**：`a1~a47` 47 个 Canvas 特效页 + 极光/森林/矩阵/粒子/樱花/飘雪/星空/流线/下雨等 10 个轻量动态背景。
- **书签管理**：分类、增删改、拖拽排序、批量图标抓取、批量悬停介绍抓取。
- **AI 补描述**：一键为书签生成介绍，支持 CF Workers AI（免费）/ Gemini / OpenAI。
- **站点美化**：毛玻璃、3D 倾斜、瀑布流淡入、悬停音效、天气联动、欢迎语、无边框模式等。
- **开放投稿**：可开启访客投稿，后台审核后上架。
- **导入导出**：JSON / HTML（Chrome 书签格式）双向。
- **纯前端 + CF Pages Functions**：无数据库、无框架、无构建步骤，部署即用。

---

## 🚀 快速部署（给最终用户，5 分钟）

> 完整图文版见 [download/部署说明.md](download/部署说明.md)

### 准备

| 需要 | 获取方式 |
|------|---------|
| Cloudflare 账号 | https://dash.cloudflare.com/sign-up 免费注册 |
| **Global API Key** | Dashboard 右上角头像 → My Profile → API Tokens → 页面下方 **Global API Key → View** |
| 部署器安装包 | `cf-nav-deployer.zip`（直链见下） |
| 书签文件（可选） | Chrome/Edge 书签管理器 → 导出书签 → `bookmarks_x_x_x.html` |

### 两步部署

**第 1 步：上传部署器**

1. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Upload assets**
2. 项目名随意 → 上传 `cf-nav-deployer.zip` → **Deploy** → 点 **Visit site** 打开部署器

**第 2 步：一键部署导航站**

在部署器页面填：邮箱 + Global API Key → Pages 项目名/KV 名 → 站点名 → 管理员账号密码 →（可选）导入书签 → 点 **一键部署**。

部署完成后会给出访问地址与后台地址：

```
项目名:   nav-xxxxxxxx
访问地址: https://nav-xxxxxxxx.pages.dev
管理后台: https://nav-xxxxxxxx.pages.dev/admin
```

### 部署器安装包直链

- 最新部署器：`https://github.com/xuxk-cn/bookmarks/raw/master/download/cf-nav-deployer.zip`
- 随 release 打包版：`https://github.com/xuxk-cn/bookmarks/raw/master/cf-nav/release/cf-nav-deployer.zip`

> 两个 zip 结构相同，内含 `app.js` / `index.html` / `styles.css` / `_worker.js`。
> 版本自检：部署器页面标题下有一行**红色版本号**（如 `v20260825-76`），看不到就 `Ctrl+F5` 强刷。

---

## 🖥 本地开发

```bash
git clone https://github.com/xuxk-cn/bookmarks.git
cd bookmarks/cf-nav
npm install
cp wrangler.example.toml wrangler.toml   # 填入你的 KV namespace ID
npm run dev                              # 或双击 start.bat（Windows）
```

- 首页：`http://localhost:8788`
- 后台：`http://localhost:8788/admin`（默认 `admin` / `admin123`，仅本地种子数据）

项目脚本：

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发服务器（wrangler pages dev） |
| `npm run init` | 生成本地 KV 种子数据 |
| `npm run deploy` | 直接部署到 Cloudflare Pages |

---

## 🗂 目录结构

```
bookmarks/
├── README.md
├── download/
│   ├── cf-nav-deployer.zip        # 分发给最终用户的一键部署器
│   └── 部署说明.md                 # 面向最终用户的图文部署文档
└── cf-nav/
    ├── public/                    # 前端源码（Cloudflare Pages 静态资源）
    │   ├── index.html             # 首页（SSR 注入书签数据）
    │   ├── style-preview.html     # 皮肤预览选择页
    │   ├── bg-preview.html        # 背景预览选择页
    │   ├── admin/                 # 后台管理面板
    │   ├── css/                   # main.css + beauty.css + styles01~08.css（8 套皮肤）
    │   ├── js/                    # main/search/background/beauty/hover-module/sound 等
    │   └── backgrounds/           # 47 个 a 特效页 + 10 个 js 动态背景 + three.min.js
    ├── functions/                 # Cloudflare Pages Functions（后端）
    │   ├── api/                   # backgrounds/bookmarks/categories/import/export/… 接口
    │   ├── admin/                 # 登录/登出/后台
    │   └── lib/                   # auth/kv/parser/renderer/favicon/hover/utils
    ├── release/                   # 部署产物（一键部署器从这里拉取）
    │   ├── public/                # 与 public/ 同步的静态资源副本
    │   ├── functions/             # 与 functions/ 同步的函数副本
    │   ├── dist/_worker.js        # esbuild 打包后的单文件 Worker
    │   └── cf-nav-deployer.zip    # 随 release 一起打包的部署器
    ├── deploy.py                  # 官方命令行部署脚本（重部署不清数据）
    └── DEPLOY.md                  # 部署脚本使用说明
```

---

## 🎨 皮肤机制

8 套皮肤共用同一份真实书签数据与 DOM 结构，通过 `body[data-style-id="N"]` 作用域做**布局重排 + 配色覆盖**，因此每套皮肤在布局、卡片方向、圆角、配色上都互不相同：

| ID | 皮肤 | 布局特点 |
|----|------|---------|
| 1 | 经典蓝白 | 左侧分类栏 + 右侧书签列表（双栏） |
| 2 | Bento 便当盒 | 玻璃拟态、居中大标题、胶囊导航 |
| 3 | 卡片仪表盘 | 顶栏 + 下划线标签 + 左侧色条卡 |
| 4 | 新标签页中性 | 大图标磁贴、无边框 hover 浮现 |
| 5 | 赛博霓虹 | 斜切角发光卡片 |
| 6 | 东京之夜 | 双列编号列表、下划线 hover |
| 7 | 极简瑞士 | 单列编辑器式列表、大字标题 |
| 8 | 日系木漏 | 大圆角暖色卡片 |

> 皮肤资源文件为 `public/css/styles01.css` ~ `styles08.css`；皮肤清单与名称在 `functions/api/backgrounds.js` 的 `STYLES_MAP` 中登记。

---

## 🛠 后台功能

登录 `/admin` 后共 6 个页面：

| 页面 | 用途 |
|------|------|
| 📚 书签管理 | 增删改、排序；抓取图标 / 抓取悬停介绍 / 批量抓取 / AI 补描述 |
| 📂 分类管理 | 分类增删改、排序 |
| 🤖 AI 补描述 | 选 Provider 批量生成书签介绍 |
| 📥 投稿审核 | 审核访客投稿 |
| 📤 导入导出 | JSON / HTML 导入与备份 |
| ⚙️ 站点设置 | 站名、默认风格、背景、美化项、改密码 |

---

## 🔧 技术栈

- 后端：Cloudflare Pages Functions
- 存储：Cloudflare KV（无需 D1 / 数据库）
- 前端：原生 HTML / CSS / JS（无框架、无构建）
- AI：CF Workers AI / Gemini / OpenAI（可选，用于补描述）
- 打包：esbuild（`functions/worker-entry.js` → `release/dist/_worker.js`）

---

## ❓ 常见问题

| 现象 | 原因与处理 |
|------|-----------|
| 部署器没有红色版本号 | 旧页面缓存，Ctrl+F5 强刷；或从 Dashboard Deployments → Production 域名重进 |
| 「获取 GitHub commit SHA 失败: 403」 | GitHub 匿名限流，部署器已内置 git 协议兜底，点重试 |
| 悬停介绍缺失 | 目标站无 meta 描述或反爬，用「AI 补描述」生成 |
| 忘记管理员密码 | Dashboard → KV → 找到对应 `nav-kv-*` → 删 `admin_password` 键 → 重新部署重设 |
| 更新代码后样式/接口报错 | `release/` 与 `public/`、`functions/` 不同步，或未重新 esbuild `dist/_worker.js`；同步并重建后再部署 |

---

## 📄 开源许可

个人项目，代码仅供学习交流使用。书签数据归各站点所有，与本项目无关。