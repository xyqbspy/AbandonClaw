## Why

Review 已经从单次 `again / hard / good` 推进到递进式练习，但当前正式信号只覆盖熟悉度、输出信心和完整输出是否开始。变体改写仍停留在本地草稿，完整输出也缺少可被服务端稳定解释的目标表达覆盖结果，导致“迁移”和“真实输出”这两层学习价值无法可靠进入后续调度与聚合。

本轮要把递进式练习里最接近产品北极星的两段收成正式、保守、可测试的后端信号：用户是否完成变体改写，以及完整输出是否确定性命中目标表达；先不引入 AI 评分或复杂个性化调度。

## What Changes

- 为普通表达 review 提交增加变体改写正式信号：
  - `variant_rewrite_status`: `completed` / `not_started`
  - `variant_rewrite_prompt_id`: 固定改写方向 id，未完成时为空
- 为完整输出增加确定性覆盖信号：
  - `full_output_coverage`: `contains_target` / `missing_target` / `not_started`
  - 覆盖判断只基于目标表达、用户完整输出文本和确定性归一化，不调用 AI。
- 服务端提交链路在保留 `again / hard / good` 主反馈的同时写入新增信号，并继续保持幂等提交。
- review due 排序与下一次间隔在现有规则基础上保守消费新增信号：
  - 完成改写但未命中完整输出，优先提示继续补完整输出。
  - 未完成改写的条目不得被解释为已经具备迁移能力。
- 服务端 review summary 增加稳定聚合字段，供 review / today 后续展示消费；页面不得直接解释原始日志。
- 页面阶段展示要去掉“这部分只是 TODO”的误导口径，改为展示正式信号边界与降级路径。
- 同步 review system-design 文档、dev-log、最小相关测试。

## Capabilities

### New Capabilities

无。继续复用现有 review capability，避免把同一学习语义拆散。

### Modified Capabilities

- `review-progressive-practice`: 明确变体改写与完整输出覆盖升级为正式信号后的阶段边界、降级路径和页面展示约束。
- `review-practice-signals`: 扩展正式信号边界、落库语义、聚合摘要与历史兼容规则。
- `review-scheduling-signals`: 扩展 due 排序与下一次复习节奏如何保守消费新增正式信号。

## Impact

- 代码：
  - `src/app/(app)/review/page.tsx`
  - `src/app/(app)/review/review-page-stage-panel.tsx`
  - `src/app/(app)/review/review-page-selectors.ts`
  - `src/app/api/review/handlers.ts`
  - `src/lib/server/request-schemas.ts`
  - `src/lib/server/review/service.ts`
  - `src/lib/server/learning/service.ts`
- 数据库：
  - 新增 `phrase_review_logs` 字段与 check constraint 的 Supabase migration。
- 文档：
  - `docs/system-design/review-progressive-practice.md`
  - `docs/system-design/review-practice-signals.md`
  - `docs/domain-rules/review-scheduling-rules.md`
  - `docs/feature-flows/review-writeback.md`
  - `docs/dev/dev-log.md`
- 测试：
  - review 页面交互测试
  - review selectors / labels 相关测试
  - review submit handler 测试
  - review service logic / summary / scheduling 测试
  - today/learning 聚合消费的最小相关测试

## 稳定性收口

本轮暴露的不稳定点：

- 递进式 review 的页面阶段和正式后端信号边界仍有残留不一致：文档里仍标记变体改写与完整输出分析为 TODO，但产品体验已经把它们作为训练主流程展示。
- 完整输出目前只有 `completed / not_started`，不能区分“写了内容但没有用到目标表达”和“真正完成目标表达输出”。
- 调度规则已经消费部分正式信号，如果继续扩展页面阶段但不补后端契约，会再次出现页面训练深度与调度解释不一致。

本轮收口：

- 收口变体改写完成状态与固定方向 id。
- 收口完整输出的确定性目标表达覆盖结果。
- 收口新增信号的 API schema、落库、聚合摘要、调度解释、页面提交与文档归属。

明确不收：

- 不做 AI 自然度、语法、语气或命中率评分。
- 不把用户改写草稿和完整输出全文沉淀为长期表达资产。
- 不重写 `again / hard / good` 主调度算法。
- 不让 `today` 直接读取原始 `phrase_review_logs`。
- 不调整 scene practice 回补链路。

延后原因与风险记录：

- AI 评分和全文资产化会引入隐私、成本、失败降级和质量解释问题，需要单独设计。
- 调度算法重写会影响长期学习节奏，应在新增信号稳定写入后再评估。
- 剩余风险记录在本 change 的 `design.md`、`tasks.md` 和实现后的 `docs/dev/dev-log.md`。
