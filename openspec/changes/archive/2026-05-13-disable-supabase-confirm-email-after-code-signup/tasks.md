## 1. Implementation

- [x] 1.1 更新注册服务，使项目 6 位邮箱验证码校验成功并创建 Supabase Auth 用户后，该用户满足邮箱已验证判定。
- [x] 1.2 保留 `/auth/callback` 与 `/verify-email` 兼容入口，但不再把它们作为新注册主链路的必需步骤。
- [x] 1.3 保持邀请码校验、邀请码扣减、注册 attempt 记录和验证码消费顺序不回退。
- [x] 1.4 收口登录错误提示：对 `invalid_credentials` 给出安全、可理解的中文提示，不拆分邮箱存在性。

## 2. Tests

- [x] 2.1 更新或新增 `registration` / `signup route` 测试，覆盖注册成功后邮箱确认状态。
- [x] 2.2 更新或新增 middleware 测试，覆盖项目验证码注册成功用户不会被 `/verify-email` 重复拦截。
- [x] 2.3 新增登录页交互测试，覆盖 `invalid_credentials` 的中文安全提示。
- [x] 2.4 运行最小相关测试：认证注册、邮箱验证码、middleware、登录页与 baseline runner 测试。

## 3. Documentation and Baseline

- [x] 3.1 同步 `openspec/specs/email-verification-flow/spec.md` 与 `openspec/specs/auth-api-boundaries/spec.md`。
- [x] 3.2 同步 `docs/domain-rules/auth-api-boundaries.md`、`docs/dev/public-registration-http-baseline-runbook.md` 和 `docs/dev/backend-release-readiness-checklist.md`。
- [x] 3.3 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项、验证结果和剩余风险。
- [x] 3.4 修复生产邮件 provider 后，补跑 `signup-email-code-sent` 与 `invite-only-signup-with-invite-succeeds` baseline，或记录阻断原因。

## 4. Completion

- [x] 4.1 对照 proposal / design / spec delta 做实现 Review。
- [x] 4.2 运行 `pnpm run maintenance:check`、`git diff --check` 和必要的 OpenSpec 校验。
- [x] 4.3 完成 stable spec 同步与 OpenSpec archive。

## Explicit Non-Goals

- 不做密码找回完整流程。
- 不做邮件投递监控、退信处理、域名信誉或模板系统。
- 不批量迁移历史未确认账号；如生产已有旧账号，单独通过后台或 Supabase 控制台处理。
- 不改变邀请码、注册 IP 频控、daily quota 或账号 access_status 语义。
