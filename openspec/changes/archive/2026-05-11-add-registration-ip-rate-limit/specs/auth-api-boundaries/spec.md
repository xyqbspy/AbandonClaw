## ADDED Requirements

### Requirement: 注册入口必须在创建账号前限制同一 IP 频率
系统 MUST 在服务端 `/api/auth/signup` 入口对同一客户端 IP 执行注册频控，并在 `invite_only` 或 `open` 模式下于邀请码校验和 Auth 注册前完成拦截。

#### Scenario: 同一 IP 在阈值内注册
- **WHEN** 同一客户端 IP 在注册频控窗口内提交注册请求且未超过阈值
- **THEN** 系统 MUST 允许请求继续进入后续注册流程
- **AND** 不得改变原有注册模式、邀请码或邮箱验证语义

#### Scenario: 同一 IP 超过注册阈值
- **WHEN** 同一客户端 IP 在窗口期内超过注册入口阈值
- **THEN** 系统 MUST 在邀请码校验和 Auth 注册前直接拒绝请求
- **AND** 不得继续执行邀请码扣减、attempt 写入或 Auth 注册
