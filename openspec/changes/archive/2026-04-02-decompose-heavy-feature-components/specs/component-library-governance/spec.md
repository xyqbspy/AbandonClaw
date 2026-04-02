## ADDED Requirements

### Requirement: 强业务语义的重组件必须优先做内部拆分而不是公共化
系统 MUST 在组件已经明显超重、但仍然具有强 feature 语义时，优先进行 feature 内部拆分，而不是因为文件过大就直接迁入公共组件层。

#### Scenario: 重组件尚未形成稳定跨 feature 复用
- **WHEN** 某个组件体量很大，但它的状态模型、交互语义和输入输出仍明显属于单一 feature
- **THEN** 维护者必须优先考虑拆成该 feature 内部的 hook、logic 或 section component
- **AND** 不得仅因文件过大就把它提升到 `src/components/*`
