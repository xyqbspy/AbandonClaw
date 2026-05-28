## ADDED Requirements

### Requirement: 高成本接口在匿名分支必须支持四维限流叠加
在已登录用户 user + IP 双维度限流之上,所有会触发模型、TTS、练习生成或重解析成本的接口在未登录访客访问时 MUST 同时按 anon_id 维度、IP 维度、全站匿名池维度与单匿名会话维度进行限流;任意一维触发即返回 429,MUST NOT 进入上游高成本调用。

#### Scenario: 已登录用户调用走 user + IP 双维度
- **WHEN** 已登录用户调用高成本接口
- **THEN** 系统 MUST 按现有 user + IP 双维度判定
- **AND** MUST NOT 写入或读取 `anon:quota:*` 配额计数器

#### Scenario: 匿名访客调用走四维叠加
- **WHEN** 未登录访客调用允许匿名访问的高成本接口
- **THEN** 系统 MUST 按 "IP 滑窗 QPS → IP 当日 session 数 → 全站匿名池 → 单匿名会话" 四层顺序判定
- **AND** 任意一层失败 MUST 立即返回受控 429,不进入下一层

#### Scenario: 全站匿名池打满
- **WHEN** 任一 capability 的全站匿名池当日配额耗尽
- **AND** 任意匿名访客继续调用该 capability
- **THEN** 系统 MUST 返回 429 + `code=ANON_QUOTA_EXCEEDED_GLOBAL`
- **AND** 响应 MUST 携带 `requestId`
- **AND** MUST NOT 影响已登录用户在 user 配额内的调用

### Requirement: 高成本接口必须支持匿名分支的紧急关闭通道
现有 `admin-high-cost-emergency-controls` MUST 同时对匿名访客与已登录用户生效;管理员关闭某 capability 后,匿名分支与 user 分支 MUST 同时被拒,且匿名分支拒绝 MUST 不消耗任何匿名配额计数器。

#### Scenario: 管理员关闭某高成本 capability
- **WHEN** 管理员通过 admin 控制台关闭某高成本 capability
- **AND** 匿名访客请求该 capability 对应接口
- **THEN** 系统 MUST 在四层匿名防御判定前优先拒绝
- **AND** 返回 503 + `code=HIGH_COST_CAPABILITY_DISABLED`
- **AND** MUST NOT 消耗任何 `anon:quota:*` 计数器

#### Scenario: 管理员关闭后已登录用户与匿名访客一致被拒
- **WHEN** 管理员关闭某 capability 期间
- **THEN** 已登录用户调用 MUST 返回 503 + `code=HIGH_COST_CAPABILITY_DISABLED`
- **AND** 匿名访客调用 MUST 返回相同的 503 + 相同 code
- **AND** 两者错误响应结构 MUST 一致(差异仅在 user_type 上下文)

### Requirement: 错误追踪上报必须按 user_type 维度区分匿名与已登录
所有 Sentry 错误上报、`logApiError` breadcrumb 与 Sentry context MUST 注入 `user_type` 标签(取值 `anonymous` 或 `registered`),使匿名特有的错误模式可独立排查、与已登录用户错误隔离统计。

#### Scenario: 匿名访客触发未知服务端异常
- **WHEN** 匿名访客请求受治理接口且 handler 抛出非 AppError 异常
- **AND** `toApiErrorResponse` 将其收敛为 500 响应
- **THEN** Sentry 上报事件 MUST 包含 `user_type=anonymous` 标签
- **AND** Sentry context MUST 包含 `anonymous_session` 子段(含 anonId,不含 IP 明文)

#### Scenario: 已登录用户触发未知服务端异常
- **WHEN** 已登录用户请求受治理接口且 handler 抛出非 AppError 异常
- **THEN** Sentry 上报事件 MUST 包含 `user_type=registered` 标签
- **AND** 上报内容 MUST NOT 包含匿名会话相关字段

#### Scenario: 高成本接口 catch 路径的 logApiError 调用
- **WHEN** 高成本接口在 catch 路径调用 `logApiError(module, error, { request })`
- **THEN** 上报的 breadcrumb MUST 包含 `user_type` 标签
- **AND** 标签取值 MUST 与请求实际身份一致(`anonymous` / `registered`)

### Requirement: 匿名特有的受控失败必须使用专门 AppError 子类
为避免匿名分支的受控业务失败被误识别为未知 500,所有匿名分支特有的受控失败 MUST 通过专门的 AppError 子类抛出,与现有 AppError 子类体系一致地纳入 `toApiErrorResponse` 收敛,且 MUST NOT 被上报到 Sentry。

匿名分支专属的 AppError 子类与失败类型对应关系:
- 匿名身份头缺失或非法 → `AnonIdRequiredError`(400)
- 匿名禁用功能被调用 → `AnonFeatureDisabledError`(403)
- 匿名 IP 维度限流(滑窗或 session 数) → `AnonIpRateLimitedError`(429)
- 全站匿名池配额耗尽 → `AnonQuotaExceededGlobalError`(429)
- 单匿名会话配额耗尽 → `AnonQuotaExceededSessionError`(429)

