# add-email-code-signup-verification Design

## Overview

本轮在现有服务端注册入口前增加“邮箱验证码”前置校验。验证码不是认证会话，也不替代 Supabase Auth 账号体系；它只证明注册者能访问该邮箱，并在创建账号前消耗一次有效验证码。

## Data Model

新增数据库表 `registration_email_verification_codes`：

- `id uuid primary key`
- `email text not null`
- `code_hash text not null`
- `purpose text not null default 'signup'`
- `expires_at timestamptz not null`
- `consumed_at timestamptz null`
- `attempt_count integer not null default 0`
- `max_attempts integer not null default 5`
- `last_sent_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

索引：

- `(email, purpose, created_at desc)`
- `expires_at`

验证码明文只在发送邮件时存在，不落库。hash 使用服务端 salt：

- `EMAIL_VERIFICATION_CODE_SECRET` 存在时使用该值。
- 缺失时回退 Supabase service key 或进程内稳定 secret，但生产建议显式配置。

## API Design

### POST `/api/auth/signup/email-code`

请求：

```json
{ "email": "name@example.com" }
```

行为：

- 校验 Origin。
- 校验邮箱格式。
- 执行同一 IP 的注册频控或专用验证码发送频控。
- 检查同一邮箱冷却时间，例如 60 秒内不重复发送。
- 生成 6 位数字验证码。
- 写入 hash、过期时间和尝试上限。
- 发送邮件。
- 返回 `{ ok: true, expiresInSeconds: 600 }`。

### POST `/api/auth/signup`

新增请求字段：

```json
{
  "email": "name@example.com",
  "password": "...",
  "username": "...",
  "inviteCode": "...",
  "emailCode": "123456"
}
```

行为顺序：

1. 校验 Origin、body、注册模式。
2. 非 `closed` 模式下执行注册 IP 频控。
3. 在 `invite_only` 下校验邀请码，但只在 Auth 成功后扣次数。
4. 校验邮箱验证码：邮箱一致、未过期、未消费、错误次数未超限。
5. 通过后创建 Supabase Auth 用户。
6. Auth 成功后消费验证码；`invite_only` 成功后继续扣邀请码。

## Email Sending

优先使用 Supabase Auth 的 OTP 能力：如果 `supabase.auth.signInWithOtp` / `resend` 可满足自定义验证码输入体验，则复用；否则使用项目内最小邮件发送 adapter。

为了保持可落地，本轮采用最小 adapter：

- 新增 `sendSignupEmailCode(email, code)` 服务函数。
- 默认开发环境记录结构化日志，避免本地阻塞。
- 如果存在 SMTP/邮件 provider 配置，则真实发送。
- 本轮不引入大依赖；若项目没有邮件 provider，文档明确目标环境需要配置 provider 才能完成真实投递。

## UI Flow

`/signup`：

- 邮箱输入旁增加“发送验证码”按钮。
- 发送后显示倒计时，避免短时间重复点击。
- 表单增加“邮箱验证码”字段。
- 注册提交时必须带 `emailCode`。
- `invite_only` 模式继续显示邀请码字段。

## Compatibility

现有 `/auth/callback` 和 `/verify-email` 保留：

- callback 继续处理 Supabase 链接确认。
- `/verify-email` 可保留为兼容提示和重发入口，但注册主流程改为验证码。
- middleware 的 `email_confirmed_at / confirmed_at` 拦截仍然保留；如果 Supabase 项目开启邮箱确认，链接确认仍是进入主应用的最终边界。若目标要完全由验证码替代 Supabase confirmed 状态，则后续需要新增 profile 级邮箱验证字段，本轮不做。

## Stability Closure

### Unstable Points

- Supabase 邮箱确认和项目验证码可能形成双重验证。
- 邮件发送 provider 未配置时，真实环境验证码无法投递。
- 如果验证码消费早于 Auth 创建，Auth 失败会让用户重新发码，体验较差。

### Closure In This Round

- 注册页和注册 API 都以验证码作为显式前置输入。
- 验证码只在 Auth 成功后消费。
- 文档明确 Supabase 链接确认仍是兼容/兜底，不再代表注册表单验证码体验。

### Deferred

- 完全替换 Supabase `email_confirmed_at` 为 profile 级 `email_verified_at`。
- 邮件 provider 监控、退信、模板管理和投递质量。
- 更复杂的验证码风控。
