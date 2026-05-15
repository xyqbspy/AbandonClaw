# 设计说明：接入 Sentry 错误追踪

## Status
draft

## Current Flow

当前服务端错误处理：

- 路由 catch block → `toApiErrorResponse(error, fallback, { request })`
- AppError → 透传 message/code/details
- 非 AppError → 收敛为 `{ error: fallback, code: "INTERNAL_ERROR", requestId }` + status 500
- 部分关键路由（auth/signup、tts、explain-selection、scenes/generate、practice/generate）会调用 `logApiError(module, error, { request })` → `console.error`
- 没有错误聚合、告警、stack trace 跨服务关联能力

## Problem

- 5xx 错误只在 console，生产事故响应依赖人工捞日志。
- 无法回答「最近 10 分钟错误率是多少」「这个错误是 1 次还是 100 次」。
- requestId 已经做完链路了，但没有外部系统消费它做事故聚合。

## Stability Closure

### 本轮收口项
- 未知 5xx 异常的外部告警与聚合能力。
- requestId 与 Sentry event 关联，单次请求出事可一键定位 stack trace。

### 明确不收项
- Sentry Performance / Tracing：成本不划算，留 P2。
- 告警规则与 oncall 渠道：Sentry 后台手工配置，避免代码与运维耦合。

## Decision

### 选型：Sentry vs 其他

| 选项 | 优点 | 缺点 | 决策 |
| --- | --- | --- | --- |
| Sentry | Next.js 一等公民、免费版 5k errors/月够用、生态完整 | 需独立账号 | ✓ 选用 |
| Vercel Observability | 与 Vercel 部署天然集成 | 功能弱、错误聚合粒度差、跨环境难 | ✗ 备选 |
| 自建 ELK | 完全控制 | 运维成本极高，与本期目标不匹配 | ✗ |

### 集成方式

使用官方 `@sentry/nextjs` 包，按 Next.js 14 App Router 推荐方式：

- `instrumentation.ts`：Node.js / Edge runtime 入口注入 Sentry。
- `sentry.client.config.ts`：浏览器端 Sentry 初始化。
- `sentry.server.config.ts`：服务端 Sentry 初始化。
- `sentry.edge.config.ts`：Edge runtime（middleware）Sentry 初始化。

### DSN 缺失行为

`Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })`：

- DSN 为 undefined 或空字符串时，Sentry SDK 内部 no-op，不上报、不抛错。
- 本地开发、CI、测试环境可以不配 DSN。
- 生产环境必须在 Vercel project env 配置。

### captureException 接入位置

只在 `toApiErrorResponse` 内对**未知异常**捕获：

```ts
// src/lib/server/api-error.ts
if (!isAppError(error) && !(error instanceof Error && status !== 500)) {
  Sentry.withScope((scope) => {
    scope.setTag("requestId", requestId);
    Sentry.captureException(error);
  });
}
```

不在每个 route catch block 重复调用，避免散落。

`logApiError` 内额外加 breadcrumb，提供模块上下文：

```ts
Sentry.addBreadcrumb({
  category: "api",
  message: `${module} failed`,
  level: "error",
  data: { requestId, errorMessage: toErrorMessage(error) },
});
```

### 不上报的错误

- AppError 子类（ValidationError / AuthError / ForbiddenError / NotFoundError / RateLimitError / DailyQuotaExceededError / SceneParseError / TtsGenerationError）：这些是受控业务异常，不应触发告警。
- 4xx 错误：客户端错误，不上报。
- 通过 `mapLegacyMessageToStatus` 识别为 401/403 的 legacy Error：不上报。

### 测试策略

`toApiErrorResponse` 现有单测扩展：

- 用 `Sentry.captureException` mock 验证 5xx 未知异常会调用、AppError 不会调用。
- 用 dependency injection 让 `toApiErrorResponse` 内部 Sentry hook 可替换，避免真实上报。

## Risks

| 风险 | 缓解 |
| --- | --- |
| Sentry SDK 自身异常拖慢请求 | SDK 内部异步 + 超时机制；DSN 缺失 no-op |
| 误把 PII 上报到 Sentry | beforeSend hook 过滤敏感字段；只上报 stack trace + requestId |
| 单测意外触发真实上报 | 测试环境 DSN 始终未设置，且通过 dependency injection 隔离 |
| 引入大依赖增加 bundle | `@sentry/nextjs` 官方做了 tree-shaking；client bundle 增加约 20-30KB gzip |

## Validation

- 单测：`toApiErrorResponse` 在 5xx 未知异常时调用 captureException，AppError 不调用。
- 单测：DSN 缺失时 Sentry init 不抛错。
- 本地：触发一次未知 5xx，确认 console 输出包含 Sentry no-op 日志（无 DSN 时）。
- 上线后：在 Sentry 后台确认收到第一条事件，且包含 requestId tag。
