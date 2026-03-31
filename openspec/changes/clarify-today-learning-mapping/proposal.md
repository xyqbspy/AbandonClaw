## Why

`today` 页面现在同时消费服务端 `learning dashboard`、场景列表、本地 repeat 生成态和前端 selectors 的派生逻辑，但这些映射关系分散在 `service`、`learning-api`、`today-page-selectors` 与页面编排里，没有一份稳定文档说明“哪个字段来自哪里、谁优先、何时回退”。在最近连续收紧句子推进与完成语义后，这种隐式约定已经开始增加维护成本和回归风险，需要把 today 展示数据与学习步骤、后端学习态之间的契约正式梳理清楚。

## What Changes

- 明确 `today` 页面核心展示块的数据来源、优先级和回退规则，包括继续学习卡片、今日任务链路、表达沉淀摘要与回忆入口。
- 梳理服务端 `LearningDashboardResponse` 中 `continueLearning`、`todayTasks`、`overview` 与底层学习表/聚合逻辑之间的映射关系，并把关键字段的业务语义写清楚。
- 约束前端 `today` selectors 只负责展示层派生与兜底，不得继续隐式重写服务端学习语义。
- 补充维护文档的更新边界：后端学习步骤、完成条件、repeat continue 或 today 展示卡片变更时，必须同步更新映射文档与回归测试。

## Capabilities

### New Capabilities
- `today-learning-contract`: 规定 `today` 页面展示数据与用户学习步骤、后端学习态之间的映射契约，以及相应维护文档要求。

### Modified Capabilities
- `learning-loop-overview`: 补充 `today` 作为每日入口时，必须基于稳定的数据来源和统一的学习步骤解释来展示继续学习与当日任务。

## Impact

- 受影响代码：
  - `src/lib/server/learning/service.ts`
  - `src/lib/utils/learning-api.ts`
  - `src/features/today/components/today-page-selectors.ts`
  - `src/features/today/components/today-page-client.tsx`
  - `src/app/(app)/today/*`
- 受影响文档：
  - 新增 today 数据映射/维护说明文档
  - 新增或修改 OpenSpec delta specs
- 受影响测试：
  - today selectors / page client 回归测试
  - learning dashboard / service 逻辑测试
- API / 数据库：
  - 本次提案默认不新增数据库迁移
  - 可能收紧 `LearningDashboardResponse` 的语义约束，但不预设破坏性接口改名
