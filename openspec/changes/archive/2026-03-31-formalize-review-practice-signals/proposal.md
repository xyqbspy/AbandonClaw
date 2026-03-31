## Why

`review` 的递进式练习流已经落地到前端，但当前正式后端仍只稳定消费 `again / hard / good` 这类粗粒度结果。这样会导致熟悉度判断、输出信心、变体改写和完整输出这些新训练信号长期停留在前端，无法稳定进入调度、统计或 `today` / dashboard 聚合链路。

## What Changes

- 为 `review` 递进式练习定义正式后端信号模型，明确哪些阶段结果值得落库，哪些仍保持为前端临时训练态。
- 设计并约束 `review` 阶段信号如何影响复习调度、学习统计和后续聚合解释，避免继续把高维训练结果压缩成单一 `again / hard / good`。
- 明确 `today`、dashboard 或其他聚合入口是否以及如何消费新的 `review` 正式信号，防止不同页面各自发明新的解释。
- 为后续 API / service / SQL 改造补足正式规范和实施任务，确保新增字段不会和现有学习状态语义冲突。

## Capabilities

### New Capabilities
- `review-practice-signals`: 约束 `review` 递进式练习的正式后端信号、字段边界和聚合消费规则。

### Modified Capabilities
- `review-progressive-practice`: 从“区分正式回写与 TODO 占位”进一步推进到“哪些阶段结果会成为正式信号、如何影响训练路径和调度”。
- `learning-loop-overview`: 学习闭环需要明确 `review` 的正式训练信号如何进入聚合链路，而不是只停留在页面内部阶段。
- `today-learning-contract`: 若 `today` 或 dashboard 需要解释新的 `review` 后端信号，则必须补充正式映射规则和消费边界。

## Impact

- 受影响代码主要在 `src/lib/server/review/*`、`src/lib/utils/review-api.ts`、`src/app/(app)/review/*`、`src/features/today/*` 以及可能扩展到 dashboard 聚合服务。
- 可能受影响的数据层包括 Supabase review 相关表、聚合 SQL、review submit API 和后续统计字段。
- 受影响文档包括新的 `review-practice-signals` spec，以及 `review-progressive-practice`、`learning-loop-overview`、`today-learning-contract` 的增量规范。
