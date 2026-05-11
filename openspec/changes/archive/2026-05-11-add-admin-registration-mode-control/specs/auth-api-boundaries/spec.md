## MODIFIED Requirements

### Requirement: 公网注册入口必须受注册模式控制
系统 MUST 通过服务端注册入口统一执行注册模式判断。注册模式 MUST 支持 `closed`、`invite_only` 和 `open`；后台运行时配置优先于 `REGISTRATION_MODE` 环境变量，非法值、缺失值或读取失败 MUST 保守回退为 `closed`。

#### Scenario: 注册模式关闭
- **WHEN** 用户提交注册请求且有效注册模式为 `closed`
- **THEN** 系统 MUST 在创建 Supabase Auth 用户前拒绝注册
- **AND** 注册页 MUST 展示受控关闭文案

#### Scenario: 邀请注册
- **WHEN** 用户提交注册请求且有效注册模式为 `invite_only`
- **THEN** 系统 MUST 在服务端校验邀请码
- **AND** 邀请码 MUST 使用 hash 匹配，不落库明文
- **AND** 注册尝试 MUST 记录 email、状态、关联邀请码、auth user id 或失败原因

#### Scenario: 运行时配置缺失或读取失败
- **WHEN** 后台运行时注册模式缺失、非法或读取失败
- **THEN** 系统 MUST 回退到合法的 `REGISTRATION_MODE`
- **AND** 若 `REGISTRATION_MODE` 也缺失或非法，系统 MUST 视为 `closed`
