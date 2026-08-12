# Bugfix Requirements Document

## Introduction

本文档描述 cf-nav 项目中需要修复的两个 Bug 及一项 UI 功能改进：

1. **Bug 1（高优先级）**：管理员密码修改接口不生效 —— 前端调用 `POST /api/settings` 传入 `_changePassword` 字段，但后端未做任何处理，导致密码无法更新。
2. **Bug 2（低优先级，本次暂不修复）**：登录接口存在硬编码旁路 `admin/admin123`，正确的验证逻辑已在 `verifyCredentials()` 中实现，待后续处理。
3. **功能改进**：首页顶部背景和风格选择由下拉框改为图标按钮 + 浮动面板，提升交互体验。

---

## Bug Analysis

### Bug 1：管理员密码修改接口不生效

#### Current Behavior (Defect)

1.1 WHEN 管理员在后台填写新密码并点击"修改密码"，前端向 `POST /api/settings` 发送 `{ _changePassword: "<新密码>" }` THEN 后端仅执行 `{ ...current, ...body }` 合并，`_changePassword` 字段被写入设置 JSON 但 KV 中的 `admin_password` 条目不会更新

1.2 WHEN 管理员完成上述操作后尝试用新密码登录 THEN 后端 `verifyCredentials()` 读取 KV 中旧的 `admin_password` 条目，认证失败，密码实际未被修改

1.3 WHEN `_changePassword` 字段通过合并被写入站点设置 JSON THEN `admin_password` 以 `_changePassword` 形式泄露在 `nav_settings` KV 条目中，造成敏感数据混入非预期位置

#### Expected Behavior (Correct)

2.1 WHEN 前端发送包含 `_changePassword` 字段的 `POST /api/settings` 请求 THEN 后端 SHALL 提取该字段的值，将其写入 KV 的独立条目 `admin_password`（等同于 `env.NAV_KV.put('admin_password', newPassword)`）

2.2 WHEN `admin_password` 写入完成后 THEN 后端 SHALL 从合并后的 body 中删除 `_changePassword` 字段，再继续执行常规设置写入，确保该字段不被持久化到 `nav_settings`

2.3 WHEN 管理员用新密码登录 THEN `verifyCredentials()` 读取到更新后的 `admin_password`，认证 SHALL 成功

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN 前端发送 `POST /api/settings` 请求且不含 `_changePassword` 字段 THEN 后端 SHALL CONTINUE TO 按原逻辑合并并写入站点设置，现有设置项不受影响

3.2 WHEN `_changePassword` 字段为空字符串时 THEN 后端 SHALL CONTINUE TO 忽略该更新，不覆盖原有密码（防止意外清空）

3.3 WHEN `POST /api/settings` 请求成功 THEN 接口 SHALL CONTINUE TO 返回 `{ ok: true }`，前端提示逻辑不变

---

### Bug 2：登录硬编码旁路（本次暂不修复）

> 此 Bug 已记录，待 Bug 1 及功能改进稳定后处理。

#### Current Behavior (Defect)

4.1 WHEN 用户以用户名 `admin` 和密码 `admin123` 登录 THEN 后端绕过 `verifyCredentials()` 直接通过认证，即使 KV 中已设置其他密码

#### Expected Behavior (Correct)

4.2 WHEN 任意用户尝试登录 THEN 后端 SHALL 仅通过 `verifyCredentials()` 验证，不存在硬编码旁路

#### Unchanged Behavior (Regression Prevention)

4.3 WHEN 用户提供正确的 KV 存储凭据时 THEN 系统 SHALL CONTINUE TO 允许登录

---

### 功能改进：背景与风格选择 UI 重设计

#### Current Behavior (Defect)

5.1 WHEN 用户访问首页 THEN 顶部工具栏显示 `#bg-select` 和 `#style-select` 两个原生下拉框，与整体暗色设计风格不协调

5.2 WHEN 用户在移动端访问时 THEN 两个 `<select>` 下拉框占用工具栏较多空间，挤压其他控件

#### Expected Behavior (Correct)

5.3 WHEN 页面加载时 THEN 系统 SHALL 在悬停音效 toggle 旁边渲染"背景"和"风格"两个图标按钮，替代原有下拉框的视觉呈现；原始 `<select>` DOM 保留但隐藏

5.4 WHEN 用户点击"背景"图标按钮 THEN 系统 SHALL 在按钮附近弹出浮动面板，列出所有背景选项（Canvas 动画组 + Shader 特效组，结构与原下拉框一致）；再次点击按钮或点击面板外部时面板关闭

5.5 WHEN 用户点击"风格"图标按钮 THEN 系统 SHALL 在按钮附近弹出浮动面板，显示风格一/二/三选项；再次点击按钮或点击面板外部时面板关闭

5.6 WHEN 用户在背景面板中选择某项 THEN 系统 SHALL 同步更新隐藏的 `#bg-select` 值并触发其 `change` 事件，面板随即关闭，按钮文字更新为当前背景名称

5.7 WHEN 用户在风格面板中选择某项 THEN 系统 SHALL 同步更新隐藏的 `#style-select` 值并触发其 `change` 事件，面板随即关闭，按钮文字更新为当前风格编号（如"风格二"）

#### Unchanged Behavior (Regression Prevention)

5.8 WHEN 用户选择背景或风格 THEN `background.js` 和 `main.js` 中监听 `#bg-select` / `#style-select` `change` 事件的逻辑 SHALL CONTINUE TO 正常工作，无需修改任何 JS 模块

5.9 WHEN 页面加载并恢复 localStorage 中的背景/风格设置时 THEN 系统 SHALL CONTINUE TO 正确还原用户上次的选择，按钮文字同步显示当前选中项

---

## Bug Condition 形式化描述

### Bug 1 Bug Condition

```pascal
FUNCTION isBugCondition_B1(request)
  INPUT: request of type PostSettingsRequest
  OUTPUT: boolean
  RETURN '_changePassword' IN request.body
    AND request.body._changePassword != ''
END FUNCTION

// Property: Fix Checking
FOR ALL req WHERE isBugCondition_B1(req) DO
  onRequestPost'(req)
  newPass ← KV.get('admin_password')
  ASSERT newPass = req.body._changePassword
  ASSERT 'nav_settings' does NOT contain '_changePassword' field
END FOR

// Property: Preservation Checking
FOR ALL req WHERE NOT isBugCondition_B1(req) DO
  ASSERT onRequestPost(req) = onRequestPost'(req)   // 常规设置写入行为不变
END FOR
```

### UI 改进 Bug Condition

```pascal
FUNCTION isBugCondition_UI(action)
  INPUT: action of type UserAction
  OUTPUT: boolean
  // 用户通过新面板选择背景或风格
  RETURN action.type IN {'select-bg-from-panel', 'select-style-from-panel'}
END FUNCTION

// Property: Fix Checking
FOR ALL a WHERE isBugCondition_UI(a) DO
  result ← handlePanelSelection'(a)
  ASSERT hidden_select.value = a.selectedValue
  ASSERT change_event_fired(hidden_select) = true
END FOR

// Property: Preservation Checking
FOR ALL a WHERE NOT isBugCondition_UI(a) DO
  ASSERT background.js behavior unchanged
  ASSERT main.js behavior unchanged
END FOR
```
