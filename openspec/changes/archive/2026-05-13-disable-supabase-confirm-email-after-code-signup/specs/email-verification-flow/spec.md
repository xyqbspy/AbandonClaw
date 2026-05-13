## MODIFIED Requirements

### Requirement: 邮箱注册必须以项目 6 位验证码作为主链路验证依据
系统 MUST 将注册页提交的 6 位邮箱验证码作为新注册账号的主链路邮箱验证依据。用户通过验证码校验并成功创建账号后，系统 MUST 不再要求用户额外点击 Supabase Confirm email 链接才能进入主应用。

#### Scenario: 用户通过邮箱验证码注册成功
- **WHEN** 用户在允许注册的模式下提交邮箱、密码和有效邮箱验证码
- **THEN** 系统 MUST 调用 Supabase Auth 创建邮箱账号
- **AND** 系统 MUST 确保创建出的 Auth 用户满足主应用邮箱已验证判定
- **AND** 用户后续登录后 MUST 能进入主应用，而不是被重复拦截到 `/verify-email`

#### Scenario: 用户提交错误或过期验证码
- **WHEN** 用户提交错误、过期、已消费或超出错误次数上限的验证码
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得创建 Supabase Auth 用户
- **AND** 不得扣减邀请码使用次数

### Requirement: Supabase 邮件链接验证入口必须作为兼容路径保留
系统 MAY 保留 `/auth/callback` 与 `/verify-email` 作为旧账号、手工补救或未来 Supabase 邮件能力的兼容入口，但它们 MUST NOT 成为新注册主链路的第二道必需邮箱确认。

#### Scenario: 用户点击旧 Supabase 验证邮件
- **WHEN** Supabase 将用户带到 `/auth/callback?code=...`
- **THEN** 系统 SHOULD 继续使用 Supabase server client 交换 code
- **AND** 成功或失败后 MUST 只跳转到安全站内目标

#### Scenario: 新注册用户已经通过 6 位验证码
- **WHEN** 用户已通过项目 6 位验证码完成注册
- **THEN** 系统 MUST NOT 要求用户再通过 `/verify-email` 才能访问主应用
