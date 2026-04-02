## Why

`chunks/page.tsx` 仍然是当前仓库里最重的页面入口，而 `lesson-reader.tsx` 仍然是最重的 feature 容器之一。它们都已经同时承接页面组装、状态流、局部交互、音频、弹层或列表渲染职责，继续在这些文件里直接叠加需求，会让回归测试和后续维护判断越来越难收口。

## What Changes

- 为 `src/app/(app)/chunks/page.tsx` 制定下一轮拆分方案，优先把页面级动作编排、多 sheet 装配和 expression map / review 入口链路继续从主文件中拆开。
- 为 `src/features/lesson/components/lesson-reader.tsx` 制定下一轮拆分方案，优先把 selection 控制、dialogue/mobile 分支装配和训练桥接逻辑继续从主容器中拆开。
- 明确这轮拆分只处理页面/容器内部职责边界，不顺手改 chunks 功能、lesson 阅读流程或服务端数据契约。
- 同步补充重入口拆分约束，明确 `chunks/page` 与 `lesson-reader` 这类入口在拆分后必须保持既有交互、缓存、副作用和测试保护不变。

## Capabilities

### New Capabilities

### Modified Capabilities
- `feature-component-decomposition`: 增加对 `chunks/page.tsx` 与 `lesson-reader.tsx` 第二轮拆分时职责边界、测试保护和页面级行为稳定性的约束
- `project-maintenance`: 增加对 `chunks/page`、`lesson-reader` 这类重入口的拆分优先级与回归要求说明

## Impact

- 受影响入口：
  - `src/app/(app)/chunks/page.tsx`
  - `src/features/lesson/components/lesson-reader.tsx`
- 可能新增的 supporting modules：
  - `src/app/(app)/chunks/*`
  - `src/features/lesson/components/*`
  - `src/features/lesson/*`
- 受影响文档：
  - 项目维护手册
  - `CHANGELOG.md`
- 受影响测试：
  - `chunks` 页面交互测试
  - `lesson-reader` 交互测试