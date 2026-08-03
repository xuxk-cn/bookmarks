# cf-nav 项目方案

一个可以一键部署到 Cloudflare 的个人书签导航站。
用户只需提供 CF API Token 和书签文件，其余全部自动完成。

---

## 目录结构

```
cf-nav/
├── deployer/
│   └── index.html          # 一键部署器（本地浏览器打开使用）
│
├── functions/              # CF Pages Functions（后端 API）
│   ├── _middleware.js      # 全局中间件：认证、CSRF
│   ├── constants.js        # 常量：KV key 前缀、版本号
│   ├── index.js            # 首页 SSR 渲染
│   ├── api/
│   │   ├── bookmarks.js    # 书签 CRUD
│   │   ├── categories.js   # 分类 CRUD
│   │   ├── settings.js     # 站点设置读写
│   │   ├── ai.js           # AI 补描述
│   │   ├── import.js       # 书签导入（解析 HTML）
│   │   ├── export.js       # 书签导出
│   │   └── pending.js      # 待审核投稿
│   ├── admin/
│   │   └── index.js        # 后台页面路由
│   └── lib/
│       ├── kv.js           # KV 读写封装
│       ├── auth.js         # Session 认证
│       ├── parser.js       # 书签 HTML 解析
│       ├── favicon.js      # Favicon 抓取
│       ├── renderer.js     # 首页 HTML 渲染
│       └── utils.js        # 工具函数
│
├── public/                 # 前端静态文件
│   ├── index.html          # 首页模板（含 {{PLACEHOLDER}}）
│   ├── _headers            # 缓存策略
│   ├── favicon.svg
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── main.js         # 首页交互
│   │   ├── search.js       # 跨分类搜索
│   │   ├── background.js   # 背景切换控制器
│   │   └── sound.js        # 悬停音效
│   ├── admin/
│   │   └── index.html      # 后台管理页面
│   └── backgrounds/        # 动态背景（Canvas 动画，占位符）
│       ├── rain.js         # 下雨
│       ├── snow.js         # 下雪
│       ├── forest.js       # 风吹森林
│       ├── stream.js       # 森林小溪
│       ├── stars.js        # 夜晚星空
│       ├── sakura.js       # 樱花飘落
│       ├── aurora.js       # 极光
│       ├── particles.js    # 粒子网络
│       └── matrix.js       # 矩阵代码雨
│
├── wrangler.example.toml
├── package.json
└── README.md
```

---

## 技术选型

| 类别 | 技术 |
|------|------|
| 计算 | CF Pages Functions（Workers 运行时） |
| 存储 | CF KV（书签、设置、Session、缓存，不使用 D1） |
| 前端 | 原生 HTML/CSS/JS，SSR 模板替换，无框架 |
| AI   | CF Workers AI / Gemini / OpenAI（用户配置） |

---

## KV 数据结构

```
nav_data            → JSON，全量书签数据
nav_settings        → JSON，站点配置
nav_session_{token} → Session 令牌
nav_pending         → JSON，待审核投稿列表
nav_cache_home      → 首页 HTML 缓存
nav_cache_dirty     → 缓存重建标记
```

书签数据格式（与现有 my_nav.html 完全兼容）：
```json
{
  "categories": [
    {
      "title": "resourse",
      "items": [
        {
          "title": "网站名",
          "url": "https://...",
          "icon": "data:image/png;base64,...",
          "hover": "网站介绍"
        }
      ]
    }
  ]
}
```

---

## 前端功能

### 首页
- 顶部分类导航栏
- 跨分类搜索（多字段 + 评分排序 + 关键词高亮）
- 书签卡片（3种风格可选）
- 悬停 tooltip（网址 + 介绍）
- 悬停音效（可开关）
- 动态背景（可切换）
- 响应式，移动端独立配置

### 卡片风格
- 风格一：图标居中 + 标题，简洁
- 风格二：图标左 + 标题 + 介绍，信息丰富
- 风格三：大图标 + 标题，视觉突出

### 动态背景库
Canvas 动画（占位符，后续补充具体实现）：
- 下雨、下雪、风吹森林、森林小溪
- 夜晚星空、樱花飘落、极光、粒子网络、矩阵代码雨

静态背景：
- 纯色、渐变色、用户上传图片、在线图片 URL

背景音效（独立开关，与动画联动）：
- 用户自行提供音频 URL

---

## 后台管理（/admin）

- 登录：账号密码存 KV，HttpOnly Session Cookie
- 书签管理：增删改查、批量操作
- 分类管理：增删改、排序
- AI 补描述：选中书签一键生成介绍
- 投稿审核：查看/通过/拒绝（可关闭）
- 站点设置：名称、风格、背景、AI 配置、Favicon 接口
- 书签导入：上传浏览器导出 HTML，自动解析+抓图标+AI描述
- 书签导出：JSON 或浏览器书签 HTML 格式

---

## 一键部署器（deployer/index.html）

本地浏览器打开，无需安装任何软件。

```
用户操作：
1. 输入 CF Account ID + API Token
2. 上传书签 HTML（可选）
3. 填写站点名称、管理员账号密码、AI Key（可选）
4. 点"一键部署"

自动执行：
→ 调 CF API 创建 KV 命名空间
→ 写入管理员凭据、默认设置到 KV
→ 解析书签并写入 KV（如有上传）
→ 打包前端文件，调 CF Pages Direct Upload API
→ 绑定 KV 到 Pages 项目
→ 触发部署

完成，输出访问地址 https://xxx.pages.dev
```

---

## 开发阶段

**Phase 1：前端模板**
- 首页 HTML（多风格、搜索、音效、tooltip、背景切换）
- 动态背景控制器（占位符接口）
- 后台管理页面骨架

**Phase 2：CF Workers 后端**
- KV 读写封装
- 认证中间件
- 书签 CRUD API
- 首页 SSR 渲染

**Phase 3：功能完善**
- 书签导入（解析+抓图标+AI描述）
- AI 补描述
- 投稿审核
- 设置管理

**Phase 4：一键部署器**
- CF API 调用封装
- 部署器 UI + 进度显示
