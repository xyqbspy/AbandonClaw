## Context

项目当前注册由 `src/app/(auth)/signup/page.tsx` 直接调用 Supabase Browser Client 的 `auth.signUp()` 完成。这个路径适合开发和内测，但不适合公网受控开放，因为项目层无法在账号创建前稳定执行注册模式、邀请码、使用次数和使用尝试记录。

高成本接口已经有 `enforceRateLimit()`，并支持 Upstash Redis 优先、失败回退 memory。但当前接口多以 user id 为 key，批量账号可从同一 IP 绕过；同时维护者不容易在公网开放前确认当前限流后端是否真的为共享 Redis。

邮箱验证目前依赖 Supabase 配置和登录流程本身，但主应用入口还需要明确阻止未验证邮箱用户继续创建学习数据。

## Goals / Non-Goals

**Goals:**

- 让注册入口进入 P0-A 受控开放状态。
- 支持 `REGISTRATION_MODE=closed | invite_only | open`。
- `invite_only` 下通过数据库邀请码校验注册，并记录 invite usage attempt。
- 邮箱未验证用户不得进入主应用主链路。
- 高成本接口同时按 user id 和 IP 限流。
- 管理员能确认当前限流后端是 `upstash` 还是 `memory`。
- 记录并验证真实 HTTP baseline。

**Non-Goals:**

- 不做每日 AI / TTS quota、usage 预占或成本报表。
- 不做 `profiles.access_status`、`generation_limited`、`readonly`。
- 不做学习时长 delta 上限或 session heartbeat。
- 不做完整运营后台、异常用户列表或封禁 UI。
- 不处理 DDoS；DDoS 交给平台、CDN 或 WAF。

## Decisions

### 1. 注册改为服务端受控入口

注册页不再直接调用 Supabase Browser Client 的 `auth.signUp()`，而是提交到项目服务端 API。服务端入口负责：

- 读取 `REGISTRATION_MODE`。
- 在 `closed` 时拒绝注册。
- 在 `invite_only` 时校验邀请码。
- 调用 Supabase Auth 创建账号。
- 记录邀请码使用尝试和最终状态。

原因：

- 注册模式和邀请码属于服务端安全边界，不能只放前端判断。
- 邀请码使用次数和 attempt 记录需要可信写入路径。

替代方案：

- 继续前端 `auth.signUp()`，只在前端加邀请码输入。
  - 放弃：用户可绕过前端直接调用 Supabase Auth，项目层无法保证邀请码语义。

### 2. 邀请码使用表 + 使用尝试表

最小数据结构建议：

- `registration_invite_codes`
  - `id`
  - `code_hash`
  - `max_uses`
  - `used_count`
  - `expires_at`
  - `is_active`
  - `created_at`
  - `updated_at`
- `registration_invite_attempts`
  - `id`
  - `invite_code_id`
  - `email`
  - `status`
  - `auth_user_id`
  - `failure_reason`
  - `created_at`

邀请码原文不落库，服务端对输入 code 做 hash 后匹配。

原因：

- 单一 `INVITE_CODE` 泄露后无法止损。
- `max_uses` / `used_count` 可以控制邀请规模。
- attempt 记录可以追踪“校验通过但账号创建失败 / 账号创建成功但扣次数失败”的边界情况。

一致性策略：

- 先创建 `pending` attempt。
- 再调用 Supabase Admin 创建用户。
- 创建成功后在数据库中递增 `used_count` 并标记 attempt 为 `used`。
- 如果扣次数失败，attempt 标记为 `needs_repair`，保留 `auth_user_id`，供管理员补偿。

### 3. 邮箱验证在主应用入口拦截

登录用户如果邮箱未验证：

