# cf-nav

一键部署到 Cloudflare 的个人书签导航站。

## 快速部署

1. 打开 `deployer/index.html`（本地浏览器）
2. 填写 CF Account ID 和 API Token
3. 上传书签文件（可选）
4. 点"一键部署"

## 本地开发

```bash
npm install
cp wrangler.example.toml wrangler.toml
# 填入你的 KV namespace ID
npm run dev
```

## 技术栈

- CF Pages Functions（后端）
- CF KV（数据存储，无需 D1）
- 原生 HTML/CSS/JS（无框架）
- CF Workers AI / Gemini / OpenAI（AI 补描述）

## 后台管理

部署后访问 `https://your-site.pages.dev/admin`
