# API 错误响应一致性审计（2026-05-16）

本文档回答一个问题：

> 项目所有 server 入口（API routes、server actions）在错误响应、错误抛出、错误日志上对照 `api-operational-guardrails` spec 有哪些落差，按什么优先级收口？

它是一次性架构盘点，**不替代规则文档**。规则定义看 `openspec/specs/api-operational-guardrails/spec.md`；本文只列现状、落差和建议节奏。

## 0. 阅读前提

- 本审计**不重新发明错误响应规则**。规则以 `openspec/specs/api-operational-guardrails/spec.md` 为准。
- 本审计**不替代** `src/lib/server/api-error.ts`（`toApiErrorResponse`）、`src/lib/server/errors.ts`（`AppError` 子类）、`src/lib/server/logger.ts`（`logApiError`）三份基础设施实现。
- 后续若发现新落差，按本文同一格式在末尾追加新章节，不删除历史结论。

## 1. 现状盘点

### 1.1 错误响应基础设施（已有，结构完整）

| 模块 | 作用 |
| --- | --- |
| [api-error.ts](../../src/lib/server/api-error.ts) | `toApiErrorResponse(error, fallbackMessage, options)` — 三类收敛：AppError → status/code/details；legacy `Error("Unauthorized"/"Forbidden")` → 401/403；其它未知 → 500 `INTERNAL_ERROR` + `Sentry.captureException` |
| [errors.ts](../../src/lib/server/errors.ts) | 9 个 `AppError` 子类：`AuthError`(401) / `ForbiddenError`(403) / `NotFoundError`(404) / `ValidationError`(400) / `RateLimitError`(429) / `DailyQuotaExceededError`(429) / `HighCostCapabilityDisabledError`(503) / `SceneParseError`(422) / `TtsGenerationError`(502) |
| [request-context.ts](../../src/lib/server/request-context.ts) | `requestId` 生成 / 继承 / 自动注入 response header |
| [logger.ts](../../src/lib/server/logger.ts) | `logApiError(module, error, ctx)` — Sentry breadcrumb + 结构化 `console.error` |

### 1.2 入口分布

| 入口类型 | 数量 | 备注 |
| --- | --- | --- |
| `src/app/api/**/route.ts` | 58 个 | 含 admin / auth / learning / phrases / practice / review / scene / scenes / tts / expression-clusters / expression-map / csp-report 等 |
| `src/app/(app)/admin/actions.ts` | 1 个文件，~30 个 server actions | redirect-with-notice / 状态对象 / 无 try/catch 三种模式混用 |
| `lib/server/**/*.ts` service 层 | N/A | 不直接面向用户，本审计不涉及 |

### 1.3 合规率粗估

- 完全合规 route：≈ 45 / 58 ≈ 77%（用 `toApiErrorResponse` + `AppError` 子类）
- 高成本路径覆盖 `logApiError`：9 个 route（auth/signup, auth/signup/email-code, auth/resend-verification, explain-selection, practice/generate, scenes/generate, tts, tts/regenerate, scene/parse[part]）
- 高成本但**漏** `logApiError`：≈ 7 处（详见 P1）
- server actions 错误返回**无统一约定**（详见 P2）

## 2. 落差清单

每条按 **现状 → 违反规则 → 风险 → 收口建议** 描述，分级标准：

- **P0**：响应契约破坏（缺 `requestId` / 缺 `code` / 未知异常未走 toApiErrorResponse），影响事故定位。
- **P1**：高成本接口可观测性缺失（漏 `logApiError`、用 `console.error`、plain `Error` 替代 AppError），影响告警与排障。
- **P2**：模式不统一但不阻塞，未来 server action 体量增大会放大代价。
- **P3**：长期演进风险，本轮不强制处理。

### 2.1 P0：`auth/signup` GET handler 完全无 try/catch

> **状态**：2026-05-17 已落地（OpenSpec change `harden-api-error-response-consistency`）。GET handler 改为 `handleSignupGet(request, deps)`，加 try/catch + `logApiError("api/auth/signup", ...)` + `toApiErrorResponse`；新增 2 个单测覆盖 happy path 与异常路径。

**现状**：

```ts
// src/app/api/auth/signup/route.ts:42-56
export async function GET() {
  const registrationMode = await getEffectiveRegistrationMode();
  return NextResponse.json(
    {
      mode: registrationMode.mode,
      source: registrationMode.source,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
```

`getEffectiveRegistrationMode()` 是 async 函数，内部读 admin override 与 env，可能抛异常。

**违反规则**：

