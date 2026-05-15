# 任务清单

## Status
in_progress

## 1. 链路盘点

- [ ] 1.1 盘点当前 `toApiErrorResponse` 所有调用方与 status code 分布。
- [ ] 1.2 盘点 `logApiError` 所有调用方与 module 命名约定。
- [ ] 1.3 确认 `instrumentation.ts` 是否已存在，如无则评估接入位置。

## 2. 依赖与配置

- [ ] 2.1 安装 `@sentry/nextjs`。
- [ ] 2.2 创建 `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`。
- [ ] 2.3 创建或更新 `instrumentation.ts` 注册 Sentry。
- [ ] 2.4 在 `next.config.ts` 用 `withSentryConfig` 包裹（如需要 source map upload，留环境变量入口）。
- [ ] 2.5 在 `.env.example` 增加 `NEXT_PUBLIC_SENTRY_DSN` 占位与说明。

## 3. 代码侧接入

- [ ] 3.1 在 `src/lib/server/api-error.ts` 的 `toApiErrorResponse` 对 status >= 500 且非 AppError 的未知异常调用 `Sentry.captureException`，并注入 `requestId` tag。
- [ ] 3.2 在 `src/lib/server/logger.ts` 的 `logApiError` 添加 Sentry breadcrumb（保留现有 console 输出）。
- [ ] 3.3 配置 `beforeSend` hook 过滤敏感字段（cookie / authorization header）。
- [ ] 3.4 验证 Sentry SDK 在 DSN 缺失时 no-op（不抛错、不上报）。

## 4. 测试

- [ ] 4.1 扩展 `src/lib/server/api-error.test.ts`：5xx 未知异常调用 captureException、AppError 不调用、status 401/403 legacy 不调用。
- [ ] 4.2 单测使用 dependency injection 注入 mock Sentry hook，避免真实上报。
- [ ] 4.3 跑现有 `api-error.test.ts` 与 `middleware.test.ts` 确保不 regression。

## 5. 文档与收尾

- [ ] 5.1 更新 `docs/dev/release-readiness-assessment.md`：P1-1 标记代码侧完成，列出用户必须在 Sentry 后台与 Vercel 后台执行的步骤。
- [ ] 5.2 更新 `docs/dev/dev-log.md`：留本轮接入摘要、必要外部步骤、剩余风险。
- [ ] 5.3 spec delta `openspec/changes/add-sentry-error-tracking/specs/api-operational-guardrails/spec.md` 反映「未知服务端异常必须被错误追踪系统捕获」要求。
- [ ] 5.4 完成态收尾后归档 change 到 `openspec/changes/archive/2026-05-15-add-sentry-error-tracking/`。
- [ ] 5.5 同步更新主 stable spec `openspec/specs/api-operational-guardrails/spec.md`。
