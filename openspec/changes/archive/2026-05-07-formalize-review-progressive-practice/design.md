## Context

Review 现在包含普通表达复习和 scene practice 回补两类入口。普通表达复习已经有阶段式页面：微回忆、熟悉度/输出信心、变体改写、完整输出、最终反馈。当前正式后端信号已经包括：

- `recognition_state`
- `output_confidence`
- `full_output_status`
- `review_result`
- `scheduled_next_review_at`

这些信号落在 `phrase_review_logs`，并被 summary 与调度规则保守消费。剩余不稳定点是：变体改写仍只是前端草稿，完整输出只记录有没有写，不能区分是否命中目标表达。这个缺口直接影响产品北极星里的“迁移”和“使用”。

## Goals / Non-Goals

**Goals:**

- 让变体改写完成状态成为正式 review 事件信号。
- 让完整输出是否命中目标表达成为确定性、可测试的正式信号。
- 保留 `again / hard / good` 作为主反馈，只让新增信号做细调和解释。
- 让 review summary 暴露稳定聚合字段，供页面消费。
- 保持历史记录空值兼容，不做不可靠回填。
- 同步页面文案、系统设计文档、stable spec 和最小相关测试。

**Non-Goals:**

- 不做 AI 评分、语法纠错、自然度评分或语气评分。
- 不保存用户自由输出全文到长期资产字段。
- 不重写 review 队列生成与主调度算法。
- 不改变 scene practice 回补正式链路。
- 不让 `today` 或其他页面直接解释原始 review 日志。

## Decisions

### 1. 新增信号继续挂在 `phrase_review_logs`

新增字段：

- `variant_rewrite_status`: `completed` / `not_started`
- `variant_rewrite_prompt_id`: 固定改写方向 id 或 `null`
- `full_output_coverage`: `contains_target` / `missing_target` / `not_started`

理由：

- 这些结果属于单次 review 事件，不应过早写成 `user_phrases` 的长期资产状态。
- 和现有 `recognition_state`、`output_confidence`、`full_output_status` 保持同一事件层模型。
- 历史数据可以自然保留空值，聚合层保守解释。

替代方案：直接写 `user_phrases`。放弃原因是迁移能力和完整输出覆盖可能随训练策略变化，不适合过早变成资产级字段。

### 2. 完整输出覆盖只做确定性判断

第一版只判断用户完整输出是否包含目标表达的归一化形态，输出：

- `contains_target`
- `missing_target`
- `not_started`

归一化只做低风险处理，例如大小写、首尾空白、常见标点折叠。若目标表达为空或无法稳定判断，按保守策略不生成“命中”结论。

理由：

- 可解释、可测试、无外部成本。
- 不把“写得自然”伪装成系统已经能评估。
- 可以先支撑调度和页面解释，再为后续 AI 评分留接口。

替代方案：调用 AI 判断自然度和改写质量。放弃原因是质量、成本、失败降级和可解释性都不适合混入本轮。

### 3. 变体改写只记录完成状态和固定方向

页面当前改写方向是固定选项。本轮只记录：

- 用户是否提交了非空改写草稿
- 当时选择的固定改写方向 id

不记录草稿全文，不做命中率或自然度判断。

理由：

- 能让调度知道用户是否进入过迁移训练。
- 避免把本地自由文本变成长期资产或评分对象。
- 保持数据模型小，后续若接 AI 评分再单独扩展。

### 4. 调度只做保守细调

新增信号不替代旧主反馈：

- `again / hard / good` 继续决定大方向。
- `missing_target` 与 `variant_rewrite_status = not_started` 只影响前置优先级、间隔细调和页面解释。
- 历史空值保持中性，不推断为高风险或高掌握。

理由：

- 避免一次变更改变太多长期节奏。
- 用户最终主观反馈仍然是最稳定的复习主信号。
- 新信号先证明自己在排序解释里有价值。

### 5. 聚合字段由服务端提供

`getReviewSummary()` 增加稳定摘要字段，例如：

- `variantRewriteCountToday`
- `targetCoverageCountToday`
- `targetCoverageMissCountToday`

页面只消费这些摘要，不直接查询或解释 `phrase_review_logs`。

理由：

- 保持 `today`、review summary 和 dashboard 的消费边界一致。
- 防止页面各自拼装正式学习语义。

## Risks / Trade-offs

- [Risk] 确定性包含判断可能漏掉同义改写或形态变化。  
  Mitigation：本轮只把它命名为“目标表达覆盖”，不命名为“质量评分”；漏判可以通过最终 `again / hard / good` 和后续 AI change 承接。

- [Risk] 新增信号污染历史调度。  
  Mitigation：历史空值保守中性解释，不做回填；排序和间隔只对新记录生效。

- [Risk] 页面把 `missing_target` 展示得像失败。  
  Mitigation：页面解释为“这轮还没把目标表达用进完整输出”，并保留回看参考/继续练的降级路径。

- [Risk] 新增字段和 API schema 跨层同步遗漏。  
  Mitigation：tasks 明确覆盖 DB migration、request schema、service、summary、page payload、测试和文档。

## Migration Plan

1. 新增 Supabase migration，给 `phrase_review_logs` 增加 nullable 字段和 check constraint。
2. 更新 request schema，允许新客户端提交新增信号，旧客户端缺字段时保持空值。
3. 更新服务端提交链路和幂等 key 归一化，保证重复提交同一 payload 结果稳定。
4. 更新 summary 和调度逻辑，历史空值保守中性。
5. 更新 review 页面提交 payload 与展示文案。
6. 跑最小相关测试与 OpenSpec validate。

Rollback：

- 若新增信号出现问题，可以先让服务端忽略新字段并保持旧字段写入。
- DB 字段为 nullable，旧读写链路不依赖新增字段即可继续运行。

## Open Questions

- 固定改写方向 id 是否需要从当前页面常量提升为 shared type。实现时优先复用现有 review selector/labels 边界，不为本轮过度抽象。
- `targetCoverageCountToday` 是否应立即进入 today 文案。建议本轮先让服务端 summary 可用，today 展示如需新文案则作为同一 change 的受控任务完成。

## 稳定性收口

已发现的不稳定点：

- 变体改写页面主流程与正式信号边界不一致。
- 完整输出完成状态不能表达目标表达覆盖。
- 文档里 TODO 口径与当前正式信号进度存在漂移。

本轮收口：

- 事件层新增最小正式信号。
- 调度和 summary 只做保守消费。
- 文档同步到稳定口径。

明确不收：

- AI 评分、长期保存自由文本、调度算法重写、scene practice 回补改造、全量 progress 指标扩张。

风险记录位置：

- 本文件 `Risks / Trade-offs`
- `tasks.md` 的验证与不收项
- 实现后的 `docs/dev/dev-log.md`