- `api-operational-guardrails` Requirement "未知服务端异常必须被错误追踪系统捕获" — 该 GET 异常会被 Next.js 默认 500 处理，**不带 `requestId`、不带 `code`、不上报 Sentry**。
- Requirement "受治理接口必须具备统一请求追踪标识" — 注册模式查询是公开页面的高频接口，缺 requestId 等于丢掉一次事故定位线索。

**风险**：

- 注册流程入口失败时，前端只能看到 Next.js 默认错误页或 5xx 状态码，无 requestId 可追。
- Sentry 无法聚合该路径异常，告警漏拦。

**收口建议**：

- 加 try/catch 包裹，错误走 `toApiErrorResponse(error, "Failed to load registration mode.", { request })`。
- 因为是 GET handler，参数从 `request: Request` 改为接收 request 参数（Next.js 支持）。
- 1 行 try + 1 行 catch，估算 5 行变更，附带单元测试覆盖异常路径。

### 2.2 P0：`csp-report` 两处早期返回缺 requestId / code

> **状态**：2026-05-17 已落地（同 §2.1 change）。两处早期返回改 `throw new ValidationError(...)`，统一走外层 catch + `toApiErrorResponse`；现有单测追加 `code=VALIDATION_ERROR` + `requestId` 断言。

**现状**：

```ts
// src/app/api/csp-report/route.ts:56,61
let raw: unknown;
try {
  raw = await request.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });  // ← 缺 requestId/code
}

const violation = extractViolation(raw);
if (!violation) {
  return NextResponse.json({ error: "Invalid CSP report payload." }, { status: 400 });  // ← 缺 requestId/code
}
```

**违反规则**:

- `api-operational-guardrails` Requirement "受治理接口必须具备统一请求追踪标识" — 受治理接口的所有错误响应都应携带 `requestId`。
- Requirement "限流与追踪能力必须可独立接入接口入口" — 已经接入了 `enforceRateLimit`，错误响应却绕过统一收敛。

**风险**：

- 浏览器 CSP violation 上报失败时（payload 异常），无法用 requestId 关联同一上报源。
- 与其它 401/403/429 错误返回结构不一致，前端如果未来要展示统一错误页时需要分支处理。

**收口建议**：

- 把两处早期返回改成 `throw new ValidationError("Invalid JSON payload.")` 与 `throw new ValidationError("Invalid CSP report payload.")`，由外层 `catch` 走 `toApiErrorResponse`。
- 估算 3 行变更。

### 2.3 P0：`auth/logout` 包 `throw new Error(error.message)` 产生 Sentry 噪音

> **状态**：2026-05-17 已落地（同 §2.1 change）。改 `throw new AuthError(error.message)`；POST 改 `handleLogoutPost(request, deps)` 以支持单测注入 Supabase factory；新增 2 个单测覆盖 ok 路径与 signOut 失败路径（断言 401 + `AUTH_UNAUTHORIZED`）。

**现状**：

```ts
// src/app/api/auth/logout/route.ts:5-15
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);   // ← 包成 plain Error
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to logout.", { request });
  }
}
```

**违反规则**：

- `api-operational-guardrails` Requirement "未知服务端异常必须被错误追踪系统捕获" 的反面：**受控业务异常不上报**。
  - `toApiErrorResponse` 对非 `AppError` 的 `Error` 实例，只在 message 为 "Unauthorized" / "Forbidden" 时走 legacy 401/403 通道，其它一律视为未知 → 500 + `Sentry.captureException`。
  - Supabase 的 signOut error 多数是「session 已失效」「token 过期」等受控失败，被当未知 500 上报会污染告警。

**风险**：

- 用户主动注销但 session 已过期 → Sentry 收到 "Unauthorized" 之类的 message 但被识别为未知 500（因为 toApiErrorResponse 的 legacy 通道只识别 message 精确等于 "Unauthorized" 和 "Forbidden"，Supabase 的真实 message 不会命中），告警噪音增加。

**收口建议**：

- 改为 `throw new AuthError(error.message)`（如果是 session 失效）或更具体的子类。
- 若 Supabase 错误本身就是 auth 失效语义，直接用 `AuthError`；否则用 `AppError({ message, status: 500, code: "AUTH_LOGOUT_FAILED" })`。
- 估算 3 行变更（含 import）。

### 2.4 P1：高成本 AI 路径漏 `logApiError`（7 处）

> **状态**：2026-05-17 已落地（同 §2.1 change）。7 处全部补 `logApiError(module, error, { request })`。其中 (a)/(b) 把 DI 字段 `logError` 重命名为 `logApiError`、移除间接 console.error 层；(f) `similar/generate` plain `Error("Model output is not valid JSON.")` 改 `SceneParseError`。scene/parse + scenes/import 现有单测同步更新断言。

