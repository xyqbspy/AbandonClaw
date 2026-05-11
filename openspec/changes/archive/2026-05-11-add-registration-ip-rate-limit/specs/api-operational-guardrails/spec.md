## ADDED Requirements

### Requirement: 注册频控必须纳入统一运行护栏
系统 MUST 将注册入口 IP 频控纳入统一限流与失败收敛体系，使维护者可以用与高成本接口一致的方式验证、留证和排障。

#### Scenario: 注册入口命中频控
- **WHEN** 同一 IP 在注册窗口内超过阈值并请求 `/api/auth/signup`
- **THEN** 系统 MUST 返回受控 429
- **AND** 响应 MUST 带有 `requestId`
- **AND** 不得继续进入后续注册处理

#### Scenario: 维护者验证注册频控
- **WHEN** 维护者执行公网开放真实 HTTP baseline
- **THEN** baseline MUST 覆盖至少一个“同一 IP 注册命中 429”的场景
- **AND** 结果 MUST 与当前限流后端状态一起留证
