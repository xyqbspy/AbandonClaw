## ADDED Requirements

### Requirement: 公网开放真实 HTTP baseline 必须覆盖注册与高成本防护矩阵
当系统准备进入公网小范围开放时，维护者 MUST 通过真实 HTTP 入口执行一组固定的基线场景，而不能只保留单接口压测或单元测试结果。

#### Scenario: 维护者执行公网开放 baseline
- **WHEN** 维护者为注册模式、邀请码、邮箱验证、限流、quota、账号状态或后台状态入口做公开前验证
- **THEN** 系统 MUST 提供统一的真实 HTTP baseline 执行入口
- **AND** baseline MUST 至少覆盖注册模式、邮箱未验证、Origin 拒绝、高成本接口正常调用、user 限流、IP 限流、daily quota、受限账号和后台状态场景

#### Scenario: baseline 结果被记录
- **WHEN** 维护者完成一轮公网开放 baseline
- **THEN** 系统 MUST 输出可留存的结构化结果
- **AND** 结果 MUST 包含请求目标、关键状态码、状态分布、异常摘要以及当前限流后端或等价运行状态

#### Scenario: baseline 缺少必要环境参数
- **WHEN** 维护者执行某个公网开放 baseline 场景时缺少 cookie、邀请码、Origin 或其他必要参数
- **THEN** 系统 MUST 将该场景标记为 blocked 或 skipped
- **AND** 不得静默跳过并宣称该场景已验证
