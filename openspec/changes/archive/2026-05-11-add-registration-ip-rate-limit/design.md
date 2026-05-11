## Context

当前 `/api/auth/signup` 已经统一到服务端入口，并且具备：

- `REGISTRATION_MODE=closed | invite_only | open`
- `invite_only` 下的邀请码校验与 attempt 记录
- 邮箱验证后的主应用访问边界
- 高成本接口的 user + IP 双维度限流

但注册入口本身还没有“同一 IP 注册频控”。这意味着攻击者可以在创建账号阶段就消耗邀请码校验、Supabase Auth 和后续 profile 创建资源，而我们只能在账号创建后再靠高成本接口限流或管理员处置止血。

本轮目标不是建设完整注册风控，而是在现有注册入口和统一限流设施上补一层最小、可维护、可测试的注册前 IP 频控。

## Goals / Non-Goals

**Goals:**

- 在 `/api/auth/signup` 为同一 IP 增加最小注册频控
- 在命中频控时，于邀请码校验和 Auth 注册前直接拒绝
- 复用现有 `enforceRateLimit` / Upstash / memory fallback 设施
- 为真实 HTTP baseline 增加注册 IP 频控场景
- 同步稳定规范、发布检查和开发记录

**Non-Goals:**

- 不做验证码、邮箱域名策略、设备指纹或 IP 信誉库
- 不做多维组合风控或自动封禁
- 不改写邀请注册、邮箱验证或 profile 创建主链路语义
- 不建设注册来源分析后台或异常 IP 趋势页

## Stability Closure

### In This Round

- 收口注册入口缺少注册前 IP 频控的缺口
- 收口“高成本接口有限流，但注册本身没限流”的治理不一致
- 收口 baseline 与 readiness checklist 对注册防护的验证要求

### Not In This Round

- 不关闭 NAT 误伤、共享出口网络误判等更复杂的限流体验问题，只做保守阈值和文档提示
- 不处理验证码、人机校验或注册域名信誉，这些需要新的产品与运营决策

## Decisions

### 1. 注册 IP 频控复用现有统一限流后端

决策：

- 继续使用 `src/lib/server/rate-limit.ts`
- 为注册入口增加独立 scope，例如 `signup:ip`
- 仍优先使用 Upstash，失败时保留 memory fallback

原因：

- 现有统一限流已覆盖 requestId、429 语义和后端状态暴露
- 不需要为注册单独引入另一套 Redis key 或新依赖

备选方案：

- 在 `registration.ts` 内独立实现一套注册频控：会造成重复语义与维护漂移
- 直接依赖 Supabase 或第三方验证码：范围明显超出本轮

### 2. 频控必须在邀请码校验和 Auth 注册前执行

决策：

- 在服务端注册入口解析完 body 和基础字段后、进入邀请码校验或 `supabase.auth.signUp()` 前执行 IP 频控

原因：

- 这样命中频控时不会继续写 `registration_invite_attempts`、不会消耗邀请码，也不会触发 Auth 注册
- 更符合“注册前止血”的目标

备选方案：

- 在 Auth 注册失败后才计数：对防滥用几乎没有价值
- 在邀请码校验后才计数：仍会让攻击者消耗数据库和邀请码查询资源

### 3. 阈值通过专用环境变量覆盖，默认值保守

决策：

- 增加注册 IP 频控专用配置，例如：
  - `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS`
  - `REGISTRATION_IP_LIMIT_WINDOW_SECONDS`
- 未配置时走保守默认值

原因：

- 注册入口和高成本接口的风险模型不同，不应共用一组阈值
- 运营可以按开放阶段单独调节注册阈值

备选方案：

- 硬编码阈值：上线后难以微调
- 复用高成本接口阈值：语义不对，也不利于维护

### 4. baseline 只补“同一 IP 注册命中 429”的最小场景

决策：

- 在公网 baseline 中增加注册 IP 频控场景
- 先验证“短窗口内同一 IP 连续注册会被拒绝”，不扩展到更复杂的组合风控场景

原因：

- 这样能把新护栏纳入真实环境留证
- 不会把 baseline 复杂度一次性拉得太高

## Risks / Trade-offs

- [共享出口 IP 误伤] -> 通过保守默认阈值和环境变量覆盖降低误伤；更复杂的白名单/信誉逻辑不在本轮
- [频控位置过晚] -> 明确在邀请码校验和 Auth 注册前执行，并用测试锁住
- [memory fallback 与多实例一致性] -> 继续沿用当前统一限流策略，并在真实环境通过 baseline 确认实际为 Upstash
- [实现分散] -> 注册频控继续复用统一限流 helper，不新建第二套限流实现

## Migration Plan

1. 为注册入口补独立 IP 频控参数与 helper 接入
2. 更新注册 route / service 与最小测试
3. 扩展公网 baseline sample / runbook / readiness checklist
4. 在目标环境配置注册频控参数并补跑真实 HTTP baseline

回滚策略：

- 若阈值过严，可先通过环境变量放宽窗口或次数
- 若注册频控实现出现问题，可移除注册入口的 helper 接入，不影响现有邀请码、邮箱验证和高成本接口限流链路

## Open Questions

- 默认阈值要按“同一 IP 每 10 分钟 3-5 次注册”还是更宽松口径落地
- `closed` 模式下是否完全跳过注册频控计数，还是保留统一拦截语义即可
