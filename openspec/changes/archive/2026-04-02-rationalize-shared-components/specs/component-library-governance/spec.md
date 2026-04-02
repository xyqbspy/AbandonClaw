## ADDED Requirements

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
