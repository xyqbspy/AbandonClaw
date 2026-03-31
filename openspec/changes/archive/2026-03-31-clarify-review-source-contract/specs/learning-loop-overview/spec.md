## ADDED Requirements

### Requirement: Review 数据来源解释必须与学习闭环一致
系统 MUST 在学习闭环层面明确 `review` 的普通表达复习来自已保存且到期的表达集合，并把“来源场景”视为辅助回看关系，而不是默认的完成门槛。

#### Scenario: 维护学习闭环中的 review 入口
- **WHEN** 维护者调整 `today`、`chunks`、`review` 或场景学习链路
- **THEN** 必须把 `review` 普通表达来源解释为已保存且到期的表达
- **AND** 不得在未显式变更契约的情况下，把来源场景完成度隐式提升为进入 review 的前置条件