#### Scenario: 匿名禁用功能被调用
- **WHEN** 路由 handler 检测到匿名访客调用 `anonAllowed=false` 的 capability
- **THEN** 系统 MUST 抛出 `AnonFeatureDisabledError(capability)`
- **AND** 响应 MUST 是 403 + `code=ANON_FEATURE_DISABLED`
- **AND** 该异常 MUST NOT 被上报到 Sentry(属于受控失败)

#### Scenario: 匿名配额耗尽
- **WHEN** 路由 handler 检测到匿名访客触发配额耗尽
- **THEN** 系统 MUST 根据触发层抛出 `AnonQuotaExceededGlobalError` 或 `AnonQuotaExceededSessionError`
- **AND** MUST NOT 直接 `throw new Error(...)` 或返回 plain 429 JSON
- **AND** 该异常 MUST NOT 被上报到 Sentry

#### Scenario: 匿名 IP 防绕过命中
- **WHEN** 路由 handler 或中间件检测到匿名访客触发 IP 滑窗 QPS 或 IP 当日 session 数上限
- **THEN** 系统 MUST 抛出 `AnonIpRateLimitedError`
- **AND** 响应 MUST 是 429 + `code=ANON_IP_RATE_LIMITED`
- **AND** 响应 MUST NOT 暴露具体触发的 IP 阈值数字(避免提供绕过参考)
- **AND** 该异常 MUST NOT 被上报到 Sentry

### Requirement: 受治理接口的限流响应必须支持配额头透出
所有匿名分支受治理接口的成功响应与受控错误响应 MUST 携带统一的配额头集合,使前端能消费这些头直接渲染剩余次数提示,无需额外查询接口。

#### Scenario: 匿名访客成功调用受配额限制的接口
- **WHEN** 匿名访客成功调用允许匿名访问且有配额限制的接口(如 AI 表达解释)
- **THEN** 响应 MUST 携带 `X-Quota-Type` / `X-Quota-Daily-Limit` / `X-Quota-Daily-Remaining` / `X-Quota-Session-Limit` / `X-Quota-Session-Remaining` / `X-Quota-Reset-At` 完整 6 个头
- **AND** `X-Quota-Reset-At` MUST 为 ISO 8601 时间字符串

#### Scenario: 匿名访客触发配额耗尽
- **WHEN** 匿名访客触发 `ANON_QUOTA_EXCEEDED_GLOBAL` 或 `ANON_QUOTA_EXCEEDED_SESSION`
- **THEN** 错误响应 MUST 携带相同的 6 个配额头
- **AND** 对应维度的 `*-Remaining` MUST 为 0
- **AND** 前端 MUST 能基于这些头直接判定要展示 L3 哪种文案的阻断弹窗

### Requirement: 公网开放真实 HTTP baseline 必须覆盖匿名分支
当系统准备进入匿名访问公网灰度时,维护者 MUST 通过真实 HTTP 入口执行一组固定的匿名分支基线场景,补充到现有公网开放 baseline 矩阵中。

#### Scenario: 匿名灰度公网开放 baseline 执行
- **WHEN** 维护者为匿名访问做公网灰度前验证
- **THEN** baseline MUST 至少覆盖以下场景:
  - 匿名访客缺 X-Anonymous-Id 头返 400
  - 匿名访客访问允许的灰度路由正常渲染公共内容
  - 匿名访客访问 Today / 首页等非灰度路由仍要求登录
  - 匿名 AI 表达解释在配额内正常返 200 且携带配额头
  - 匿名 AI 表达解释超单会话配额返 429 `ANON_QUOTA_EXCEEDED_SESSION`
  - 同一 IP 创建超过当日上限匿名 session 后返 429 `ANON_IP_RATE_LIMITED`
  - 管理员关闭 AI 表达解释后匿名分支立即返 503
- **AND** baseline 结果 MUST 与已登录用户 baseline 一同留证

#### Scenario: env gate 关闭时的 baseline 行为
- **WHEN** `ALLOW_ANONYMOUS_TRIAL` 未开启时执行 baseline
- **THEN** 所有匿名场景 MUST 全部表现为"未登录拒绝"(即行为退化为本变更前)
- **AND** baseline MUST 将匿名场景标记为 `gated_off` 而非失败

## MODIFIED Requirements

### Requirement: 未知服务端异常必须被错误追踪系统捕获
系统 MUST 在未知服务端异常被收敛为 5xx 响应前,将其上报到错误追踪系统,并附带可关联的请求标识与 `user_type` 维度,以便维护者在不依赖原始日志的前提下定位事故并按已登录/匿名分桶分析。

为避免受控的业务失败被误识别为未知 500,所有已知失败类型 MUST 通过 `AppError` 子类抛出。常见的受控失败类型对应关系:

