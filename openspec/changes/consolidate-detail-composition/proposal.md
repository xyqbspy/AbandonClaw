## Why

当前 `lesson` 与 `chunks` 两条详情链路已经开始出现复用趋势，但复用边界还不清晰：

- `selection-detail-primitives.tsx` 已经抽出了句子卡片、音频按钮、详情 block、footer actions
- `focus-detail-content.tsx` / `focus-detail-sheet-footer.tsx` 仍然保留了大量同类职责的另一套实现

如果不尽快定义“哪些属于共享 detail 基元、哪些属于领域差异”，后续很容易继续出现：

- 同类交互在两个详情体系里重复维护
- 样式和文案状态再次漂移
- 维护者不知道该优先抽象还是保留分叉

这条 change 用来先把复用边界沉淀成规范和任务，而不是立刻做大规模重构。

## What Changes

- 定义 detail 组件复用的适用边界
- 明确共享基元应优先承载哪些职责
- 明确领域差异层应保留哪些独立实现
- 为后续可能的组件收敛或样式统一建立结构化任务入口

## Capabilities

### New Capabilities

- `detail-composition-boundaries`: 定义 lesson detail 与 chunks detail 之间的共享基元和领域特化边界

### Modified Capabilities

- `project-maintenance`: 增加“详情组件结构性改动应先定义复用边界”的要求

## Impact

- 受影响模块：
  - `src/features/lesson/components/*detail*`
  - `src/features/chunks/components/focus-detail-*`
- 受影响维护流程：
  - 组件抽象决策
  - UI 一致性变更评审
  - 后续测试与回归范围界定
