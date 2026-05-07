# Review 正式信号实现说明

## 1. 目标

这份文档说明 `review` 递进式练习里，哪些结果已经进入正式后端信号、这些信号当前记录在哪、如何被聚合，以及 `today` / dashboard 应该怎样消费。

它的重点不是页面交互本身，而是：

- 正式字段边界
- 落库位置
- 聚合摘要规则
- 历史数据兼容策略

## 2. 对应入口/实现位置

- `public.phrase_review_logs`
- `src/app/(app)/review/page.tsx`
- `src/app/api/review/submit/route.ts`
- `src/lib/server/review/*`
- `src/lib/server/learning/service.ts`
- `supabase/sql/20260317_phase6_review_loop_mvp.sql`
- `supabase/sql/20260331_phase20_review_practice_signals.sql`

## 3. 关键结构或字段来源

### 3.1 当前正式信号范围

当前 `review` 普通表达复习里，已经纳入正式后端记录的新增信号有：

- `recognition_state`
- `output_confidence`
- `full_output_status`
- `variant_rewrite_status`
- `variant_rewrite_prompt_id`
- `full_output_coverage`

它们和原有正式信号并存：

- `review_result`
- `was_correct`
- `scheduled_next_review_at`

也就是说，当前正式记录模型不是替换旧的 `again / hard / good`，而是在保留原有调度结果的基础上，增加更细的训练维度。

### 3.2 当前落库位置

当前正式信号记录在：

- `public.phrase_review_logs`

新增字段语义：

- `recognition_state`
  - `recognized`
  - `unknown`
- `output_confidence`
  - `high`
  - `low`
- `full_output_status`
  - `completed`
  - `not_started`
- `variant_rewrite_status`
  - `completed`
  - `not_started`
- `variant_rewrite_prompt_id`
  - `self`
  - `colleague`
  - `past`
- `full_output_coverage`
  - `contains_target`
  - `missing_target`
  - `not_started`

`full_output_coverage` 是确定性目标表达覆盖结果，只表示完整输出是否用进目标表达，不表示语法、自然度或 AI 质量评分。

### 3.3 事件层挂载策略

第一版选择把正式信号挂到 `phrase_review_logs`，而不是直接写进 `user_phrases`，原因是：

- 这些信号属于单次 review 事件结果
- 后续调度策略可能还会演化
- 先保留事件层，能避免过早把不稳定语义写死成单条资产状态

当前策略是：

- 事件层先保留细粒度信号
- 聚合层再根据这些事件生成稳定摘要

## 4. 页面/服务端映射

### 4.1 当前服务端聚合摘要

当前 `getReviewSummary()` 会额外返回：

- `confidentOutputCountToday`
- `fullOutputCountToday`
- `variantRewriteCountToday`
- `targetCoverageCountToday`
- `targetCoverageMissCountToday`

含义：

- `confidentOutputCountToday`
  - 今天的 review 日志里，有多少条记录了 `output_confidence = high`
- `fullOutputCountToday`
  - 今天的 review 日志里，有多少条记录了 `full_output_status = completed`
- `variantRewriteCountToday`
  - 今天的 review 日志里，有多少条记录了 `variant_rewrite_status = completed`
- `targetCoverageCountToday`
  - 今天的 review 日志里，有多少条记录了 `full_output_coverage = contains_target`
- `targetCoverageMissCountToday`
  - 今天的 review 日志里，有多少条记录了 `full_output_coverage = missing_target`

这些字段当前属于：

- 轻量聚合摘要
- 面向 `today` / `dashboard` / `review summary` 的稳定消费字段

### 4.2 当前前端如何消费

#### review 页面

`review` 页面在最终提交 `again / hard / good` 时，会把当前已确定的正式信号一起带到后端：

- `recognitionState`
- `outputConfidence`
- `fullOutputStatus`
- `variantRewriteStatus`
- `variantRewritePromptId`
- `fullOutputText`

服务端根据 `fullOutputText` 与目标表达确定 `fullOutputCoverage`，但不把用户完整输出全文写入长期资产字段。

对应文件：

- `src/app/(app)/review/page.tsx`
- `src/app/api/review/submit/route.ts`

#### today 页面

`today` 当前不直接消费原始 review 日志，而是消费服务端聚合后的摘要字段。

当前用法：

- 当今日 review 已完成且存在完整输出记录时，会在任务说明里显示“其中 X 条进入完整输出”
- 当今日 review 已完成且存在目标表达覆盖记录时，会优先显示“其中 X 条把目标表达用进完整输出”
- 当今日仍有待复习内容且已有主动输出信号时，会在任务说明里显示“今天已有 X 条进入主动输出”
- 当今日仍有待复习内容且存在目标表达未覆盖记录时，会优先提示“X 条完整输出还没用进目标表达”

这样可以保证：

- `today` 不需要自己解释 review 原始事件
- 页面之间不会各自发明新的正式学习语义

## 5. 失败回退或兼容策略

这次新增信号采用保守兼容策略：

- 历史 `phrase_review_logs` 没有这几个字段时，保留空值
- 不对历史 review 记录做不可靠的强行回填
- 聚合层只对新写入且字段存在的日志生效

这意味着：

- 新功能上线后，新日志会逐步带出更细的训练摘要
- 历史数据不会因为缺字段而被错误解释

## 6. 和其它模块/页面的边界

- `review`
  - 负责提交正式信号，不负责自己解释长期聚合摘要
- `today`
  - 只消费聚合后的稳定字段，不直接解释原始 review 日志
- `domain-rules/review-scheduling-rules.md`
  - 负责定义这些正式信号如何影响调度语义

以下内容目前仍然不属于正式后端信号：

- 变体改写的评估结果
- chunks 命中率
- 自然度评分
- 用户改写草稿或完整输出全文的长期资产化
- 基于正式信号调整后的新调度算法

这些能力后续如果要接入正式语义，需要继续扩这个文档和对应 OpenSpec 规范。

## 7. 什么时候必须同步更新

- 正式信号字段新增、删减或含义变化
- 正式信号落库位置变化
- `getReviewSummary()` 聚合字段变化
- `today` / `review` 的消费方式变化

## 8. 建议回归

- `review` 最终提交时会带上熟悉度、输出信心、变体改写状态和完整输出状态
- 服务端能在 `phrase_review_logs` 中写入新增字段
- `getReviewSummary()` 会正确聚合当天主动输出、完整输出、迁移改写和目标表达覆盖数量
- `today` 只消费摘要字段，不直接解释 review 原始事件
