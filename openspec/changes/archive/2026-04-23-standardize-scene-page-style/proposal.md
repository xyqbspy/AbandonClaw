## Why

`scene` 是主学习流程工作台，承接从场景阅读、音频、表达沉淀到练习和变体解锁的核心路径。前面已经完成 Today 与 Review 的局部样式收口，但 `scene` 页面族仍横跨页面层、lesson reader、practice、variants、expression map 和音频动作，继续用小补丁方式收样式容易扩大成不可控视觉重构。

本轮先为 `scene` 页面族建立独立的大范围样式统一计划，明确审计对象、分批顺序、验证边界和不收项，再进入实现。

## What Changes

- 新增 scene 页面样式统一的 OpenSpec change，先固定边界和任务。
- 对 `scene/[slug]` 页面族做 UI 审计，覆盖：
  - scene detail page / base view
  - lesson reader / sentence block / selection detail
  - practice view / practice question card / practice tabs
  - variants view
  - expression map view
  - loading / skeleton / fallback / floating entry
- 分批统一 scene 页面族的页面骨架、section、主动作区、辅助动作区、状态反馈和局部 style 常量。
- 不改变 scene 的学习状态、session 恢复、practice 生成/提交、音频播放编排、表达保存或变体解锁语义。
- 不做全站 token 重命名，不把强业务组件直接抽到 shared，不处理 chunks detail overlay。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `component-library-governance`: 补充页面族级 UI 统一的治理规则，要求先审计、分批、保留业务语义，并避免把 feature 私有训练结构误抽为全局组件。

## Impact

- 预计影响代码：
  - `src/app/(app)/scene/[slug]/*`
  - `src/features/scene/components/*`
  - `src/features/lesson/components/*`
  - `src/features/lesson/styles/*`
  - 可能少量涉及 `src/components/audio/*` 的使用方式，但不改音频行为。
- 预计影响文档：
  - `docs/system-design/ui-style-audit.md`
  - 可能补充 scene 专项审计段落或新建 scene style audit 文档。
- 预计影响 OpenSpec：
  - `openspec/specs/component-library-governance/spec.md` archive 时同步。
- 不影响 API、数据库、缓存策略、学习状态写回、practice 数据模型或 TTS 生成逻辑。

## Stability Closure

- 本轮暴露的不稳定点：scene 页面族样式跨多个文件和子模块，若继续零散修改，会出现按钮层级、卡片结构、浮层、音频动作和移动端布局各自漂移。
- 本轮收口项：先完成 scene 页面族样式统一的计划、审计任务和治理规则，不直接进入大改。
- 明确不收项：不改业务行为、不改状态流、不改音频编排、不改 practice 生成/提交、不抽全局 token、不处理 chunks detail overlay。
- 延后原因：这些属于主链路行为或跨页面设计系统能力，必须在后续实现任务中按批次验证。
- 剩余风险记录位置：`docs/system-design/ui-style-audit.md` 和本 change 的 tasks。
