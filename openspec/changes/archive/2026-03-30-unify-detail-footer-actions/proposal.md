## Why

当前项目里存在两条相近但分离的详情动作链路：

- `src/features/lesson/components/selection-detail-sheet.tsx` / `selection-detail-primitives.tsx`
- `src/features/chunks/components/focus-detail-sheet.tsx` / `focus-detail-sheet-footer.tsx`

这两条链路都承担“底部主操作 + 次操作”的职责，但样式、footer padding 和按钮表达没有统一规范，导致同一学习闭环中的相邻操作体验不稳定，也让后续维护者难以判断应该以哪一处为基准。

这次变更需要把当前已经发生的 UI 对齐结果沉淀为 OpenSpec change，避免后续继续靠聊天上下文维护。

## What Changes

- 明确移动端 detail footer 的基准 spacing
- 明确“加入复习”类按钮需要携带 icon 的交互表达
- 让 `selection detail` 与 `focus detail` 在 footer 行为上保持统一基准
- 为这类详情 footer/action 的统一维护建立变更入口与任务说明

## Capabilities

### New Capabilities

- `detail-footer-actions`: 统一详情底部 footer 的 spacing、主次按钮表达和复习动作呈现规则

### Modified Capabilities

- `project-maintenance`: 增加通过 OpenSpec 维护细节 UI 规范和动作一致性的要求

## Impact

- 受影响页面：
  - lesson selection detail
  - chunks focus detail
- 受影响文件：
  - `src/features/lesson/components/selection-detail-primitives.tsx`
  - `src/features/lesson/components/selection-detail-sheet.tsx`
  - `src/features/chunks/components/focus-detail-sheet.tsx`
- 受影响维护流程：
  - OpenSpec change 文档
  - changelog 记录