**现状**：

| # | 文件:行 | 高成本类型 | 当前处理 |
| --- | --- | --- | --- |
| a | [scene/parse/handlers.ts:60-67](../../src/app/api/scene/parse/handlers.ts) | GLM 模型解析 | 用 `dependencies.logError` (= `console.error`)，未走 Sentry breadcrumb |
| b | [scenes/import/handlers.ts:74-81](../../src/app/api/scenes/import/handlers.ts) | GLM 模型解析 + 限流 | 用 `dependencies.logError` (= `console.error`) |
| c | [scenes/[slug]/variants/route.ts:124-126](../../src/app/api/scenes/[slug]/variants/route.ts) | AI 变体生成 | 只有 `toApiErrorResponse`，缺 `logApiError` |
| d | [phrases/manual-assist/route.ts:213-215](../../src/app/api/phrases/manual-assist/route.ts) | GLM 直接调用 | 只有 `toApiErrorResponse`，缺 `logApiError` |
| e | [expression-map/generate/route.ts:48-50](../../src/app/api/expression-map/generate/route.ts) | AI 生成 + 高成本配额 | 只有 `toApiErrorResponse`，缺 `logApiError` |
| f | [phrases/similar/generate/route.ts:31-41](../../src/app/api/phrases/similar/generate/route.ts) | AI 生成 | 漏 `logApiError`；line 37 还 throw plain `new Error("Model output is not valid JSON.")` |
| g | [phrases/similar/enrich/route.ts](../../src/app/api/phrases/similar/enrich/route.ts) | AI enrich | 只有 `toApiErrorResponse`，缺 `logApiError` |

**违反规则**：

- `api-operational-guardrails` Requirement "高成本接口必须具备统一限流基线" 隐含可观测性要求：scenario "维护者准备确认高成本接口可上线" 要求"记录至少一组延迟与状态分布结果"，没有 Sentry breadcrumb 等于丢掉路径关联。
- Requirement "外部模型调用必须具备最小失败保护" scenario "模型供应商返回异常或空内容" — 必须收敛为受控错误，但 (f) 的 `throw new Error("Model output is not valid JSON.")` 是 plain Error，走 toApiErrorResponse 后被识别为未知 → INTERNAL_ERROR + Sentry capture。**实际是受控的模型输出格式失败，应该用 `SceneParseError` 或 `ValidationError`**。

**风险**：

- 高成本路径出问题（GLM 慢 / 上游返回异常 / 模型输出 JSON 格式坏）时，Sentry 只能看到 toApiErrorResponse 的 INTERNAL_ERROR breadcrumb，无 module 关联，事故定位需要回到 raw log grep。
- (f) 把"模型输出格式异常"上报为 INTERNAL_ERROR，告警严重程度被错误标高。

**收口建议**：

- (a)/(b) 把 `dependencies.logError` 全部替换为 `logApiError("api/scene/parse" | "api/scenes/import", error, { request })`。
- (c)/(d)/(e)/(g) 在外层 catch 加一行 `logApiError("api/...", error, { request })`。
- (f) 把 `throw new Error("Model output is not valid JSON.")` 改 `throw new SceneParseError("Model output is not valid JSON.")`；同时补 `logApiError`。
- 估算 7 处共 ~25 行变更，附带每个 handler 的最小单元测试断言（"failed path 上报 logApiError"）。

### 2.5 P1：`phrases/similar/enrich-all` 内层 catch 静默吞错

> **状态**：2026-05-17 已落地（同 §2.1 change）。内层 catch 加 `logApiError("api/phrases/similar/enrich-all", error, { request, userId, details: { userPhraseId } })`，response shape 不变；外层 catch 也加 `logApiError`。

**现状**：

```ts
// src/app/api/phrases/similar/enrich-all/route.ts:57-63
} catch (error) {
  results.push({
    userPhraseId,
    status: "failed",
    error: error instanceof Error ? error.message : "Failed",
  });
}
```

**违反规则**：

- 不直接违反 spec 文字，但与 spec 整体精神冲突 — `api-operational-guardrails` Requirement "未知服务端异常必须被错误追踪系统捕获" 要求"未知异常必须上报"，**内层批处理 catch 静默把异常变成业务状态字段，结果就是这部分异常永远不会被 Sentry 捕获**。

**风险**：

