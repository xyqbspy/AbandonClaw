# add-email-code-signup-verification Proposal

## Why

当前“邮箱验证闭环”复用的是 Supabase Auth 邮件链接确认：注册后发确认链接，用户点击邮件链接，再通过 `/auth/callback` 建立会话并由 middleware 检查 `email_confirmed_at`。这能满足最小邮箱确认，但不符合当前产品目标：用户希望在注册表单里先收到邮箱验证码，并在注册提交时输入验证码完成校验。

继续沿用邮件链接会带来两个问题：

- 注册体验不直观：用户不知道为什么注册时没有验证码输入。
- 安全语义容易漂移：文档里说“邮箱验证”，但用户理解的是注册前验证码，而代码实际是注册后链接确认。

本轮把注册邮箱验证改成更明确的“邮箱验证码注册”：用户先发送验证码，注册提交必须携带有效验证码；服务端在创建 Supabase Auth 账号前完成验证码校验。

## What Changes

- 新增注册邮箱验证码发送入口，例如 `/api/auth/signup/email-code`。
- 新增邮箱验证码服务：生成 6 位数字验证码、只保存 hash、设置有效期、重发冷却、错误次数限制和消费状态。
- 注册页增加“发送验证码”和“邮箱验证码”输入，`invite_only` 下继续保留邀请码。
- `/api/auth/signup` 在允许注册模式下，先校验邮箱验证码，再进入 Supabase Auth 创建账号和邀请码扣次数。
- 更新 stable spec、domain rules、公开注册验证文档和 dev-log。

## Stability Closure

### Instability Surfaced

- “邮箱验证”语义已经分裂：代码是 Supabase 链接确认，用户预期是注册页验证码。
- 现有注册成功后跳登录页，不能表达“注册前邮箱已经被验证码验证”的新流程。
- 验证码能力如果只做前端校验，会绕过服务端注册准入边界。

### Closed In This Round

- 明确注册页邮箱验证采用验证码方式。
- 验证码在服务端生成、hash 存储、过期、限次、消费。
- 注册 API 在创建账号前校验验证码。
- `closed / invite_only / open` 注册模式和邀请码语义保持不变。
- 文档和 stable spec 同步到验证码注册语义。

### Explicitly Not Closed

- 不做完整邮件投递监控、退信处理、域名信誉监控或运营邮件模板系统。
- 不做短信验证码、设备指纹、WAF 或复杂风控评分。
- 不做管理员手动标记邮箱已验证。
- 不删除 Supabase 邮件链接 callback；它可以作为兼容或部署配置兜底，但注册主流程不再依赖它完成“注册表单验证码”体验。

剩余风险记录在公开注册 readiness / runbook 文档里，后续若进入 `open` 大范围开放再继续补 P1/P2 风控。