- 模型输出 JSON 结构异常 / 字段缺失 / schema 不匹配 → `SceneParseError`(422)
- 用户参数校验失败 → `ValidationError`(400)
- 认证失效 / token 过期 / signOut 失败 → `AuthError`(401)
- 权限不足 → `ForbiddenError`(403)
- 资源不存在 → `NotFoundError`(404)
- 限流命中 → `RateLimitError`(429)
- 日配额超出 → `DailyQuotaExceededError`(429)
- 高成本能力被管理员关闭 → `HighCostCapabilityDisabledError`(503)
- TTS 上游失败 → `TtsGenerationError`(502)
- 匿名身份头缺失或非法 → `AnonIdRequiredError`(400)
- 匿名禁用功能被调用 → `AnonFeatureDisabledError`(403)
- 匿名 IP 维度限流 → `AnonIpRateLimitedError`(429)
- 全站匿名池配额耗尽 → `AnonQuotaExceededGlobalError`(429)
- 单匿名会话配额耗尽 → `AnonQuotaExceededSessionError`(429)

#### Scenario: 未知服务端异常被收敛为 5xx
- **WHEN** 路由 handler 抛出非 AppError 的未知异常
- **AND** `toApiErrorResponse` 将其收敛为 `code=INTERNAL_ERROR` 的 500 响应
- **THEN** 系统 MUST 将该异常上报到错误追踪系统
- **AND** 上报事件 MUST 包含与响应中相同的 `requestId`
- **AND** 上报事件 MUST 包含 `user_type` 标签(`anonymous` / `registered`)

#### Scenario: 受控业务异常不上报
- **WHEN** 路由 handler 抛出 AppError 子类(包括既有的 ValidationError / AuthError / ForbiddenError / NotFoundError / RateLimitError / DailyQuotaExceededError / SceneParseError / TtsGenerationError / HighCostCapabilityDisabledError 以及新增的 AnonIdRequiredError / AnonFeatureDisabledError / AnonIpRateLimitedError / AnonQuotaExceededGlobalError / AnonQuotaExceededSessionError 等)
- **THEN** 系统 MUST NOT 将其上报到错误追踪系统
- **AND** 该异常 MUST 仍按原有 status / code / details 收敛返回

#### Scenario: 模型输出格式失败必须用 SceneParseError
- **WHEN** 路由 handler 校验外部模型返回的 JSON 结构 / 字段 / schema 失败
- **THEN** 系统 MUST 抛出 `SceneParseError`,而不是 plain `Error`
- **AND** 响应 MUST 是 422 + `code=SCENE_PARSE_ERROR`
- **AND** 该异常 MUST NOT 被上报到错误追踪系统(属于受控失败)

#### Scenario: Supabase 等外部 SDK 的受控失败必须用 AppError 子类包装
- **WHEN** 路由 handler 捕获 Supabase / 其它外部 SDK 返回的受控错误(例如 signOut 失败 / session 失效 / token 过期)
- **THEN** 系统 MUST 用对应的 AppError 子类(如 `AuthError`)重抛
- **AND** 不得直接 `throw new Error(error.message)`,否则会被 `toApiErrorResponse` 当未知 500 上报

#### Scenario: 错误追踪系统未配置
- **WHEN** `NEXT_PUBLIC_SENTRY_DSN` 或等价错误追踪 DSN 未配置
- **THEN** 系统 MUST 静默退化为 no-op,不抛错、不阻塞请求
- **AND** 业务响应行为 MUST 与配置存在时一致

### Requirement: 高成本接口失败必须通过 logApiError 注入 module 关联
所有会触发外部模型、TTS、AI enrich、AI 变体生成、AI 解析或其它高成本服务端计算的路由 handler,在异常 catch 路径 MUST 调用 `logApiError(module, error, { request, ... })`,以保证 Sentry breadcrumb 携带可识别的 module 标签、`requestId` 关联与 `user_type` 维度。

#### Scenario: 高成本接口在 catch 路径失败
- **WHEN** 高成本接口(AI 生成、TTS、AI 解析、AI enrich、AI 变体生成)在 catch 路径捕获到任意异常
- **AND** 该异常即将被 `toApiErrorResponse` 收敛为响应
- **THEN** 系统 MUST 在 catch 路径调用 `logApiError(module, error, { request })`
- **AND** `module` 标识 MUST 能唯一识别接口路径(例如 `api/scene/parse`、`api/expression-map/generate`)
- **AND** breadcrumb MUST 包含 `user_type` 标签

#### Scenario: 高成本接口的批量子任务失败
- **WHEN** 高成本接口在内部对单条子任务做 catch 并把异常转为业务状态字段(例如批量 enrich 把单条失败转为 `{status:"failed"}` 返回项)
- **THEN** 系统 MUST 在该内部 catch 路径仍然调用 `logApiError(module, error, { request, details: { ... } })`
- **AND** 不得让单条子任务的异常完全静默吞掉,导致 Sentry 收不到任何 breadcrumb

#### Scenario: 高成本接口的间接日志层
- **WHEN** 高成本接口使用 `console.error` / `console.warn` / dependency-injected `logError` 等间接日志层记录异常
- **THEN** 系统 MUST 用 `logApiError` 替代这些间接日志层
- **AND** 单元测试 MUST 通过 dependency injection 或 spy 断言 `logApiError` 被调用且 `module` 与接口路径匹配
