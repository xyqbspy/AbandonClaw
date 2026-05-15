# 规范文档：api-operational-guardrails

## ADDED Requirements

### Requirement: 未知服务端异常必须被错误追踪系统捕获
系统 MUST 在未知服务端异常被收敛为 5xx 响应前，将其上报到错误追踪系统，并附带可关联的请求标识，以便维护者在不依赖原始日志的前提下定位事故。

#### Scenario: 未知服务端异常被收敛为 5xx
- **WHEN** 路由 handler 抛出非 AppError 的未知异常
- **AND** `toApiErrorResponse` 将其收敛为 `code=INTERNAL_ERROR` 的 500 响应
- **THEN** 系统 MUST 将该异常上报到错误追踪系统
- **AND** 上报事件 MUST 包含与响应中相同的 `requestId`

#### Scenario: 受控业务异常不上报
- **WHEN** 路由 handler 抛出 AppError 子类（ValidationError / AuthError / ForbiddenError / NotFoundError / RateLimitError / DailyQuotaExceededError 等）
- **THEN** 系统 MUST NOT 将其上报到错误追踪系统
- **AND** 该异常 MUST 仍按原有 status / code / details 收敛返回

#### Scenario: 错误追踪系统未配置
- **WHEN** `NEXT_PUBLIC_SENTRY_DSN` 或等价错误追踪 DSN 未配置
- **THEN** 系统 MUST 静默退化为 no-op，不抛错、不阻塞请求
- **AND** 业务响应行为 MUST 与配置存在时一致
