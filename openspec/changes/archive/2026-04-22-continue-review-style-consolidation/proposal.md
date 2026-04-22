## Why

上一轮 UI 收口已经把 Review 的 summary、stage panel 外壳和 page 外壳样式抽成局部常量，但 `review-page-stage-panel.tsx` 内仍有少量标题、正文、提示和状态文字 class 散落在 JSX 中。

这些 class 不影响业务语义，但会让后续新增 review 阶段、反馈块或提示文案时继续复制局部样式，削弱已建立的 UI 风格收口规则。

## What Changes

- 继续收口 `src/app/(app)/review/review-page-stage-panel.tsx` 中剩余的文案层级、提示文字、状态文字和 reference toggle 样式。
- 仅抽为同文件局部常量，不提升到 `apple-style.ts`，因为这些样式仍强依赖 Review 阶段式训练语义。
- 更新 `docs/system-design/ui-style-audit.md`，记录本轮已收项、延期项和风险位置。
- 不改变 Review 队列、阶段推进、提交、回写、来源跳转或空队列行为。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `component-library-governance`: 补充渐进式 UI 收口继续迭代时，应优先在 feature 内部收敛强业务语义样式，并记录不提升为全局 token 的原因。

## Impact

- 影响代码：
  - `src/app/(app)/review/review-page-stage-panel.tsx`
- 影响文档：
  - `docs/system-design/ui-style-audit.md`
- 影响 OpenSpec：
  - `openspec/changes/continue-review-style-consolidation/*`
  - archive 时同步 `openspec/specs/component-library-governance/spec.md`
- 不影响 API、数据库、缓存、服务端学习状态、Review 回写或测试数据模型。

## Stability Closure

- 本轮暴露的不稳定点：Review stage panel 已做外壳样式收口，但内部文案层级仍有散落 class，容易在后续局部开发中继续漂移。
- 本轮收口项：把剩余低风险文案层级 class 收为 review 同文件局部常量，并在审计文档记录。
- 明确不收项：不改 Review hero 渐变、全局 token、按钮组件体系、Review 业务测试语义。
- 延后原因：这些项要么跨页面影响更大，要么涉及业务前置状态，不适合混入本轮文字层级收口。
- 剩余风险记录位置：`docs/system-design/ui-style-audit.md`。