- 批量 enrich 50 条，若上游 GLM 持续失败，Sentry 一条事件都不会收到，告警完全失明。
- 维护者只能从前端的 `status:"failed"` 比例反推上游异常，无法定位是哪类错误。

**收口建议**：

- 在内层 catch 加 `logApiError("api/phrases/similar/enrich-all", error, { request, details: { userPhraseId } })`。
- 不改变 response shape（仍然按 item 维度返回 `{status:"failed"}`），只补 breadcrumb。
- 估算 1 行变更。

### 2.6 P1：`scene/mutate` plain Error 替代 AppError + 漏 logApiError

> **状态**：2026-05-17 已落地（同 §2.1 change）。plain `Error` 改 `SceneParseError`；外层 catch 补 `logApiError("api/scene/mutate", ...)`；新增单测覆盖"模型输出 JSON 结构非法"路径，断言 422 + `SCENE_PARSE_ERROR`。

**现状**：

```ts
// src/app/api/scene/mutate/route.ts:133-135
if (!isValidSceneMutateResponse(parsed)) {
  throw new Error("Model output JSON does not match SceneMutateResponse basic structure.");
}
```

**违反规则**：

- 同 2.4 (f)：受控的模型输出 schema 失败应该用 `SceneParseError`(422)，不该 plain Error → INTERNAL_ERROR(500)。
- 同时高成本接口漏 `logApiError`。

**收口建议**：

- 把 `throw new Error(...)` 改 `throw new SceneParseError("Model output JSON does not match SceneMutateResponse basic structure.")`。
- 外层 catch 补 `logApiError("api/scene/mutate", error, { request })`。
- 估算 3 行变更。

### 2.7 P1：admin/actions.ts AI enrich actions 用 `console.warn`

> **状态**：2026-05-17 已落地（同 §2.1 change）。`enrichAdminPhraseAction` 与 `enrichAdminPhrasesBatchAction` 把 `console.warn` 升级为 `logApiError("admin/actions/<name>", error, { details })`，redirect-with-notice 行为不变。

**现状**：

- [admin/actions.ts:470](../../src/app/(app)/admin/actions.ts) `enrichAdminPhraseAction` 与 [:503](../../src/app/(app)/admin/actions.ts) `enrichAdminPhrasesBatchAction` 调用 AI enrichment service，失败时用 `console.warn`。

**违反规则**：

- `api-operational-guardrails` 对 server actions 没有明文约束（spec 主要面向 route handler），但 AI enrich 属于高成本路径，与上述 2.4 同质。

**风险**：

- 同 2.5：批量 enrich 失败 Sentry 看不到。

**收口建议**：

- `logApiError("admin/actions/enrichAdminPhraseAction", error, { ... })` 与 `...enrichAdminPhrasesBatchAction`，不改 redirect-with-notice 行为。
- 估算 4 行变更。

### 2.8 P2：admin/actions.ts server actions 错误返回三种模式混用

**现状**：

| 模式 | 示例 actions | 行为 |
| --- | --- | --- |
| redirect-with-notice | `updateUserAccessAction` / `setSceneStatusAction` 等大多数 | catch `ValidationError`/`NotFoundError` → `redirect(appendAdminNotice(url, msg, tone))`；其它 throw 让 Next.js error boundary 接 |
| 状态对象 | `createAdminInviteCodesAction` | 返回 `{notice, tone, codes}` 给 `useActionState` |
| 无 try/catch | `deleteSceneAction` / `toggleSceneVisibilityAction` / `regenerateSceneVariantsAction` / `syncSeedScenesAction` / `deleteAdminPhraseAction` 等 | 错误冒泡到 Next.js error boundary |

**违反规则**：

- 没有明文规则违反 — `api-operational-guardrails` spec 不覆盖 server actions。
- 但 `release-readiness-assessment.md` P1-1 "Sentry 接入" 完成后，server actions 抛出的错误**目前只在 Sentry 看到 plain Error stack，没有 module / requestId / userId 关联**，与 route handler 的可观测性不对等。

**风险**：

- 后续 server actions 体量增长（admin 后台继续加功能）后，三种模式会增加判断成本。
- 与 route handler 的可观测性不对等，admin 后台事故定位时间更长。

**收口建议**：

- **本审计不直接修**，需要单独 OpenSpec change 起草 "server action 错误返回约定"（新建 capability 段落或扩 `api-operational-guardrails`）。
- 暂时记录候选约定：
  - **Mutation server action**：catch 受控错误 → redirect-with-notice；catch 未知错误 → `logApiError("admin/actions/<name>", ...)` + 重抛让 Next.js error boundary 接。
  - **Query server action**（如果有）：与 route handler 一致使用 `toApiErrorResponse`。
