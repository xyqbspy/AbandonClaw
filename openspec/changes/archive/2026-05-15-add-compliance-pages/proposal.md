# 变更提案：新增合规页面与注册同意条款

## Status
draft

## Why

按 `docs/dev/release-readiness-assessment.md` P2-4 评估，应用收集邮箱、学习数据、IP 地址（用于限流）、cookie（用于 session），构成个人信息处理。当前没有：

- 隐私政策（Privacy Policy）
- 服务条款（Terms of Service）
- 注册同意 checkbox

`access_status` 设了 `disabled` / `readonly` / `generation_limited` 等处置状态，但没有「依据什么条款来执行处置」的法律依据。

合规要求：

- 中国《个人信息保护法》：处理个人信息必须有合法基础，明示告知用户。
- 欧盟 GDPR：违反 cookie 同意单笔罚款上限达 2000 万欧元或全球年营收 4%。
- 应用商店审核 / 域名服务商审核 / 用户投诉都会要求隐私政策链接。

公开开放前是底线动作。

## What Changes

- 新增 `/privacy` 页面，占位结构覆盖：收集信息、目的、存储位置、保留期、用户权利、数据分享对象、联系方式。
- 新增 `/terms` 页面，占位结构覆盖：服务范围、用户行为规范（对应 access_status）、免责条款、变更通知。
- 注册页加 checkbox：「我已阅读并同意《服务条款》《隐私政策》」，必须勾选才能提交。
- 占位内容清晰标注「__待法律审阅__」，避免假装专业。
- 公开开放前由用户找律师审阅替换。

## Capabilities

### Modified Capabilities

- `auth-api-boundaries`: 注册流程必须在用户明确同意服务条款与隐私政策后才允许提交。

## Impact

- 新增页面：`src/app/(marketing)/privacy/page.tsx`、`src/app/(marketing)/terms/page.tsx`。
- 修改文件：`src/app/(auth)/signup/page.tsx`（加 checkbox + 提交校验）。
- 不改变后端 `/api/auth/signup` 行为：consent 只在前端校验（后端无法记录用户是否同意，因为这是法律层面的契约，不是数据契约）。
- 不改变 `access_status` 处置逻辑。
- 影响 UI：注册按钮在未勾选时禁用。

## Stability Closure

### 本轮收口项

- 合规层最低门槛：占位页面 + 注册同意 UI 流程。

### 明确不收项

- 不写实际法律条款：占位内容只是结构，必须找律师审阅替换。
- 不接 Cookie 同意 banner：当前用户主要在国内，欧盟用户量未知；如果未来面向欧盟需另起 change `add-cookie-consent-banner`。
- 不接 GDPR 数据导出 / 删除请求 API：等真实欧盟用户出现再做。
- 不在数据库记录 consent 时间戳：consent 是法律层契约，由条款本身 bind 用户行为，不需要数据层证据。
- 不修改 `access_status` 处置逻辑：合规依据由条款提供，处置流程不变。

## Validation

- 单测：注册页未勾选 checkbox 时按钮 disabled。
- 单测：勾选后按钮可点击。
- 手工：访问 `/privacy` 与 `/terms` 能正常打开。

## Out of Scope

- 实际法律条款内容：用户找律师审阅。
- Cookie 同意 banner（欧盟用户）。
- 第三方法律服务集成（如 Termly / iubenda）。
- 网站底部 footer 组件统一加链接：等 footer 重构时一起做（当前各页面 footer 不统一）。
