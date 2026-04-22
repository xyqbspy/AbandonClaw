## Context

项目已经有三类 UI 相关稳定材料：

- `docs/system-design/component-library.md` 说明组件分层和公共化边界。
- `openspec/specs/component-library-governance/spec.md` 约束组件迁移、共享组件和重组件拆分。
- `openspec/specs/learning-action-button-hierarchy/spec.md`、`detail-footer-actions`、`audio-action-button-consistency` 等专项 capability 约束按钮和详情动作。

缺口在于：新增页面或功能时，维护者缺少一个先读的 UI 风格总入口。结果容易在局部实现里重新手拼按钮、卡片、页面 section 或局部主色，长期导致跨页面风格漂移。

## Goals / Non-Goals

**Goals:**

- 新增 `docs/system-design/ui-style-guidelines.md`，作为新增页面、功能入口和跨页面 UI 调整的轻量风格入口。
- 将该文档接入 `system-design` 索引、组件库说明和维护手册。
- 在 OpenSpec delta 中补充稳定规则：新增页面/功能时必须先按统一风格指南与既有按钮层级判断。
- 保持规则轻量，允许 Fast Track 继续处理局部样式和文案小修。

**Non-Goals:**

- 不批量重构现有页面 UI。
- 不建立完整设计系统、token 体系、Storybook 或视觉回归平台。
- 不替代已有专项 capability；样式指南只做入口和决策顺序，具体按钮、详情、音频动作仍以专项 spec 为准。
- 不改变运行时代码、API、数据库、缓存或测试链路。

## Decisions

1. 新增轻量样式指南，而不是扩写组件库说明。
   - 原因：组件库说明主要回答“组件放哪里”，样式指南回答“新增 UI 怎么保持风格一致”。两者职责不同。
   - 备选方案：把所有内容写进 `component-library.md`。放弃原因是会让组件分层文档混入过多页面布局和视觉规则。

2. 样式指南只描述决策口径，不定义完整视觉 token。
   - 原因：当前项目不是重型设计系统，已有 Tailwind + UI primitive + shared/feature 组件组合足够支撑维护。
   - 备选方案：新增 token 文档。放弃原因是当前没有统一 token 改造需求，容易过度设计。

3. 稳定规则落在已有 capability 上，不新增 capability。
   - 原因：这次不是新增一套 UI 系统，而是补齐 `component-library-governance`、`learning-action-button-hierarchy`、`project-maintenance` 的入口和触发条件。
   - 备选方案：新增 `ui-style-governance` capability。放弃原因是会与组件库治理和项目维护规范产生重复边界。

## Risks / Trade-offs

- [风险] 规则写得太重会让局部 UI 小修都被误判为 Spec-Driven。  
  缓解：明确 Fast Track 局部样式/文案小修不默认升级；只有新增页面、跨页面一致性、公共组件或动作层级变化才触发稳定规则。

- [风险] 样式指南与专项 spec 重复。  
  缓解：指南只写入口和优先级，并显式指向已有 `learning-action-button-hierarchy`、`detail-footer-actions`、`component-library-governance`。

- [风险] 不批量重构现有页面会留下历史不一致。  
  缓解：本轮目标是阻止新增漂移；已有页面如果后续被触达，再按指南做局部收口。

## Stability Closure

- 不稳定点：UI 风格判断分散在组件库、按钮专项规则和维护手册里，新增页面时缺少统一入口。
- 本轮收口：新增样式指南、接入索引、补 OpenSpec delta、更新维护手册。
- 不收项：现有页面批量视觉审计、token 重命名、Storybook/视觉回归。
- 风险记录：保留在本 change 的 proposal、design、tasks 中；后续若发现具体页面漂移，另起 Fast Track 或 Spec-Driven 处理。
