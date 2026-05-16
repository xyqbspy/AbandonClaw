# 变更提案：收口 API 错误响应一致性落差

## Status
draft

## Why

`docs/dev/api-error-response-audit-2026-05-16.md` 对照 `api-operational-guardrails` spec 盘点了 58 个 API route handler 与 admin server actions 的错误响应一致性现状，识别出 P0/P1 共 13 处具体落差：

- **3 处 P0** 破坏响应契约：`auth/signup` GET 完全没有 try/catch；`csp-report` 两处早期返回缺 `requestId`/`code`；`auth/logout` 包 `throw new Error(error.message)` 把 Supabase 受控错误污染成 INTERNAL_ERROR 上报 Sentry。
- **10 处 P1** 高成本路径可观测性缺失：7 个 AI / 模型调用 route 漏 `logApiError`；`phrases/similar/enrich-all` 内层批处理 catch 静默吞异常；`scene/mutate` 与 `phrases/similar/generate` 把"模型输出 JSON 格式异常"用 plain `Error` 抛出，被识别为 INTERNAL_ERROR；admin AI enrich actions 用 `console.warn` 代替 `logApiError`。

这些缺口的共同影响是：

- 事故发生时 Sentry 看不到 module / requestId 关联，告警严重程度被错误标定，定位时间从分钟级退化到小时级。
- 高成本 AI 路径失败被淹没在 INTERNAL_ERROR 噪音里，影响后续 SLO / 容量评估。
- `csp-report` 与 `auth/signup` GET 这两个新接入路径的错误响应与其它接口结构不一致，前端未来要做统一错误页时需要分支处理。

修复成本可控（~50 行代码 + ~15 个单元测试断言），收益是把"已经接入 Sentry 的可观测性能力"真正在高成本路径上用起来。

## What Changes

### P0 修复（响应契约）

- `src/app/api/auth/signup/route.ts` GET handler 改为接收 `request` 参数并加 try/catch，错误走 `toApiErrorResponse(error, "Failed to load registration mode.", { request })`。
- `src/app/api/csp-report/route.ts` 两处早期返回改为 `throw new ValidationError(...)`，由外层 catch 统一收敛。
- `src/app/api/auth/logout/route.ts` `throw new Error(error.message)` 改为 `throw new AuthError(error.message)`（Supabase signOut 失败语义上属于 auth 失效，不应被识别为未知 500）。

### P1 修复（高成本路径可观测性）

- 7 处 AI / 模型调用 route 补 `logApiError(module, error, { request })`：
  - `src/app/api/scene/parse/handlers.ts`（同时移除 `dependencies.logError` 的间接层）
  - `src/app/api/scenes/import/handlers.ts`（同上）
  - `src/app/api/scenes/[slug]/variants/route.ts` POST
  - `src/app/api/phrases/manual-assist/route.ts`
  - `src/app/api/expression-map/generate/route.ts`
  - `src/app/api/phrases/similar/generate/route.ts`
  - `src/app/api/phrases/similar/enrich/route.ts`
- `src/app/api/phrases/similar/enrich-all/route.ts` 内层批处理 catch 加 `logApiError("api/phrases/similar/enrich-all", error, { request, details: { userPhraseId } })`，不改 response shape。
- `src/app/api/phrases/similar/generate/route.ts:37` `throw new Error("Model output is not valid JSON.")` 改 `throw new SceneParseError(...)`。
- `src/app/api/scene/mutate/route.ts:134` `throw new Error("Model output JSON does not match...")` 改 `throw new SceneParseError(...)`，外层 catch 补 `logApiError`。
- `src/app/(app)/admin/actions.ts` `enrichAdminPhraseAction` / `enrichAdminPhrasesBatchAction` 把 `console.warn` 升级为 `logApiError`。

### Spec 补强

- `api-operational-guardrails` spec ADD 一个 Requirement："高成本接口的失败必须通过 `logApiError(module, ...)` 注入 Sentry breadcrumb"，覆盖本审计识别的 7 个 AI / 模型路径。
- 同时澄清现有 "未知服务端异常必须被错误追踪系统捕获" Requirement：受控的模型输出格式失败应当用 `SceneParseError`（422）而不是 plain Error，避免被识别为 INTERNAL_ERROR。

## Capabilities

### Modified Capabilities

