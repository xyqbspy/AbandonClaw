## ADDED Requirements

### Requirement: 管理员必须能够查看当前注册模式
系统 MUST 在 admin-only 后台提供当前注册模式的最小可见性，包括生效模式、来源、最近修改人和最近修改时间。

#### Scenario: 管理员查看注册模式
- **WHEN** 管理员打开注册准入管理入口
- **THEN** 系统 MUST 展示当前生效注册模式
- **AND** 系统 MUST 展示该模式来自后台运行时配置、环境变量或默认兜底

### Requirement: 管理员必须能够切换注册模式
系统 MUST 允许管理员通过受控后台入口把注册模式切换为 `closed`、`invite_only` 或 `open`。

#### Scenario: 管理员切换为邀请注册
- **WHEN** 管理员把注册模式切换为 `invite_only`
- **THEN** 系统 MUST 持久化该模式
- **AND** 后续注册页 MUST 展示邀请码输入框
- **AND** 后续注册请求 MUST 按邀请注册规则校验邀请码

#### Scenario: 管理员切换为关闭注册
- **WHEN** 管理员把注册模式切换为 `closed`
- **THEN** 系统 MUST 持久化该模式
- **AND** 后续注册请求 MUST 在创建 Supabase Auth 用户前被拒绝

#### Scenario: 管理员切换为开放注册
- **WHEN** 管理员把注册模式切换为 `open`
- **THEN** 系统 MUST 持久化该模式
- **AND** 后续注册请求 MUST 不要求邀请码

### Requirement: 注册模式写入口必须限制为 admin-only
系统 MUST 将注册模式写入口限制为管理员能力，并拒绝非法模式值。

#### Scenario: 非管理员尝试切换注册模式
- **WHEN** 非管理员用户调用注册模式切换入口
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得更新运行时注册模式

#### Scenario: 管理员提交非法注册模式
- **WHEN** 管理员提交不属于 `closed`、`invite_only` 或 `open` 的模式值
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得更新运行时注册模式
