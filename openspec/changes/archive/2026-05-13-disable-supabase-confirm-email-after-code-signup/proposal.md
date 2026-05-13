# Change: disable-supabase-confirm-email-after-code-signup

## Summary

将注册邮箱验证语义收敛为项目内 6 位邮箱验证码：用户完成“发送验证码 -> 输入验证码 -> 提交注册”后，即视为注册邮箱已被项目验证，不再要求 Supabase Confirm email 邮件链接作为进入主应用的第二道确认。

## Why

当前注册链路同时存在两套邮箱验证语义：

- 项目自建 6 位邮箱验证码，已在 `/api/auth/signup/email-code` 和 `/api/auth/signup` 前置校验。
- Supabase Auth Confirm email，仍会让新账号处于未确认状态，middleware 又会将其拦到 `/verify-email`。

这导致用户明明已经输入邮箱验证码创建账号，却仍然无法登录进入主应用，体验上像“注册成功但账号不可用”。同时上线 baseline 也暴露了邮件服务配置和确认邮件链路的重复维护成本。

## Scope

- 注册成功后，项目必须确保该 Supabase Auth 用户在服务端被标记为邮箱已确认，或等效地不再被 middleware 当作未验证用户拦截。
- `/api/auth/signup` 继续要求 6 位邮箱验证码，并继续在创建账号前校验。
- 注册时不再依赖 Supabase Confirm email 回跳作为主体验必需步骤。
- 登录错误提示应保持安全，不拆分“邮箱不存在”和“密码错误”。
- 更新 stable spec、domain docs、runbook、dev-log 和相关测试。

## Stability Closure

### Exposed instability

- 邮箱验证语义重复：项目验证码和 Supabase Confirm email 同时存在，且都被当作进入主应用的前置边界。
- baseline 记录中“验证码已验证但登录仍失败”的原因不够清晰。
- `/verify-email`、`/auth/callback` 和 middleware 的长期角色需要重新定义，否则后续维护者会继续误以为 Supabase Confirm email 仍是注册主链路。

### Closed in this round

- 明确 6 位邮箱验证码是注册主链路的邮箱验证依据。
- 注册成功后不再要求用户点击 Supabase Confirm email 才能进入主应用。
- 同步认证 stable spec、领域规则文档、上线 baseline runbook 和 dev-log。
- 增加测试覆盖注册成功后邮箱验证状态、登录错误提示和 middleware 放行边界。

### Explicitly not closed

- 不做完整密码找回流程。
- 不做邮件投递监控、退信处理、域名信誉或邮件模板系统。
- 不删除 `/auth/callback` 和 `/verify-email` 的兼容入口；它们可以保留为旧账号或未来 Supabase 邮件能力兼容路径。
- 不改变邀请码、注册 IP 频控、daily quota、账号 access_status 语义。

## Risk Tracking

剩余风险记录到 `docs/dev/dev-log.md` 和 `docs/dev/public-registration-http-baseline-runbook.md`：生产环境仍必须配置 `RESEND_API_KEY` / `EMAIL_FROM`，否则 6 位验证码无法发送。
