## ADDED Requirements

### Requirement: 高状态密度页面必须优先按数据流与局部交互边界拆分
仓库 MUST 在维护 `review`、`scenes` 这类同时承载缓存、阶段状态、手势或多弹层装配的页面时，优先按数据流、局部交互和 overlay 装配边界拆分，而不是继续把所有行为保留在单个 `page.tsx` 中。

#### Scenario: 维护者继续扩展 review 或 scenes 页面
- **WHEN** 维护者发现 `review/page.tsx` 或 `scenes/page.tsx` 同时承担数据刷新、局部状态机和大块 JSX 装配
- **THEN** 必须先评估是否拆成页面级 data hook、interaction controller 或局部 overlay/component
- **AND** 应在 OpenSpec change 中写清本轮拆分优先处理的职责块和对应回归范围