- 估算 1 个独立 change，~半天工作量（含约定起草 + 现有 actions 收口 + 测试）。

### 2.9 P3：缺乏 lint 规则防回归

**现状**：

- 当前没有自动检查"高成本路径必须用 logApiError"或"不得 throw plain Error in route handler"的 lint / maintenance 规则。
- 本审计修完后，未来新增 route 时仍依靠人工 review 防回退。

**违反规则**：

- 不直接违反 spec。

**风险**：

- 时间拉长后，本次 2.4 / 2.5 / 2.6 类问题会重新滋生。

**收口建议**：

- 不本轮处理。候选记录：
  - 在 `pnpm run maintenance:check` 加一条 "高成本目录列表（practice/generate, tts, scenes/generate 等）必须 grep 到 logApiError" 的脚本检查。
  - 或在 ESLint custom rule 中检查 `src/app/api/**/route.ts` 内的 `throw new Error(...)`（强制要求用 AppError 子类）。
- 等到本审计批次 A 落地、且未来再发生一次类似回退时启动。

## 3. 推荐收口节奏

按"修复成本 / 风险 / 收益"排序：

### 批次 A（一个 OpenSpec change）

- 2.1 `auth/signup` GET 补 try/catch
- 2.2 `csp-report` 两处早期返回改抛 ValidationError
- 2.3 `auth/logout` 改用 AuthError / 具体 AppError 子类
- 2.4 (a)-(g) 七处高成本路径补 `logApiError`，其中 (f) 同时把 plain Error 改 SceneParseError
- 2.5 `phrases/similar/enrich-all` 内层 catch 补 `logApiError`
- 2.6 `scene/mutate` plain Error 改 SceneParseError + 补 `logApiError`
- 2.7 admin AI enrich actions 把 `console.warn` 升级 `logApiError`

**估算**：~50 行代码变更 + ~15 个单元测试断言。1 个 commit，跑相关 route 测试 + tsc + lint。

**建议 change-id**：`harden-api-error-response-consistency`。

### 批次 B（独立 OpenSpec change，本审计不直接做）

- 2.8 server action 错误返回约定起草并落地（含现有 ~30 个 admin actions 的迁移）

**建议 change-id**：`define-server-action-error-contract`。

### 持续观察（不主动做）

- 2.9 lint / maintenance 防回退规则

## 4. 不收项

明确**不在本审计范围内做**的事，记录原因避免后续反复争论：

- **不重写 `api-operational-guardrails` spec**。spec 已经覆盖核心约束，本审计只补"未明文但合理"的落差。
- **不引入新的 AppError 子类**。当前 9 个已能覆盖本审计涉及的所有场景（AUTH / VALIDATION / RATE_LIMIT / QUOTA / SCENE_PARSE / TTS_GENERATION / INTERNAL）。
- **不动 toApiErrorResponse 内部三类收敛策略**。`Error("Unauthorized")` / `Error("Forbidden")` legacy 通道虽然脆弱（依赖 message 字符串精确匹配），但删除需要先消灭所有依赖该通道的 throw 点，超出本轮范围。
- **不动 `csp-report` 的 204 No Content 成功响应**（不带 requestId）。CSP report 端点收到正常 payload 时按 RFC 8942 返回 204，浏览器不读 body 也不读 requestId header，不构成可观测性损失。
- **不主动重写 `admin/actions.ts` 的三种返回模式**（2.8）。属于带回归风险的较大改动，必须走独立 change。
- **不收 `lib/server/**/*.ts` 内部 service 层的错误处理**。service 层错误最终都会被 route handler / server action catch 后转 AppError 或重抛，service 层本身不直接面向用户响应，本审计仅覆盖入口层。

## 5. 相关文档

- `openspec/specs/api-operational-guardrails/spec.md` — 受治理接口的统一追踪、限流、错误收敛、Sentry 上报要求
- `src/lib/server/api-error.ts` — `toApiErrorResponse` 实现
- `src/lib/server/errors.ts` — 9 个 AppError 子类
- `src/lib/server/logger.ts` — `logApiError` 实现
- `src/lib/server/request-context.ts` — `requestId` 生成 / 透传
- `docs/dev/release-readiness-assessment.md` P1-1 — Sentry 接入背景与告警策略
- `docs/system-design/architecture-audit-2026-05-16.md` — 同期架构审计（页面组件化方向，本审计的姊妹文档）
- `AGENTS.md` §1 §7 — 修改前必做、文档维护规则
