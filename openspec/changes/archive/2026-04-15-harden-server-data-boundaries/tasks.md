## 1. 数据边界收紧

- [x] 1.1 盘点 `scene`、`learning`、`review`、`phrases` 用户态接口中的 `service role` 使用点，并区分可迁移路径与后台白名单。
- [x] 1.2 为优先迁移的用户态读写接口改成用户上下文或受限仓储入口，保持现有响应契约不变。
  - 已完成：`scene / review / phrases / expression-clusters / learning / practice / variant` 主要用户自有读写已切到 `createSupabaseServerClient` + RLS；共享 `phrases` 表和 AI enrich 也已收口到 `src/lib/server/phrases/admin-repo.ts` 白名单入口。
- [ ] 1.3 如需数据库配套，补齐最小 RLS / SQL 变更和对应说明。

## 2. 关键写入一致性

- [x] 2.1 为 `review submit`、`learning start/progress/complete`、`phrases save/save-all` 定义幂等或条件更新策略。
- [x] 2.2 在对应 `route/handler/service` 中实现幂等键、版本检查或条件更新保护。
- [x] 2.3 记录本轮未纳入一致性保护的写接口与剩余风险。

## 3. 共享限流与校验收口

- [x] 3.1 将高成本接口限流底层升级为可多实例承载的共享实现，并保留现有 helper 契约。
  - 已完成：`src/lib/server/rate-limit.ts` 升级为 Upstash REST 共享存储优先、内存 fallback 的实现；高成本路由改为 `await enforceRateLimit(...)`，并补充 `.env.example` 与 `src/lib/server/rate-limit.test.ts`。
- [x] 3.2 为高风险写接口统一参数校验入口，优先收口 `learning`、`review`、`phrases` 与高成本生成接口。
  - 已完成：已新增 `src/lib/server/request-schemas.ts`，并收口 `review submit`、`learning progress/complete`、`phrases save/save-all`、`explain-selection`、`scenes/generate`、`scenes/import`、`practice/generate` 的请求解析与 normalize 逻辑，保持原有默认值和幂等 key 不变。
- [x] 3.3 补齐第一阶段未覆盖的受保护写接口来源校验接入。

## 4. 验证与文档

- [x] 4.1 为关键写接口补充直接自动化测试，覆盖重复提交、并发提交和权限边界。
- [x] 4.2 运行受影响链路的最小测试集合与最小压测脚本，并记录结果。
  - 已完成：新增 `scripts/load-api-baseline.ts`、`scripts/load-handler-baseline.ts` 与样例 payload；HTTP 脚本已完成 `dry-run` 验证，当前环境 `preview` 未启动所以未取得真实 HTTP 基线；已在当前环境下完成 in-process handler baseline：
    - `review-submit`：30 req / 并发 5，P50 `0.38ms`，P95 `10.04ms`，平均 `2.1ms`
    - `learning-progress`：30 req / 并发 5，P50 `0.44ms`，P95 `0.65ms`，平均 `0.47ms`
    - `practice-generate`：30 req / 并发 5，P50 `0.64ms`，P95 `2.18ms`，平均 `0.9ms`
- [x] 4.3 更新 `CHANGELOG.md`、`docs/dev/dev-log.md` 与必要的维护说明。
