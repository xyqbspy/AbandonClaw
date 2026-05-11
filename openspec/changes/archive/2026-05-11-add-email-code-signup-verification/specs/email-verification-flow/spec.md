## ADDED Requirements

### Requirement: 注册页邮箱验证必须提供验证码输入体验

系统 MUST 为注册页提供“发送邮箱验证码 -> 输入验证码 -> 提交注册”的显式体验，而不只依赖注册后的邮件链接确认。

#### Scenario: 注册页发送验证码

- **WHEN** 用户在注册页输入合法邮箱并点击发送验证码
- **THEN** 页面 MUST 调用服务端验证码发送入口
- **AND** 成功后 MUST 提供可理解的发送成功反馈
- **AND** 页面 MUST 在冷却时间内限制重复发送

#### Scenario: 注册页提交验证码

- **WHEN** 用户提交注册表单
- **THEN** 页面 MUST 把邮箱验证码随注册请求提交到服务端
- **AND** 未填写验证码时 MUST 在客户端给出受控提示

#### Scenario: 注册模式为 invite_only

- **WHEN** 有效注册模式为 `invite_only`
- **THEN** 注册页 MUST 同时要求邀请码和邮箱验证码
- **AND** 两者都不得只依赖前端校验
