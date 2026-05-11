## ADDED Requirements

### Requirement: 注册必须支持邮箱验证码前置校验

系统 MUST 在允许注册的模式下支持注册邮箱验证码，并在创建 Supabase Auth 用户前完成服务端校验。

#### Scenario: 用户请求发送注册邮箱验证码

- **WHEN** 用户在注册页提交邮箱并请求验证码
- **THEN** 系统 MUST 在服务端生成短期有效验证码
- **AND** 验证码明文 MUST 不落库
- **AND** 系统 MUST 记录验证码 hash、过期时间、错误次数和消费状态
- **AND** 系统 MUST 发送验证码邮件或在非生产调试环境通过受控日志暴露发送结果

#### Scenario: 用户提交带邮箱验证码的注册请求

- **WHEN** 用户在 `invite_only` 或 `open` 模式下提交注册请求
- **THEN** 系统 MUST 在创建 Supabase Auth 用户前校验邮箱验证码
- **AND** 验证码 MUST 与注册邮箱一致
- **AND** 验证码 MUST 未过期、未消费且错误次数未超过上限

#### Scenario: 用户提交错误或过期验证码

- **WHEN** 用户提交错误、过期、已消费或超出错误次数上限的验证码
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得创建 Supabase Auth 用户
- **AND** 不得扣减邀请码使用次数

#### Scenario: 注册创建账号成功后消费验证码

- **WHEN** 邮箱验证码校验通过且 Supabase Auth 用户创建成功
- **THEN** 系统 MUST 将该验证码标记为已消费
- **AND** 同一验证码不得再次用于注册