- `api-operational-guardrails`: 补充"高成本接口必须通过 logApiError 注入 module 关联"与"受控的模型输出格式失败必须用 SceneParseError"两条约束。不改变 `toApiErrorResponse` 现有响应结构。

## Impact

- 影响文件：13 个 route handler / handlers / server actions 文件（修改代码），加 spec delta 与对应单元测试。
- 不改变任何成功响应结构、不改变现有 AppError 子类、不改变 `requestId` 透传规则。
- `auth/logout` 改为 `AuthError`(401) 后，旧调用方若依赖 500 响应分类的（实际不存在，前端只关心 ok / 非 ok），需要在测试中确认。
- `csp-report` 早期返回从 400 plain JSON 改为 400 with `code=VALIDATION_ERROR` + `requestId`，浏览器侧 CSP report 不会读 body，行为不变。
- `auth/signup` GET 加 try/catch 后异常路径有 `requestId`，前端轮询注册模式时若失败可以拿 requestId 联系维护者。
- 单测扩展 ~15 个断言，主要覆盖 P0/P1 的 failed path 上报路径。

## Stability Closure

### 本轮收口项

- 13 处 P0/P1 落差的最小代码修复 + spec 补强。
- 高成本 AI 路径的 Sentry breadcrumb 覆盖率从当前 ~40%（9/16+）提升到 100%。
- 消除 `phrases/similar/enrich-all` 内层 catch 静默吞错的告警盲区。
- 消除两处"模型输出格式失败被错误识别为 INTERNAL_ERROR"的告警噪音。

### 明确不收项

- **不重构 admin server actions 错误返回模式**（audit §2.8 P2）：三种模式混用属于结构性问题，需要单独 change `define-server-action-error-contract` 起草约定后再迁移，不在本轮范围。
- **不引入 lint / maintenance 规则防回归**（audit §2.9 P3）：先把现有落差修完，回归发生一次后再评估自动化规则。
- **不动 `toApiErrorResponse` 的 legacy Error 通道**（"Unauthorized"/"Forbidden" 字符串匹配）：删除该通道需要先消灭所有依赖它的旧 throw 点，超出本轮范围。
- **不引入新的 AppError 子类**：当前 9 个子类已能覆盖本审计涉及的所有场景。
- **不动 lib/server/\*\* service 层错误处理**：service 层错误最终由入口层 catch 转 AppError 或重抛，本审计仅覆盖入口层。

### 延后原因与风险记录

- server action 错误返回约定（§2.8）需要先与 admin 后台未来扩展计划对齐，避免本轮匆忙定约定后续返工。
- 自动化防回归规则（§2.9）依赖本轮修复后的稳态作为基线。

## Validation

- 单测覆盖：
  - `auth/signup` GET 异常路径（mock `getEffectiveRegistrationMode` throw，断言响应带 `requestId` + `code=INTERNAL_ERROR`）。
  - `csp-report` invalid JSON / invalid payload 两路径断言响应带 `requestId` + `code=VALIDATION_ERROR`。
  - `auth/logout` Supabase signOut 失败路径断言响应 status=401 + `code=AUTH_UNAUTHORIZED`。
  - 7 个高成本路径的 failed path 断言调用了 `logApiError`（通过 dependency injection 或 spy）。
  - `scene/mutate` 与 `phrases/similar/generate` 的"模型输出格式异常"路径断言响应 status=422 + `code=SCENE_PARSE_ERROR`。
  - admin enrich actions 失败路径断言调用了 `logApiError`。
- 不改 e2e baseline scenarios（公网开放 baseline 不涉及这些路径的失败注入，本轮也不补）。
- 验证回归范围：route handler 改动不影响主链路成功路径，运行 `pnpm run test:unit` 全过即可。

## Out of Scope

- 实际生产环境的 Sentry 告警规则调整：留给 Sentry 后台手工配置。
- `audit §2.8` server action 错误返回约定起草：独立 change `define-server-action-error-contract` 推进。
- `audit §2.9` lint / maintenance 防回归规则：等本轮落地后再评估。

## Validation Out-of-Scope Reminder

本提案不引入新的运行时依赖、不改 Next.js / Supabase / Sentry SDK 版本、不动 `next.config.ts` 的 headers / rewrites / redirects。仅在入口层补 catch / 改 throw / 加 `logApiError`，配合 spec delta 把约束写入。
