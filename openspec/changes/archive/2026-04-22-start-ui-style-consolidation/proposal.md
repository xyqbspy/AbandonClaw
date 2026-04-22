## Why

当前 UI 已有全局样式变量、基础组件和风格指南，但真实页面仍存在圆角、阴影、色值、文字尺寸和间距的局部漂移。需要从小范围开始收口，先记录漂移点，再做低风险公共层提取，避免直接全站重刷。

## What Changes

- 新增当前 UI 样式审计文档，记录第一批漂移点和分阶段收口顺序。
- 新增一个低风险 shared/card 样式常量，用于替代 `review` summary card 的重复局部 class。
- 不改变页面视觉结果，只把重复局部样式抽到公共样式入口，作为后续同类 summary card 收口起点。
- 不做 today / chunks / review 的批量视觉重构。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `component-library-governance`: 补充样式审计和公共样式常量作为渐进式 UI 收口的维护入口。

## Impact

- 影响文档：
  - `docs/system-design/ui-style-audit.md`
  - `docs/system-design/README.md`
  - `docs/system-design/component-library.md`
- 影响代码：
  - `src/lib/ui/apple-style.ts`
  - `src/app/(app)/review/review-page-summary-cards.tsx`
- 不影响 API、数据库、缓存、业务状态流。

## Stability Closure

- 本轮暴露的不稳定点：已有指南能约束新增 UI，但现有页面仍缺少“从哪里开始收”的审计记录。
- 本轮收口项：记录第一批漂移点，并把 review summary card 的重复局部 surface 样式抽成共享常量。
- 明确不收项：不批量统一 review stage panel、today 色值、chunks detail 专属 token，不引入设计 token 重命名。
- 延后原因：这些区域牵涉较多页面气质和移动端适配，直接改动容易扩大视觉回归面。
- 剩余风险记录位置：`docs/system-design/ui-style-audit.md`。