- 允许访问认证相关页面和验证提示页。
- 禁止进入 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson` 等主应用页面。
- 禁止调用会创建学习数据或高成本资源的受保护 API。

实现上优先在 `middleware.ts` 做页面级拦截，在需要强保证的 API 入口复用服务端 helper 检查。

原因：

- Supabase 发验证邮件不等于主应用已经阻止未验证用户继续使用。
- 防止未验证垃圾账号创建学习数据或触发高成本接口。

### 4. 高成本接口执行 user + IP 双维度限流

新增公共 helper，例如：

- `getClientIp(request)`
- `enforceHighCostRateLimit({ request, userId, scope, userLimit, ipLimit, windowMs })`

该 helper 对同一接口执行两个 key：

- `user:${userId}`
- `ip:${clientIp}`

原因：

- user 维度保护单账号。
- IP 维度降低批量账号从同一出口绕过的风险。

client IP 策略：

- 先按部署平台确认可信 header。
- 本轮实现需要有明确 fallback。
- 文档记录当前信任顺序，避免后续部署迁移时误判。

### 5. 限流后端状态可见

`rate-limit.ts` 增加只读状态能力，例如：

- `getRateLimitBackendStatus(): { kind: "upstash" | "memory"; configured: boolean }`

管理员状态入口展示该状态。公网小范围开放前 baseline 必须记录当前为 `upstash`。

原因：

- 当前 fallback 到 memory 是可用性优先，但公网开放时 memory-only 不是充分保护。
- 维护者需要在上线前明确看到配置状态。

### 6. 真实 HTTP baseline 作为完成定义

本轮完成不能只依赖单测。需要记录真实 HTTP 验证结果，至少覆盖：

- `closed` 注册失败。
- `invite_only` 无邀请码失败。
- `invite_only` 有邀请码成功。
- 未验证邮箱不能进入主应用。
- 登录后高成本接口正常。
- 同 user 限流返回 429。
- 同 IP 多账号限流返回 429。
- Origin 不匹配的写请求被拒绝。

## Risks / Trade-offs

- [Supabase Auth 与邀请码扣次数无法天然同事务] → 使用 attempt 记录和 `needs_repair` 状态保留补偿依据。
- [middleware 只做页面拦截不够] → 高成本和关键写 API 仍需要服务端 helper 检查邮箱验证状态。
- [IP header 被伪造] → 只信任部署平台明确提供的 header，并在文档中记录；本地 fallback 只用于开发。
- [Redis 故障时 fallback 到 memory] → 保留可用性 fallback，但 admin/status 和 baseline 必须暴露当前状态。
- [P0-A 不包含每日 quota] → 小范围熟人内测可接受；公开渠道前必须继续做 P0-B。

## Migration Plan

1. 新增邀请码 SQL，默认不影响现有用户。
2. 增加注册服务端 API 和注册页改造。
3. 增加邮箱验证拦截和提示路径。
4. 增加 user + IP 限流 helper，并迁移高成本接口。
5. 增加 admin/status 限流后端状态。
6. 补测试和真实 HTTP baseline。
7. 同步文档、stable spec、dev-log。

回滚策略：

- 若邀请码注册异常，可临时切 `REGISTRATION_MODE=closed`。
- 若 user + IP 限流误伤，可调宽 IP 阈值，但不回退到无 IP 限流。
- 若邮箱验证拦截误伤，可先只允许验证提示页和重发邮件路径，继续阻止主链路数据写入。

## Open Questions

- 生产部署平台最终信任的 client IP header 是哪个，需要在实现时按实际部署环境确认并记录。
- 邮箱验证提示页是否支持重发验证邮件，本轮可先只提示，不作为硬要求。

## Stability Closure

### 本轮收口

- 注册模式和邀请码从前端体验提升为服务端边界。
- 未验证邮箱从“依赖 Supabase 配置”提升为主应用入口规则。
- 高成本接口从单 user 限流提升为 user + IP 双维度限流。
- 限流后端从隐式 fallback 提升为可见状态。

### 明确不收

- P0-B 的每日额度、usage 预占、封禁状态、学习时长 delta 上限。
- P1/P2 的后台、趋势、风控评分和 heartbeat。

### 风险去向

- P0-B 及后续风险继续记录在 `docs/dev/public-registration-readiness-plan.md`。
