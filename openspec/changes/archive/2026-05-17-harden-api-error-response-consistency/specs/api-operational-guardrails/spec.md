# 规范文档：api-operational-guardrails

## ADDED Requirements

### Requirement: 高成本接口失败必须通过 logApiError 注入 module 关联
所有会触发外部模型、TTS、AI enrich、AI 变体生成、AI 解析或其它高成本服务端计算的路由 handler，在异常 catch 路径 MUST 调用 `logApiError(module, error, { request, ... })`，以保证 Sentry breadcrumb 携带可识别的 module 标签与 requestId 关联。

#### Scenario: 高成本接口在 catch 路径失败
- **WHEN** 高成本接口（AI 生成、TTS、AI 解析、AI enrich、AI 变体生成）在 catch 路径捕获到任意异常
- **AND** 该异常即将被 `toApiErrorResponse` 收敛为响应
- **THEN** 系统 MUST 在 catch 路径调用 `logApiError(module, error, { request })`
- **AND** `module` 标识 MUST 能唯一识别接口路径（例如 `api/scene/parse`、`api/expression-map/generate`）

#### Scenario: 高成本接口的批量子任务失败
- **WHEN** 高成本接口在内部对单条子任务做 catch 并把异常转为业务状态字段（例如批量 enrich 把单条失败转为 `{status:"failed"}` 返回项）
- **THEN** 系统 MUST 在该内部 catch 路径仍然调用 `logApiError(module, error, { request, details: { ... } })`
- **AND** 不得让单条子任务的异常完全静默吞掉，导致 Sentry 收不到任何 breadcrumb

#### Scenario: 高成本接口的间接日志层
- **WHEN** 高成本接口使用 `console.error` / `console.warn` / dependency-injected `logError` 等间接日志层记录异常
- **THEN** 系统 MUST 用 `logApiError` 替代这些间接日志层
- **AND** 单元测试 MUST 通过 dependency injection 或 spy 断言 `logApiError` 被调用且 `module` 与接口路径匹配

## MODIFIED Requirements

### Requirement: 未知服务端异常必须被错误追踪系统捕获
系统 MUST 在未知服务端异常被收敛为 5xx 响应前，将其上报到错误追踪系统，并附带可关联的请求标识，以便维护者在不依赖原始日志的前提下定位事故。

为避免受控的业务失败被误识别为未知 500，所有已知失败类型 MUST 通过 `AppError` 子类抛出。常见的受控失败类型对应关系：

- 模型输出 JSON 结构异常 / 字段缺失 / schema 不匹配 → `SceneParseError`(422)
- 用户参数校验失败 → `ValidationError`(400)
- 认证失效 / token 过期 / signOut 失败 → `AuthError`(401)
- 权限不足 → `ForbiddenError`(403)
- 资源不存在 → `NotFoundError`(404)
- 限流命中 → `RateLimitError`(429)
- 日配额超出 → `DailyQuotaExceededError`(429)
- 高成本能力被管理员关闭 → `HighCostCapabilityDisabledError`(503)
- TTS 上游失败 → `TtsGenerationError`(502)

#### Scenario: 未知服务端异常被收敛为 5xx
- **WHEN** 路由 handler 抛出非 AppError 的未知异常
- **AND** `toApiErrorResponse` 将其收敛为 `code=INTERNAL_ERROR` 的 500 响应
- **THEN** 系统 MUST 将该异常上报到错误追踪系统
- **AND** 上报事件 MUST 包含与响应中相同的 `requestId`

#### Scenario: 受控业务异常不上报
- **WHEN** 路由 handler 抛出 AppError 子类（ValidationError / AuthError / ForbiddenError / NotFoundError / RateLimitError / DailyQuotaExceededError / SceneParseError / TtsGenerationError / HighCostCapabilityDisabledError 等）
- **THEN** 系统 MUST NOT 将其上报到错误追踪系统
- **AND** 该异常 MUST 仍按原有 status / code / details 收敛返回

#### Scenario: 模型输出格式失败必须用 SceneParseError
- **WHEN** 路由 handler 校验外部模型返回的 JSON 结构 / 字段 / schema 失败
- **THEN** 系统 MUST 抛出 `SceneParseError`，而不是 plain `Error`
- **AND** 响应 MUST 是 422 + `code=SCENE_PARSE_ERROR`
- **AND** 该异常 MUST NOT 被上报到错误追踪系统（属于受控失败）

#### Scenario: Supabase 等外部 SDK 的受控失败必须用 AppError 子类包装
- **WHEN** 路由 handler 捕获 Supabase / 其它外部 SDK 返回的受控错误（例如 signOut 失败 / session 失效 / token 过期）
- **THEN** 系统 MUST 用对应的 AppError 子类（如 `AuthError`）重抛
- **AND** 不得直接 `throw new Error(error.message)`，否则会被 `toApiErrorResponse` 当未知 500 上报

#### Scenario: 错误追踪系统未配置
- **WHEN** `NEXT_PUBLIC_SENTRY_DSN` 或等价错误追踪 DSN 未配置
- **THEN** 系统 MUST 静默退化为 no-op，不抛错、不阻塞请求
- **AND** 业务响应行为 MUST 与配置存在时一致
