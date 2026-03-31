## Why

当前 `review` 页虽然已经有阶段式舞台，但仍偏向“看参考 -> 自评 -> 下一题”，还没有把复习真正拆成从识别到输出的递进训练。用户很难区分“眼熟”“能回忆”“能迁移改写”和“能完整输出”，而后端复习状态也仍以较粗粒度结果为主，无法稳定表达这些能力差异。

## What Changes

- 将单次 `review` 练习明确拆成递进式阶段，至少覆盖熟悉度/输出信心、微回忆、变体改写和完整输出四类交互能力。
- 引入按掌握度分层的复习路径，不要求所有复习项都走满全部阶段，而是根据当前掌握状态与复习类型选择合适的训练深度。
- 明确各阶段的记录边界：哪些前端阶段可以先以 TODO 占位落地，哪些结果会真正回写后端并影响复习调度或学习状态。
- 补充 `review` 练习信号的专项规范，为后续接入更细粒度后端字段、统计和推荐保留清晰的扩展点。

## Capabilities

### New Capabilities
- `review-progressive-practice`: 约束 `review` 单次复习如何从识别推进到主动输出，以及各阶段的训练目标和回写边界。

### Modified Capabilities
- `review-experience`: `review` 页面将从基础阶段式工作台扩展为分层递进练习流，并增加阶段门槛、失败降级和 TODO/正式能力边界。
- `learning-loop-overview`: 学习闭环中 `review` 的角色需要从“复习入口”进一步明确为“识别 -> 提取 -> 输出”的巩固链路。

## Impact

- 受影响代码主要在 `src/app/(app)/review/*`、`src/lib/utils/review-api.ts`、`src/lib/server/review/service.ts` 以及可能新增的复习评估/记录逻辑。
- 受影响文档包括新的 `review-progressive-practice` spec，以及 `review-experience`、`learning-loop-overview` 的增量规范。
- 如果实施阶段确认需要更细粒度后端落库或调度字段，可能触达 Supabase SQL、复习 API 契约和 `today` / dashboard 聚合解释。
