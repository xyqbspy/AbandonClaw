## ADDED Requirements

### Requirement: 公网注册开放前必须完成 P0-A baseline 记录
当变更涉及开放注册、邀请码、邮箱验证主应用拦截或高成本接口公网保护时，维护流程 MUST 在实现完成态前记录 P0-A 真实 HTTP baseline。该记录 MUST 覆盖注册模式、邀请码、邮箱验证、共享限流状态、用户维度限流、IP 维度限流和 Origin 拒绝。

#### Scenario: 维护者准备完成公网注册 P0-A 变更
- **WHEN** 维护者准备将公网注册 P0-A 变更标记为完成
- **THEN** tasks 或 dev-log MUST 记录真实 HTTP baseline 的执行结果
- **AND** baseline MUST 明确列出注册模式、邀请码、邮箱验证、限流后端、user/IP 限流和 Origin 校验结果

#### Scenario: baseline 发现公网开放阻断项
- **WHEN** P0-A baseline 发现 `REGISTRATION_MODE` 误开、邮箱验证未阻断、限流后端为 memory-only 或 user/IP 限流缺失
- **THEN** 维护者 MUST 将该问题记录为阻断项
- **AND** 不得将该变更作为已完成的公网开放前硬门槛提交

### Requirement: 公网开放防护变更必须明确 P0-A 与 P0-B 边界
当维护者处理公网注册或高成本接口滥用防护时，维护流程 MUST 明确本轮属于 P0-A、P0-B、P1 或 P2，并记录本轮不收项。P0-A 变更不得无意扩展为每日额度、封禁后台、学习时长可信化或完整运营平台。

#### Scenario: 维护者创建公网开放相关 change
- **WHEN** 维护者创建涉及公网注册或滥用防护的 OpenSpec change
- **THEN** proposal、design 或 tasks MUST 记录本轮优先级层级
- **AND** MUST 记录本轮明确不收的后续层级能力

#### Scenario: P0-A 实现过程中发现 P0-B 风险
- **WHEN** P0-A 实现过程中发现每日额度、封禁状态、学习时长 delta 或运营后台风险
- **THEN** 维护者 MUST 记录风险去向
- **AND** 不得在未更新 proposal / design / tasks 的情况下直接扩大实现范围
