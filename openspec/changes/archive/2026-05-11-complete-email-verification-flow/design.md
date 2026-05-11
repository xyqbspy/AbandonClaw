## Overview

本轮复用 Supabase Auth 的邮箱验证能力，不引入自建验证码表。注册时把验证邮件的回跳地址显式传给 Supabase，用户点击邮件后进入项目内 `/auth/callback`，由 route 使用 Supabase server client 交换 code 并写入 session cookie，再跳回安全站内目标。

未验证用户停留在 `/verify-email` 时，可以提交邮箱地址触发重发验证邮件。重发入口只发送邮件，不创建账号，不改变注册模式，也不绕过 middleware 的未验证拦截。

## Decisions

- **回跳地址来源**：由 `/api/auth/signup` 根据当前 request origin 生成，默认目标为 `/verify-email?verified=1`。
- **回调 route**：新增 `/auth/callback`，只接受安全站内 `next`，默认 `/verify-email?verified=1`。
- **重发入口**：新增 `/api/auth/resend-verification`，复用 Supabase anon client 的 `auth.resend({ type: "signup" })`。
- **页面交互**：`/verify-email` 保持简单说明，新增邮箱输入和重发按钮；不暴露调试型 Supabase 错误细节。
- **验证边界**：middleware 继续以 `email_confirmed_at` / `confirmed_at` 作为进入主应用和受保护 API 的硬边界。

## Stability Closure

不稳定点：

- 注册提示和 middleware 拦截已经存在，但验证邮件链路没有受控回调与重发入口。
- 文档要求检查邮箱验证，却没有明确 callback allowlist 和重发验证的验证步骤。

本轮收口：

- 注册、回调、重发、页面和测试一起落地。
- 文档补充 Supabase Auth 配置前提：开启 email confirmation，并允许 `/auth/callback`。

明确不收：

- 不自建验证码或 email token 存储。
- 不做邮件模板、投递监控和域名信誉配置自动化。
- 不做 open 模式下的大规模注册风控扩展。

风险去向：

- 真实环境配置与投递结果记录在 `docs/dev/public-registration-feature-verification-guide.md`、`docs/dev/public-registration-http-baseline-runbook.md` 和 `docs/dev/dev-log.md`。

## Test Plan

- 注册 service 测试：`signUp` 会带 `emailRedirectTo`。
- 注册 route 测试：从 request origin 构造回跳地址并传入 service。
- callback route 测试：code 成功时跳安全目标，缺 code 或 exchange 失败时跳错误页。
- resend route 测试：校验邮箱、传入 redirect、Supabase 错误收敛。
- verify-email 页面测试：渲染重发入口。
