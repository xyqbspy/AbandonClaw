## Why

`review` 递进式练习的正式信号已经接入后端，但当前复习调度仍主要由 `again / hard / good` 和 `next_review_at` 驱动，新的熟悉度、输出信心和完整输出状态还没有真正参与 due 排序和复习节奏。这会让高价值的新信号只停留在统计层，无法反过来影响用户下一次看到什么、多久再看到、以什么强度再练。

## What Changes

- 定义 `review` 正式信号如何参与 due 列表排序，明确低信心、未完成完整输出、仅识别级别等情况应如何提升优先级。
- 设计 `review` 正式信号如何影响下一次复习间隔或节奏，避免所有递进式练习最终仍退化成旧的统一间隔。
- 明确正式信号如何与现有 `again / hard / good` 并存，确保不会破坏现有兼容性或让调度语义自相矛盾。
- 为后续服务端调度、selector 文案和维护文档补足规范，确保 `review`、`today` 和其他聚合入口对“为什么这条先出现、为什么这条又回来了”的解释一致。

## Capabilities

### New Capabilities
- `review-scheduling-signals`: 约束 `review` 正式信号如何影响待复习项排序、复习间隔和节奏降级策略。

### Modified Capabilities
- `review-practice-signals`: 从“定义正式信号和聚合摘要”进一步推进到“正式信号如何进入调度层”。
- `review-progressive-practice`: 递进式训练需要与新的调度节奏保持一致，不能页面已经分层训练但调度仍完全无差别。
- `learning-loop-overview`: 学习闭环需要明确 `review` 不只是记录训练信号，还会用这些信号反向调整复习节奏。

## Impact

- 受影响代码主要在 `src/lib/server/review/service.ts`、`src/lib/utils/review-api.ts`、`src/app/(app)/review/*`，以及可能触达 `today` 说明文案和 dashboard 聚合解释。
- 可能受影响的数据层包括 `phrase_review_logs` 的查询方式、`user_phrases.next_review_at` 的更新策略和 due list 排序逻辑。
- 受影响文档包括新的 `review-scheduling-signals` spec，以及 `review-practice-signals`、`review-progressive-practice`、`learning-loop-overview` 的增量规范。
