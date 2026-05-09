## Why

当前项目已经具备小规模内测的基础账号、RLS、限流和错误收口能力，但如果直接开放注册，仍存在批量注册、未验证邮箱进入主应用、单用户限流被多账号绕过，以及公网环境误用 memory-only 限流等硬风险。

本轮只处理“可以公开给 10-50 人前”的 P0-A 硬门槛，让注册入口和高成本接口先进入受控开放状态，不提前建设每日额度、封禁后台或完整运营平台。

## What Changes

- 新增注册模式开关，支持 `closed`、`invite_only`、`open`，公网小范围开放默认使用 `invite_only`。
- 新增邀请码注册能力，邀请码具备 `max_uses`、`used_count`、可选 `expires_at`，并记录使用尝试，避免注册和扣次数不一致后不可追踪。
- 强化邮箱验证边界：邮箱未验证用户不能进入主应用或创建学习数据，只能停留在认证/验证提示路径。
- 高成本接口升级为 user + IP 双维度限流，优先覆盖 practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate。
- 公网环境暴露并检查限流后端状态；小范围公网开放不接受无提示的 memory-only 限流。
- 补真实 HTTP baseline，覆盖注册模式、邀请码、邮箱验证、user/IP 限流和 Origin 拒绝。
- 同步公网开放准备文档、上线检查清单、stable spec 和 dev-log。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `auth-api-boundaries`: 注册入口必须受注册模式控制；invite-only 注册必须校验邀请码并记录使用尝试；未验证邮箱不得进入主应用。
- `api-operational-guardrails`: 公网小范围开放前，高成本接口必须支持 user + IP 双维度限流，并能暴露/验证共享限流后端状态。
- `project-maintenance`: 公网注册或高成本接口开放前，必须记录 P0-A 真实 HTTP baseline 和剩余风险。

## Impact

- 页面：
  - `src/app/(auth)/signup/page.tsx`
  - 可能新增邮箱验证提示页或复用认证布局内提示
- API / 服务：
  - 新增或调整注册服务端入口
  - `middleware.ts`
  - `src/lib/server/auth.ts`
  - `src/lib/server/rate-limit.ts`
  - 高成本 API routes
  - admin/status 或等价状态查询
- 数据库：
  - 新增邀请码与邀请码使用尝试相关 SQL
- 文档：
  - `docs/dev/public-registration-readiness-plan.md`
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/dev/dev-log.md`
  - stable spec delta
- 测试：
  - 注册模式和邀请码测试
  - middleware 未验证邮箱拦截测试
  - user + IP 限流测试
  - 高成本接口 429 / requestId 测试
  - 真实 HTTP baseline 记录

## Stability Closure

### 本轮暴露的不稳定点

- 注册入口当前缺少产品级开关，无法快速从公开注册切回关闭或 invite-only。
- 邀请码如果只用单个环境变量，泄露后无法按 code 管理使用次数或追踪注册尝试。
- Supabase 发出验证邮件不等于主应用入口已经阻止未验证邮箱用户。
- 高成本接口已有用户维度限流，但批量账号可通过同 IP 绕过。
- 生产环境 Redis 限流配置缺失时，目前容易退化为 memory-only 而不被维护者感知。

### 本轮收口项

- 注册模式、邀请码、邮箱验证主应用拦截。
- 高成本接口 user + IP 双维度限流。
- 限流后端状态可见和上线检查。
- P0-A 真实 HTTP baseline。

### 明确不收项

- 不做每日 AI / TTS 额度和 quota 预占。
- 不做 `profiles.access_status`、`generation_limited`、`readonly` 或封禁后台。
- 不做学习时长 delta 上限或 session heartbeat。
- 不做完整运营后台、成本趋势、异常用户列表或 BI。
- 不做 DDoS 防护；DDoS 仍由平台、CDN 或 WAF 层处理。

### 延后原因与风险记录

这些项目属于 P0-B / P1 / P2，若混入本轮会把 10-50 人小范围开放前的硬门槛膨胀成平台化建设。剩余风险记录在 `docs/dev/public-registration-readiness-plan.md`，后续按 P0-B 继续拆分。
