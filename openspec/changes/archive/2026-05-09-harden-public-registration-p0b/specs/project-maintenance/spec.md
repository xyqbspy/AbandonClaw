## ADDED Requirements

### Requirement: 公网开放 P0-B 必须记录成本、账号状态和学习时长防护验证
当变更完成公网开放 P0-B 能力时，维护流程 MUST 记录每日 quota、usage 预占、账号访问状态、学习时长 delta 防污染和 admin 今日摘要的验证结果。

#### Scenario: 维护者完成 P0-B 变更
- **WHEN** 维护者完成每日 quota、usage 预占、账号访问状态或学习时长 delta 防护变更
- **THEN** 必须记录相关单元测试、接口测试或真实 HTTP baseline
- **AND** 必须说明哪些 P1/P2 运营能力仍未完成

#### Scenario: P0-B 不包含完整运营后台
- **WHEN** 维护者收尾 P0-B 变更
- **THEN** 必须在公网开放计划中保留完整后台、异常用户列表、趋势报表、复杂风控和 heartbeat 的剩余风险
- **AND** 不得把 P0-B 完成描述为正式公开开放完成态
