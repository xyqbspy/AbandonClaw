# Review 正式信号维护说明

## 1. 文档目的

这份文档说明 `review` 递进式练习里，哪些结果已经进入正式后端信号、这些信号当前记录在哪、如何被聚合，以及 `today` / dashboard 应该怎样消费。

它的重点不是页面交互本身，而是：

- 正式字段边界
- 聚合摘要规则
- 历史数据兼容策略

## 2. 当前正式信号范围

当前 `review` 普通表达复习里，已经纳入正式后端记录的新增信号有：

- `recognition_state`
- `output_confidence`
- `full_output_status`

它们和原有正式信号并存：

- `review_result`
- `was_correct`
- `scheduled_next_review_at`

也就是说，当前正式记录模型不是替换旧的 `again / hard / good`，而是在保留原有调度结果的基础上，增加更细的训练维度。

## 3. 当前落库位置

当前正式信号记录在：

- `public.phrase_review_logs`

对应迁移：

- `supabase/sql/20260317_phase6_review_loop_mvp.sql`
- `supabase/sql/20260331_phase20_review_practice_signals.sql`

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

## 4. 为什么先挂到 review log，而不是直接改 user_phrases

第一版选择把正式信号挂到 `phrase_review_logs`，而不是直接写进 `user_phrases`，原因是：

- 这些信号属于单次 review 事件结果
- 后续调度策略可能还会演化
- 先保留事件层，能避免过早把不稳定语义写死成单条资产状态

当前策略是：

- 事件层先保留细粒度信号
- 聚合层再根据这些事件生成稳定摘要

## 5. 当前服务端聚合摘要

当前 `getReviewSummary()` 会额外返回：

- `confidentOutputCountToday`
- `fullOutputCountToday`

含义：

- `confidentOutputCountToday`
  - 今天的 review 日志里，有多少条记录了 `output_confidence = high`
- `fullOutputCountToday`
  - 今天的 review 日志里，有多少条记录了 `full_output_status = completed`

这些字段当前属于：

- 轻量聚合摘要
- 面向 `today` / dashboard / review summary 的消费字段

## 6. 当前前端如何消费

### 6.1 review 页面

`review` 页面在最终提交 `again / hard / good` 时，会把当前已确定的正式信号一起带到后端：

- `recognitionState`
- `outputConfidence`
- `fullOutputStatus`

对应文件：

- `src/app/(app)/review/page.tsx`
- `src/app/api/review/submit/route.ts`

### 6.2 today 页面

`today` 当前不直接消费原始 review 日志，而是消费服务端聚合后的摘要字段。

当前用法：

- 当今日 review 已完成且存在完整输出记录时，会在任务说明里显示“其中 X 条进入完整输出”
- 当今日仍有待复习内容且已有主动输出信号时，会在任务说明里显示“今天已有 X 条进入主动输出”

这样可以保证：

- `today` 不需要自己解释 review 原始事件
- 页面之间不会各自发明新的正式学习语义

## 7. 历史数据兼容

这次新增信号采用保守兼容策略：

- 历史 `phrase_review_logs` 没有这几个字段时，保留空值
- 不对历史 review 记录做不可靠的强行回填
- 聚合层只对新写入且字段存在的日志生效

这意味着：

- 新功能上线后，新日志会逐步带出更细的训练摘要
- 历史数据不会因为缺字段而被错误解释

## 8. 当前仍未正式化的部分

以下内容目前仍然不属于正式后端信号：

- 变体改写的评估结果
- chunks 命中率
- 自然度评分
- 基于正式信号调整后的新调度算法

这些能力后续如果要接入正式语义，需要继续扩这个文档和对应 OpenSpec 规范。

## 9. 建议回归点

- `review` 最终提交时会带上熟悉度、输出信心和完整输出状态
- 服务端能在 `phrase_review_logs` 中写入新增字段
- `getReviewSummary()` 会正确聚合当天主动输出和完整输出数量
- `today` 只消费摘要字段，不直接解释 review 原始事件
