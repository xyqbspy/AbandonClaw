## MODIFIED Requirements

### Requirement: 关键学习动作必须具备最小业务级可观测性
系统 MUST 让维护者能够回看最近记录的关键学习动作与失败摘要，而不是只能依赖控制台瞬时输出。

#### Scenario: 维护者查看最近业务事件
- **WHEN** 维护者打开可回看入口
- **THEN** 系统 MUST 展示最近关键业务事件与失败摘要
- **AND** 这些记录 MUST 控制在最小字段范围内
