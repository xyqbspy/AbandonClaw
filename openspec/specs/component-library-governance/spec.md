## Purpose

定义仓库组件分层、跨 feature 复用组件公共化和组件库说明文档的维护规则，避免长期保留 feature-to-feature 组件依赖和失控抽象。
## Requirements
### Requirement: 已跨 feature 复用的组件必须迁移到公共层
系统 MUST 将已经被多个 feature 直接复用的组件视为公共职责，而不是继续保留在某个单独 feature 的组件目录中。

#### Scenario: `lesson` 直接依赖 `chunks` 组件
- **WHEN** 某个组件位于 `src/features/<feature-a>/components` 下，但已经被 `src/features/<feature-b>/components` 或页面层直接复用
- **THEN** 该组件必须评估并迁移到合适的公共层
- **AND** 不得长期保留 feature-to-feature 的组件依赖

### Requirement: 组件分层规则必须有固定文档说明
系统 MUST 提供一份组件库说明文档，明确公共组件、feature 组件和页面组装组件的放置规则。

#### Scenario: 维护者准备新增或迁移组件
- **WHEN** 维护者需要新增组件或判断现有组件是否该抽公共
- **THEN** 他必须能够通过固定文档判断组件应放在 `components/*`、`features/*` 还是页面层
- **AND** 文档必须说明“什么情况下不该抽公共”

### Requirement: 公共组件迁移不得改变既有交互行为
系统 MUST 在组件公共化迁移后保持既有页面交互和视觉职责稳定，不得因为目录迁移而改变组件对外行为。

#### Scenario: 迁移跨 feature 复用组件
- **WHEN** 维护者把某个已复用组件从 `features/*` 迁移到公共层
- **THEN** 组件对外 props 语义和渲染行为必须保持兼容
- **AND** 受影响页面或交互测试必须继续通过

### Requirement: 强业务语义的重组件必须优先做内部拆分而不是公共化
系统 MUST 在组件已经明显超重、但仍然具有强 feature 语义时，优先进行 feature 内部拆分，而不是因为文件过大就直接迁入公共组件层。

#### Scenario: 重组件尚未形成稳定跨 feature 复用
- **WHEN** 某个组件体量很大，但它的状态模型、交互语义和输入输出仍明显属于单一 feature
- **THEN** 维护者必须优先考虑拆成该 feature 内部的 hook、logic 或 section component
- **AND** 不得仅因文件过大就把它提升到 `src/components/*`

### Requirement: 共享交互组件必须优先提供统一反馈能力
系统 MUST 为跨页面复用的共享交互组件提供统一、可复用的反馈能力，避免同类状态在不同页面各自实现。

#### Scenario: 共享 loading 文案需要展示动态等待反馈
- **WHEN** 某个页面需要展示“生成中”“进入中”“加载中”之类的 loading 文案
- **THEN** 系统必须提供可复用的共享 loading 文案组件
- **AND** 该组件必须支持统一的动态省略号反馈
- **AND** 使用方不应各自重复实现省略号动画

### Requirement: UI 风格指南必须作为新增页面和功能的固定入口
系统 MUST 提供一份轻量 UI 风格指南，帮助维护者在新增页面、功能入口或跨页面 UI 调整前判断页面布局、动作层级、组件归属和样式写法，避免只依赖局部页面惯性继续产生风格漂移。

#### Scenario: 维护者新增页面或功能入口
- **WHEN** 维护者准备新增一个页面、主要功能入口或跨页面可复用 UI
- **THEN** 他必须能够通过 `docs/system-design/ui-style-guidelines.md` 判断应复用哪些既有组件、按钮层级和页面结构
- **AND** 若该 UI 涉及组件抽取或跨 feature 复用，还必须继续遵守组件库说明和组件库治理 capability
- **AND** 不得仅因为局部页面已有相似 class 或临时视觉效果，就绕过既有组件和样式入口

### Requirement: 渐进式 UI 收口必须先记录审计范围
系统 MUST 在进行跨页面 UI 风格收口前记录本轮审计范围、收口对象和明确不收项，避免把局部样式优化扩大成未受控的全站视觉重构。

#### Scenario: 维护者继续收口已有页面样式
- **WHEN** 维护者在已有 UI 收口之后继续处理同一页面或同一 feature 内的样式漂移
- **THEN** 必须继续记录本轮具体收口对象
- **AND** 若样式强依赖单一 feature 或页面语义，必须优先在该 feature 或页面内部收敛
- **AND** 不得仅因为样式被局部复用，就直接提升为全局 token 或 shared 组件
- **AND** 必须记录本轮不提升为全局样式入口的原因和后续风险位置

### Requirement: Page-family UI consolidation must be audited and batched
The system MUST require maintainers to record scope, batch order, main-flow protection points, and explicit non-goals before consolidating styles for a page family such as `scene`.

#### Scenario: Maintainer prepares to standardize the scene page family
- **WHEN** a maintainer prepares to standardize the page skeleton, sections, action hierarchy, status feedback, or local style constants for the `scene` page family
- **THEN** they MUST first record the affected files, page roles, primary action hierarchy, and minimum validation scope
- **AND** they MUST preserve scene reading, audio, expression saving, practice, variants, session recovery, and learning-state writeback semantics
- **AND** they MUST NOT promote scene-private training components to global shared components or global tokens only because they look visually similar

#### Scenario: Maintainer discovers repeated scene-local styles
- **WHEN** repeated class patterns are found across `scene` page-layer components, scene feature components, or lesson reader components
- **THEN** the maintainer MUST first prefer a page-family or feature-private style entry when the pattern depends on scene learning semantics
- **AND** they MUST record any candidate for future shared extraction instead of extracting it during the same batch without a stable cross-feature contract
