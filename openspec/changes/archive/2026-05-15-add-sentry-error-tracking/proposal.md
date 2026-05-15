# 变更提案：接入 Sentry 错误追踪

## Status
draft

## Why

当前服务端错误处理已通过 `toApiErrorResponse` 统一收口，response body 与 header 都带 `requestId`，但 5xx 错误本身只通过 `console.error / console.warn` 输出。生产事故的可见性完全依赖 Vercel raw logs 或 Supabase logs，要按 requestId 关联、按错误率聚合、按时间分布定位都做不到。

按 `docs/dev/release-readiness-assessment.md` P1-1 评估，没有错误追踪意味着：

- 出事故只能等用户反馈，平均响应时间从分钟级退化到小时级。
- 无法判断某个错误是高频还是偶发，没法决定是回滚还是观察。
- 即使有 requestId，跨服务关联仍需手工 grep 多份日志。

requestId 链路本次已完整收口，Sentry 接入后所有 5xx 自动带 requestId，事故定位时间从「翻日志几十分钟」缩短到「点开告警直接到现场」。

## What Changes

- 引入 `@sentry/nextjs` 作为错误追踪与轻量 APM。
- 在 `instrumentation.ts` / Sentry server / client config 配置基础 sample rate 与环境过滤。
- 在 `src/lib/server/api-error.ts` 的 `toApiErrorResponse` 内对 status >= 500 且非 `AppError` 的未知异常调用 `Sentry.captureException`，并把 `requestId` 注入 Sentry scope。
- 在 `src/lib/server/logger.ts` 的 `logApiError` 同样注入 `requestId` 与 `module` 到 Sentry breadcrumb。
- DSN 通过 `NEXT_PUBLIC_SENTRY_DSN` 环境变量配置，缺失时 SDK 优雅退化为 no-op，不影响业务逻辑或测试运行。
- `.env.example` 增加 `NEXT_PUBLIC_SENTRY_DSN` 占位。
- 不接入告警规则配置（在 Sentry 后台手工配置，本次只做代码侧）。

## Capabilities

### Modified Capabilities

- `api-operational-guardrails`: 补充未知服务端异常必须被错误追踪系统捕获的最小约束；不改变 `toApiErrorResponse` 现有响应结构。

## Impact

- 新增依赖：`@sentry/nextjs`。
- 影响文件：`instrumentation.ts`、`sentry.client.config.ts`、`sentry.server.config.ts`、`sentry.edge.config.ts`、`src/lib/server/api-error.ts`、`src/lib/server/logger.ts`、`.env.example`、`next.config.ts`。
- 不改变任何 API 响应结构、不改变错误码、不改变 requestId 透传规则。
- DSN 缺失时 Sentry SDK no-op，本地开发与测试不受影响。
- 单测可用 `Sentry.init` 不调用 + dependency injection 隔离，避免单测真实上报。

## Stability Closure

### 本轮收口项

- 服务端未知 5xx 异常的可观测性：从「只在 console」升级到「Sentry 聚合 + 告警可触达」。
- requestId 链路与外部错误追踪系统打通，单次请求事故可一路追踪到 stack trace。

### 明确不收项

- 不接入告警规则（Slack/邮件 webhook）：留给 Sentry 后台手工配置，避免代码与运维耦合。
- 不接入 Sentry Performance Monitoring 的 transaction tracing：本轮只做 error tracking，避免过度采样产生超额成本。
- 不接入前端 user feedback widget：留到 P2 合规阶段一起评估。
- 不上报 4xx / 业务异常（AppError）：这些是受控错误，不应污染告警。

### 延后原因与风险记录

- Sentry Performance / Tracing 在小规模阶段成本不划算，等真正有 p95/p99 监控需求再开。
- 告警规则与 oncall 渠道与 Sentry 后台 UI 高度耦合，不适合代码内固化。

## Validation

- 单测验证 `toApiErrorResponse` 在 status >= 500 时调用 `captureException`，在 status < 500 或 AppError 时不调用。
- 单测验证 DSN 缺失时初始化不抛错。
- 本地手工触发一次 5xx，确认 Sentry SDK 的 console 输出（DSN 缺失时为 no-op log）。

## Out of Scope

- Sentry 账号创建、DSN 申请、告警规则配置：用户在 Sentry 后台执行。
- Vercel project env 配置 `NEXT_PUBLIC_SENTRY_DSN`：用户在 Vercel 控制台执行。
- 错误聚合策略调整、release tag 配置：等真实上报数据出来后再优化。
