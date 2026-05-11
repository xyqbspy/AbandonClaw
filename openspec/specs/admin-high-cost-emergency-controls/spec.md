# admin-high-cost-emergency-controls Specification

## Purpose

定义 admin-only 高成本 capability 紧急开关的稳定行为，确保管理员可以在公开前后临时关闭异常成本入口，并且关闭状态在 quota 预占和上游调用前生效。

## Requirements

### Requirement: 管理员必须能够查看高成本 capability 开关状态
系统 MUST 在 admin-only 后台展示所有高成本 capability 的启停状态。

#### Scenario: 管理员查看高成本紧急控制
- **WHEN** 管理员打开高成本紧急控制入口
- **THEN** 系统 MUST 展示每个高成本 capability
- **AND** 系统 MUST 展示该 capability 当前启用或关闭

### Requirement: 管理员必须能够临时关闭和恢复高成本 capability
系统 MUST 允许管理员通过受控入口关闭或恢复单个高成本 capability。

#### Scenario: 管理员关闭高成本 capability
- **WHEN** 管理员关闭某个高成本 capability
- **THEN** 系统 MUST 持久化该关闭状态
- **AND** 后续该 capability 的请求 MUST 在 quota 预占和上游调用前被拒绝

#### Scenario: 管理员恢复高成本 capability
- **WHEN** 管理员恢复某个高成本 capability
- **THEN** 系统 MUST 移除该 capability 的关闭状态
- **AND** 后续该 capability 的请求 MAY 按现有 quota、限流和权限规则继续处理

### Requirement: 高成本紧急控制写入口必须限制为 admin-only
系统 MUST 将高成本 capability 启停写入口限制为管理员能力，并拒绝非法 capability。

#### Scenario: 非管理员尝试关闭 capability
- **WHEN** 非管理员调用高成本 capability 启停入口
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得更新运行时配置

#### Scenario: 管理员提交非法 capability
- **WHEN** 管理员提交不在高成本 capability 列表内的值
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得更新运行时配置
