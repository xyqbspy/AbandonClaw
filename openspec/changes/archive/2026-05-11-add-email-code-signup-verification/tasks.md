# add-email-code-signup-verification Tasks

## 1. 数据与服务

- [x] 1.1 新增邮箱验证码数据库迁移，保存 hash、过期、错误次数和消费状态。
- [x] 1.2 新增验证码生成、hash、校验、消费 service。
- [x] 1.3 新增最小邮件发送 adapter，并记录生产环境所需配置。

## 2. API

- [x] 2.1 新增 `/api/auth/signup/email-code`，执行 Origin 校验、邮箱校验、频控、冷却和发送。
- [x] 2.2 更新 `/api/auth/signup` body，要求并校验 `emailCode`。
- [x] 2.3 保持 `closed / invite_only / open` 和邀请码扣次数语义不漂移。

## 3. 页面

- [x] 3.1 更新 `/signup`，增加发送验证码按钮、验证码输入和倒计时。
- [x] 3.2 注册提交时校验邮箱验证码必填，并把验证码传给服务端。
- [x] 3.3 保持移动端布局可用，不让验证码按钮和输入框溢出。

## 4. 测试

- [x] 4.1 增加验证码 service 测试：成功、错误、过期、已消费、错误次数上限。
- [x] 4.2 增加发送验证码 route 测试。
- [x] 4.3 更新 signup route 测试，覆盖缺失/错误/正确验证码与邀请码组合。
- [x] 4.4 更新注册页交互测试或补最小组件测试。

## 5. 文档与收口

- [x] 5.1 同步 stable spec：`auth-api-boundaries`、`email-verification-flow`。
- [x] 5.2 同步 `docs/domain-rules/auth-api-boundaries.md` 和公开注册验证文档。
- [x] 5.3 更新 `docs/dev/dev-log.md`，记录从邮件链接确认到注册验证码体验的语义变化。
- [x] 5.4 运行最小验证：相关 node tests、tsc、eslint、mojibake、diff check。

## Explicit Non-Goals

- [x] 6.1 不做完整邮件投递监控、退信处理、模板管理。
- [x] 6.2 不做短信验证码、设备指纹、WAF 或复杂风控评分。
- [x] 6.3 不在本轮删除 Supabase `/auth/callback` 与 `/verify-email` 兼容入口。
