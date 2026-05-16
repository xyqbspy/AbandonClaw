# 任务清单：收口 API 错误响应一致性落差

## Status
in_progress

## 实施

### P0 修复（响应契约）

- [x] `src/app/api/auth/signup/route.ts` GET handler 改为 `handleSignupGet(request, deps)` + 加 try/catch + `toApiErrorResponse(error, "Failed to load registration mode.", { request })`。
- [x] `src/app/api/csp-report/route.ts:56,61` 两处早期返回改 `throw new ValidationError(...)`。
- [x] `src/app/api/auth/logout/route.ts:10` `throw new Error(error.message)` 改 `throw new AuthError(error.message)`；同时把 POST 改为 `handleLogoutPost(request, deps)` 以支持单测注入。

### P1 修复（高成本路径可观测性）

- [x] `src/app/api/scene/parse/handlers.ts` 把 `dependencies.logError` 替换为 `dependencies.logApiError`，catch 内改 `logApiError("api/scene/parse", error, { request })`；更新 DI 接口、默认依赖、单测 mock。
- [x] `src/app/api/scenes/import/handlers.ts` 同上，改 `logApiError("api/scenes/import", error, { request })`。
- [x] `src/app/api/scenes/[slug]/variants/route.ts` POST catch 补 `logApiError("api/scenes/[slug]/variants", error, { request })`。
- [x] `src/app/api/phrases/manual-assist/route.ts` catch 补 `logApiError("api/phrases/manual-assist", error, { request })`。
- [x] `src/app/api/expression-map/generate/route.ts` catch 补 `logApiError("api/expression-map/generate", error, { request })`。
- [x] `src/app/api/phrases/similar/generate/route.ts`:
  - line 37 `throw new Error("Model output is not valid JSON.")` 改 `throw new SceneParseError(...)`。
  - 外层 catch 补 `logApiError("api/phrases/similar/generate", error, { request })`。
- [x] `src/app/api/phrases/similar/enrich/route.ts` catch 补 `logApiError("api/phrases/similar/enrich", error, { request })`。
- [x] `src/app/api/phrases/similar/enrich-all/route.ts:57-63` 内层 catch 加 `logApiError("api/phrases/similar/enrich-all", error, { request, userId, details: { userPhraseId } })`；外层 catch 也加 `logApiError`；不改 response shape。
- [x] `src/app/api/scene/mutate/route.ts:134` `throw new Error("Model output JSON does not match...")` 改 `throw new SceneParseError(...)`；外层 catch 补 `logApiError("api/scene/mutate", error, { request })`。
- [x] `src/app/(app)/admin/actions.ts` `enrichAdminPhraseAction` 与 `enrichAdminPhrasesBatchAction` 把 `console.warn` 升级为 `logApiError("admin/actions/<name>", error, { details })`。

### Spec 与文档

- [x] 更新 `openspec/changes/harden-api-error-response-consistency/specs/api-operational-guardrails/spec.md` spec delta：ADD "高成本接口必须通过 logApiError 注入 module 关联" + MODIFIED "未知服务端异常必须被错误追踪系统捕获"（补 SceneParseError / AuthError 包装约束）。
- [x] 在 `docs/dev/dev-log.md` 追加本轮实施摘要。
- [x] `docs/dev/api-error-response-audit-2026-05-16.md` §2.1–§2.7 追加状态标注。
- [x] 完成本轮已识别稳定性缺口的最小必要收口。
- [x] 明确记录本轮不收项（§2.8 server action 约定 / §2.9 lint 规则）。

## 验证

- [x] 新增 `auth/signup` GET 异常路径单测：mock `getEffectiveRegistrationMode` throw，断言响应带 `requestId` + status=500 + `code=INTERNAL_ERROR`（同时增 happy path 测试覆盖 status=200 + mode/source 字段）。
- [x] 强化 `csp-report` invalid JSON / invalid payload 两个单测路径：追加断言响应带 `requestId` + `code=VALIDATION_ERROR`。
- [x] 新增 `auth/logout` 两个单测：signOut 成功路径 + Supabase signOut 失败路径断言 status=401 + `code=AUTH_UNAUTHORIZED`。
- [x] 新增 `scene/mutate` "模型输出 JSON 结构非法" 路径单测：断言 status=422 + `code=SCENE_PARSE_ERROR`。
- [x] 更新 `scene/parse` 与 `scenes/import` 现有 422 单测：从断言 logError 调用次数改为断言 logApiError 收到正确 module + error 类型。
- [x] 跑 `pnpm run lint`（0 errors，2 pre-existing warnings 与本轮无关）。
- [x] 跑 `pnpm run text:check-mojibake`（未发现高置信度乱码）。
- [x] 跑 `pnpm run test:unit`（473 tests，472 pass，1 fail 为预先存在的 `practice/set GET` 失败，与本轮无关；本轮修改 / 新增的 22 个测试全过）。
- [x] 跑 `pnpm exec openspec validate harden-api-error-response-consistency --strict`。
- [x] 跑 `pnpm run maintenance:check`（仅报本 change tasks 未完成 + 2 个预先存在 change 未完成，无新增失败）。
- [x] 检查本轮未收口项已记录原因与风险（见 proposal.md Stability Closure / 不收项与延后原因小节）。

## 文档

- [x] 更新 `docs/dev/api-error-response-audit-2026-05-16.md` §2.1–§2.7 标注 "本 change 已落地"。
- [x] 更新 `docs/dev/dev-log.md` 追加本轮收口项 / 明确不收项 / 验证结果。
- [ ] 本次完成态收尾若直接进入 `main` 且存在用户可感知变化（例如 `auth/logout` 状态码 500→401），再更新正式 `CHANGELOG.md`。
