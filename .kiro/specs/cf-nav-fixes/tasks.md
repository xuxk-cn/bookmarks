# Implementation Tasks

## Task List

- [x] 1 修复 Bug 1：settings.js 密码修改处理
  - [x] 1.1 在 `onRequestPost` 中检测 `body._changePassword`，非空时写入 KV 条目 `admin_password`
  - [x] 1.2 在合并前 `delete body._changePassword`，确保不写入 `nav_settings`
  - [x] 1.3 验证：空字符串 `_changePassword` 不触发密码更新

- [x] 2 功能改进：首页背景/风格选择 UI 重设计
  - [x] 2.1 隐藏 `#bg-select` 和 `#style-select`（`display:none`），添加 `.panel-wrap` + `.panel-btn` + `.panel-popup` 结构到 `index.html`
  - [x] 2.2 在 `main.css` 末尾追加 `.panel-wrap`、`.panel-btn`、`.panel-popup`、`.panel-group-label`、`.panel-item` 样式
  - [x] 2.3 在 `index.html` 内联 `<script>` 中实现面板逻辑：
    - MutationObserver 监听 `#bg-select` 动态选项，同步渲染背景面板
    - 背景/风格按钮 toggle 面板
    - 点击面板外部关闭
    - 选项点击后更新隐藏 select 值、dispatch change 事件、更新按钮文字
  - [x] 2.4 页面加载时读取 localStorage `bgChoice` 和 `styleChoice`，同步初始化按钮文字

- [ ] 3 Bug 2：登录硬编码旁路（暂不实现，留待后续）
  - [ ] 3.1 删除 `login.js` 中 `admin/admin123` 硬编码条件，仅保留 `verifyCredentials()` 验证
