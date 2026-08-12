# 书签导航生成器

将浏览器导出的书签 HTML 文件转换为一个精美的本地导航网页，支持图标抓取、AI 介绍生成、可视化编辑。

---

## 项目文件一览

| 文件 | 说明 |
|------|------|
| `app.py` | 主程序，解析书签并生成导航网页 |
| `bookmarks.html` | 浏览器导出的书签文件（需自行放入） |
| `config.json` | 运行参数配置 |
| `output/bmarks.html` | app.py 生成的导航网页 |
| `output/icons.js` | app.py 提取的图标 base64 数据 |
| `nav_editor.html` | 综合编辑器（推荐使用） |
| `desc_editor.html` | 批量 AI 介绍编辑器 |
| `icon_editor.html` | 图标/标题/链接编辑器 |
| `extract_icons.html` | 从旧文件提取 base64 图标工具 |

---

## 快速开始

### 第一步：导出书签

在浏览器中导出书签为 HTML 文件，重命名为 `bookmarks.html` 放入项目根目录。

- Chrome：书签管理器 → 右上角菜单 → 导出书签
- Edge：收藏夹 → 管理收藏夹 → 导出收藏夹

### 第二步：配置参数

编辑 `config.json`：

```json
{
  "api_url": "http://127.0.0.1:8081/v1/chat/completions",
  "max_workers": 4,
  "timeout_seconds": 60,
  "max_text_length": 4000
}
```

| 参数 | 说明 |
|------|------|
| `api_url` | 本地 AI 模型接口地址（可选，用于生成网站介绍） |
| `max_workers` | 并发抓取线程数，网络好可调高 |
| `timeout_seconds` | 单个链接超时时间（秒），使用代理建议设 60 |
| `max_text_length` | 传给 AI 的最大文本长度 |

### 第三步：运行

```bash
pip install -r requirements.txt
python app.py
```

运行完成后在 `output/` 目录生成：
- `bmarks.html` — 导航网页主文件
- `icons.js` — 图标数据文件
- `report.txt` — 处理报告
- `recognized.txt` — 成功识别的书签列表
- `failed.txt` — 失败书签列表

> **注意：** `bmarks.html` 和 `icons.js` 必须放在同一目录才能正常显示图标。

---

## 各工具使用说明

### nav_editor.html（综合编辑器，推荐）

功能最完整的编辑工具，集成了所有编辑功能。

**加载文件**
1. 用浏览器打开 `nav_editor.html`
2. 点击"加载文件"，选择 `output/bmarks.html`
3. 弹出确认框时点"确定"，再选择 `output/icons.js`，图标即可显示

**编辑书签**
- 左侧为板块列表，点击切换板块
- 右侧每张卡片包含：标题、链接、悬停介绍、图标 base64 四个输入框
- 修改后边框变绿，左侧板块也会显示绿色标记

**管理书签**
- `+ 新增书签`：填写标题、链接、悬停介绍后添加
- `✂ 剪切`：剪切后切换到目标板块，点顶部"粘贴"放入
- `🗑 删除`：删除单条书签
- `+ 新增板块`：在左侧底部添加新板块

**批量生成 AI 介绍**
1. 进入某个板块，点"📝 生成提示词"
2. 复制提示词，粘贴到 ChatGPT/Gemini/Claude 等网页 AI
3. 将 AI 返回的结果复制后点"📥 合并AI结果"，粘贴并应用

**迁移介绍**（重跑 app.py 后恢复旧介绍）
1. 点顶部"迁移介绍"
2. 选择旧的 `my_nav.html`（含完善介绍的版本）
3. 对比列表默认全选，可单独勾选，点"应用选中"完成迁移

**导出**
- 点"💾 导出"，浏览器依次下载 `my_nav.html` 和 `icons.js`
- 两文件放同一目录，用浏览器打开 `my_nav.html` 即可使用

---

### desc_editor.html（批量介绍编辑器）

专注于批量处理书签的悬停介绍内容。

1. 打开 `desc_editor.html`，加载 `my_nav.html`
2. 首页显示所有板块卡片（横排），点击进入某个板块
3. 点"📝 导出提示词"，复制后交给网页 AI
4. AI 返回结果后点"📥 合并内容"，粘贴应用
5. 所有板块处理完后点"💾 导出完整文件"

**AI 返回格式要求：**
```
C1-1: 网站介绍内容
C1-2: 网站介绍内容
```
其中 `C1` 表示第1个板块，数字为条目序号。

---

### icon_editor.html（图标编辑器）

专注于单条书签的图标、标题、链接、介绍编辑。

1. 打开 `icon_editor.html`，加载 `my_nav.html`
2. 左侧分类导航切换板块，也可顶部搜索框过滤
3. 每张卡片支持编辑：标题、链接、悬停介绍、图标 base64
4. 粘贴 base64 时有无 `data:image/...;base64,` 前缀均可自动识别
5. 点"💾 导出修改后的文件"下载 `my_nav.html` + `icons.js`

---

### extract_icons.html（图标提取工具）

用于从含有内嵌 base64 图标的旧版 `my_nav.html` 中提取图标，生成独立的 `icons.js`。

**使用场景：** 手头有旧版（图标内嵌在 HTML 中）的 `my_nav.html`，需要把图标分离出来供新版使用。

1. 打开 `extract_icons.html`，加载旧版 `my_nav.html`
2. 自动显示所有书签图标，有图标的默认全选
3. 可单击卡片取消/选中，或点全选/全不选
4. 点"💾 导出 icons.js"提取所有选中图标
5. 将 `icons.js` 与新版 HTML 放同一目录即可

---

## 典型工作流

### 首次使用
```
导出书签 → 放入 bookmarks.html → python app.py
→ 打开 nav_editor.html 加载 bmarks.html + icons.js
→ 按板块生成 AI 介绍 → 导出 my_nav.html + icons.js
→ 浏览器打开 my_nav.html 使用
```

### 重跑 app.py 后恢复介绍
```
python app.py（生成新 bmarks.html）
→ nav_editor.html 加载新 bmarks.html
→ 点"迁移介绍"，加载旧 my_nav.html
→ 全选应用 → 导出
```

### 手动新增书签（无需重跑）
```
nav_editor.html 加载 my_nav.html + icons.js
→ 选择板块 → + 新增书签 → 填写信息
→ 导出覆盖原文件
```

---

## 注意事项

- `my_nav.html` 和 `icons.js` 必须在同一目录，否则图标无法显示
- 使用代理上网时建议将 `timeout_seconds` 设为 60 或更高
- 本地 AI 模型（`api_url`）为可选，不启动也能运行，介绍会留空
- SSL 握手失败、连接超时的链接不会被判为死链，会保留在导航中
- 图标 base64 可不带前缀直接粘贴，工具会自动识别图片类型并补全
