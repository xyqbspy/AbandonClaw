# Review 调度信号维护说明

## 1. 文档目的

这份文档专门说明 `review` 正式训练信号如何真正进入调度层，而不只是停留在日志或摘要里。

它回答 4 个维护问题：

- due 列表为什么会把某条表达排得更靠前
- 提交 `again / hard / good` 后，下一次复习时间怎么被细调
- 历史没有正式信号的旧记录如何被保守解释
- `review` 页面应该如何稳定解释这些节奏变化

如果后续要继续调整 `review` 排序、间隔或节奏解释，应先更新这份文档，再同步对应 OpenSpec change。

## 2. 当前调度仍然是谁主导

当前调度不是完全改写成一套新算法，而是保留“最终反馈定大方向、正式信号做细调”的结构：

- `again`：大方向是尽快再看
- `hard`：大方向是中度收紧
- `good`：大方向是适度放宽

正式信号只负责在这个大方向里做细调：

- `recognition_state`
- `output_confidence`
- `full_output_status`

这保证了：

- 老的 `again / hard / good` 语义还成立
- 新的递进式训练结果能真正影响排序和节奏
- 历史数据不会因为缺字段而整体失真

## 3. due 列表排序规则

当前 `getDueReviewItems()` 会先按原有 due 条件筛出候选项，再读取每条表达最近一次 `phrase_review_logs` 正式信号，并生成 `schedulingFocus`。

当前前置优先级从高到低是：

1. `low_output_confidence`
2. `missing_full_output`
3. `recognition_only`
4. `null`

对应含义：

- `low_output_confidence`
  - 最近一次复习里，用户明确表示还缺少主动输出信心
  - 这是最需要优先回看的情况
- `missing_full_output`
  - 已经能识别，但还没完成过完整输出
  - 需要尽快补上整句输出
- `recognition_only`
  - 还停留在识别层，没有进入更稳定的输出层
- `null`
  - 没有命中风险重点，或者是历史空值记录

在同一优先级内，再按：

1. `next_review_at`
2. `userPhraseId`

稳定排序。

## 4. 下一次复习时间细调规则

当前节奏细调入口是 `resolveNextReviewAt()`，规则如下：

### 4.1 `again`

- 如果同时表现出低输出信心、仅识别或未完成完整输出：
  - 下次约 `12 小时` 后
- 否则：
  - 下次约 `1 天` 后

### 4.2 `hard`

- 如果仍然缺少完整输出或主动输出信心：
  - 下次约 `2 天` 后
- 否则：
  - 下次约 `3 天` 后

### 4.3 `good`

- 如果这次已经达到 `mastered`：
  - 不再安排 `next_review_at`
- 如果已经识别稳定、输出信心高且完成完整输出：
  - 下次约 `10 天` 后
- 如果仍然低信心或还停留在识别层：
  - 下次约 `4 天` 后
- 如果只是还没完成完整输出：
  - 下次约 `5 天` 后
- 其他中性情况：
  - 下次约 `7 天` 后

## 5. 历史数据兼容策略

历史 `phrase_review_logs` 可能没有：

- `recognition_state`
- `output_confidence`
- `full_output_status`

当前兼容策略是保守中性解释：

- 缺字段不推断成高信心
- 缺字段也不推断成低信心
- due 排序里落到 `schedulingFocus = null`
- 间隔细调只对真正带正式信号的新记录生效

这样可以避免历史记录被错误挤到最前面，或被错误延后太多。

## 6. 页面解释边界

当前页面侧只消费稳定解释，不自己重新拼调度语义。

`review` 页面：

- 直接消费 `DueReviewItemResponse.schedulingFocus`
- 用统一 helper 显示“为什么这条会优先出现”

`today` 页面：

- 当前仍然主要消费服务端摘要字段
- 不直接解释单条复习项的排序原因
- 如果未来要把调度节奏摘要扩展到 `today`，应继续由服务端先聚合，再由页面消费稳定字段

## 7. 建议回归点

- due 列表里低输出信心条目会排到更前
- `good` + 高信心 + 完整输出 会比中性 `good` 拉得更远
- `good` + 低信心 不会被错误放到太远
- 历史空值记录不会被误判成高优先级或低优先级
- `review` 页面能稳定展示调度提示
