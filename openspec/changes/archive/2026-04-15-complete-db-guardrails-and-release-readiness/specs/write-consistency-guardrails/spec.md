# 规范文档：write-consistency-guardrails

## MODIFIED Requirements

### Requirement: 关键写接口必须具备幂等或条件更新保护
当关键写接口的服务层已经具备幂等、条件更新或等效一致性保护时，系统 SHOULD 为关键用户态写表补充最小数据库侧配套说明，以便维护者明确哪些一致性保证由应用层承担，哪些约束需要数据库策略共同承接。

#### Scenario: 维护者审计关键写接口的一致性保护
- **WHEN** 维护者审计 `review submit`、`learning progress`、`phrases save` 或相关练习写链路
- **THEN** 系统 MUST 说明当前一致性保护落在应用层、数据库层或两者共同承担
- **AND** 不得只留下隐含实现而缺少边界说明
