## Why

当前公开注册入口虽然已经收口到服务端 `/api/auth/signup`，也有邀请码、邮箱验证和高成本接口限流，但“批量注册”这条最前面的滥用链路仍缺少注册前 IP 频控。继续放着不补，会让攻击者在还没进入 user/IP 双维度高成本限流前，就先把 `profiles`、邀请码尝试和认证资源刷起来。

现在补这层的优先级高于继续扩后台，因为它直接作用在账号创建前，能把后续人工处置和全站降级的压力前移收住。

## What Changes

- 在 `/api/auth/signup` 增加同一 IP 的注册频控，并在 `invite_only` / `open` 模式下于邀请码校验和 Auth 注册前执行。
- 复用现有统一限流后端，继续优先使用 Upstash，回退逻辑、`requestId` 和受控 429 语义保持一致。
- 为注册频控补充独立 scope、保守默认阈值和环境变量覆盖口径，避免把注册入口和高成本接口混在同一组限流参数里。
- 将注册 IP 频控纳入公网 baseline 与发布前清单，明确真实环境需要验证“同一 IP 注册命中 429”。
- 同步 `auth-api-boundaries` 与 `api-operational-guardrails` 稳定规范。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `auth-api-boundaries`: 注册入口需要在创建账号前执行同一 IP 频控。
- `api-operational-guardrails`: 注册频控需要复用统一限流后端、返回受控 429，并进入公网 baseline。

## Stability Closure

### In This Round
- 收口“注册入口已服务端化，但仍缺少注册前 IP 频控”的防护缺口。
- 收口公网开放计划、baseline 清单与真实注册入口之间的执行漂移。
- 收口注册拒绝语义，确保命中频控时不会继续进入邀请码扣减或 Auth 注册。

### Not In This Round
- 不做验证码、邮箱域名策略、设备指纹、IP 信誉库或全局风控评分；这些属于更重的注册风控体系。
- 不做按邮箱、设备或指纹的组合注册风控；本轮只补最小 IP 频控。
- 不扩展成完整运营分析后台；注册来源统计、异常 IP 看板和长期趋势继续留在后续阶段。

### Risk Tracking
- 更长期的注册滥用风险继续记录在 `docs/dev/public-registration-readiness-plan.md`。
- 真实环境执行与留证继续由 `docs/dev/backend-release-readiness-checklist.md` 和 baseline runbook 承接。

## Impact

- 受影响代码：
  - `src/app/api/auth/signup/route.ts`
  - `src/lib/server/registration.ts`
  - `src/lib/server/rate-limit.ts`
  - `scripts/load-public-registration-http-baseline.ts`
- 受影响文档：
  - `docs/dev/public-registration-readiness-plan.md`
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/dev/dev-log.md`
- 受影响规范：
  - `openspec/specs/auth-api-boundaries/spec.md`
  - `openspec/specs/api-operational-guardrails/spec.md`
- 风险点：
  - NAT / 公司网络下的多用户共享 IP 可能更早命中阈值
  - 若频控位置放得太靠后，仍可能先写入邀请码 attempt 或触发 Auth 调用
