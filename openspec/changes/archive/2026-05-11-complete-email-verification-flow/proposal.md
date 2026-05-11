## Why

当前注册入口已经调用 Supabase Auth 创建邮箱账号，也会在未验证时拦截主应用访问，但邮箱确认回跳和重发验证邮件仍没有显式产品闭环。这样会让“邮箱注册是否真正可用”过度依赖 Supabase 默认配置，用户注册后也缺少自助补发入口。

本轮直接收口小范围公开前的邮箱验证闭环：继续复用 Supabase 邮件能力，不自建验证码系统。

## What Changes

- 注册创建账号时显式传入邮箱验证回跳地址，确保验证邮件回到项目内受控 route。
- 新增 `/auth/callback`，处理 Supabase 邮箱确认 code 并建立 session，再回到安全站内目标。
- 新增受控重发验证邮件入口，让未验证用户可以在 `/verify-email` 自助补发。
- `/verify-email` 页面补上重发操作和验证后重新登录/返回入口。
- 补充测试、stable spec delta、公开注册验证文档和 dev-log。

本轮明确不收：

- 不自建邮箱验证码、验证码输入页或邮件投递系统。
- 不做邮件模板、域名信誉、退信监控或邮件到达率统计。
- 不做管理员手动标记邮箱已验证。

## Capabilities

### New Capabilities

- `email-verification-flow`: 用户邮箱注册后的验证回跳、未验证拦截和重发验证邮件闭环。

### Modified Capabilities

- `auth-api-boundaries`: 公网注册入口必须显式接入 Supabase 邮箱确认回跳和重发验证邮件能力，而不是只依赖创建账号后的静态提示。

## Impact

- 页面：`/verify-email` 增加重发验证邮件操作。
- API：新增邮箱验证回调 route 与重发验证邮件 route。
- 服务端：注册 service 显式传入 `emailRedirectTo`，并复用 Supabase resend。
- 安全边界：回调跳转继续使用站内安全 redirect 规则。
- 文档与验证：同步公网注册验证指南、runbook、readiness plan、dev-log 和 stable spec。

## Stability Closure

本轮暴露的稳定性缺口：

- “邮箱未验证用户不得进入主应用”已经写入稳定规则，但验证邮件回跳与重发入口没有代码闭环。
- 注册成功提示要求用户查收邮件，但用户没有项目内的重发验证入口。

本轮收口：

- 显式配置 Supabase 邮箱确认回跳。
- 增加受控 callback 和 resend route。
- 让 `/verify-email` 承担最小可用验证闭环。

剩余风险与延后原因：

- Supabase 项目必须开启 email confirmation，并把目标域名 callback 加入允许列表；这是部署环境配置，代码无法替代。
- 邮件投递质量、模板、域名信誉和退信处理属于 P1/P2 运营能力，继续记录在公开注册验证文档和 dev-log。
