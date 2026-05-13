# Design

## Current Flow

1. `/signup` 调用 `/api/auth/signup/email-code` 发送 6 位验证码。
2. `/api/auth/signup` 在创建 Supabase Auth 用户前校验验证码。
3. `registerWithEmailPassword()` 调用 `supabase.auth.signUp()` 创建 Auth 用户。
4. 当前 stable spec 仍要求传入 `/auth/callback`，并由 Supabase Confirm email 完成邮箱确认。
5. middleware 通过 `email_confirmed_at` / `confirmed_at` 判断是否允许进入主应用。

问题在于第 2 步已经完成项目内邮箱控制权验证，第 4/5 步又要求第二套验证，造成重复语义和用户阻断。

## Target Flow

1. 用户仍必须先拿到并输入项目 6 位邮箱验证码。
2. `/api/auth/signup` 校验验证码成功后创建 Supabase Auth 用户。
3. 创建成功后，服务端使用 admin 能力将该用户邮箱确认状态标记为已确认，或采用等效 Supabase Auth API 能力保证 `email_confirmed_at` / `confirmed_at` 满足 middleware 放行条件。
4. middleware 继续检查 Supabase Auth 用户的确认状态，不新增第二套 profile 字段来判断邮箱验证。
5. `/auth/callback` 和 `/verify-email` 保留为兼容入口，但不再是新注册主链路的必要步骤。

## Implementation Notes

- 优先在 `registerWithEmailPassword()` 内部完成“创建用户 -> 标记邮箱确认 -> 消费邀请码/验证码”的顺序收口。
- 若 Supabase `signUp()` 在 Confirm email 关闭后天然返回已确认用户，代码仍需有测试覆盖该状态；若生产配置无法保证，则使用 admin update user 明确确认。
- 邀请码扣减仍应只发生在 Auth 用户创建成功之后。
- 邮箱验证码仍只在 Auth 用户创建成功后消费，避免验证码被失败注册吃掉。
- 登录页错误提示保持模糊但可理解：不能明确告诉用户“邮箱存在/不存在”，避免账号枚举。

## Alternatives Considered

- 继续保留 Supabase Confirm email：放弃。会与项目 6 位验证码重复，且当前用户已经遇到注册后登录不可用。
- 只改 middleware 放行未确认用户：放弃。会绕过邮箱验证边界，让非验证码路径创建的未确认账号也可能进入主应用。
- 新增 `profiles.email_verified_by_code` 字段作为放行依据：暂不采用。当前 Supabase Auth 已有确认状态，优先复用单一认证状态，避免新增状态漂移。

## Stability Closure

### Unstable points discovered

- stable spec 中仍把 Supabase 邮件链接确认作为注册主链路的一部分。
- domain docs 中 `/verify-email` 被描述为邮箱验证硬边界入口，但 6 位验证码已经承担了注册邮箱验证。
- baseline runbook 缺少“Confirm email 已关闭后如何判定注册成功”的口径。

### Closed in this round

- 注册成功后邮箱确认状态与 middleware 放行条件一致。
- stable spec、domain docs、runbook 和 dev-log 同步更新。
- 单元测试覆盖注册服务、signup route、middleware 和登录错误提示。

### Deferred

- 旧未确认账号的批量迁移不在本轮自动执行；若生产已有旧账号，需要通过后台或 Supabase 控制台单独处理。
- 密码找回仍不在本轮范围。
