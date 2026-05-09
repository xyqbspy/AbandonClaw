## ADDED Requirements

### Requirement: 注册入口必须受服务端注册模式控制
系统 MUST 由服务端注册入口控制是否允许新账号注册。注册模式 MUST 至少支持 `closed`、`invite_only` 和 `open`。客户端展示可以跟随模式变化，但不得成为唯一校验来源。

#### Scenario: 注册模式为 closed
- **WHEN** 未登录访客提交注册请求
- **AND** 当前 `REGISTRATION_MODE` 为 `closed`
- **THEN** 系统 MUST 拒绝创建新账号
- **AND** 系统 MUST 返回受控错误而不是继续调用 Supabase Auth 创建用户

#### Scenario: 注册模式为 invite_only
- **WHEN** 未登录访客提交注册请求
- **AND** 当前 `REGISTRATION_MODE` 为 `invite_only`
- **THEN** 系统 MUST 在创建账号前校验邀请码
- **AND** 邀请码无效时 MUST 拒绝创建新账号

#### Scenario: 注册模式为 open
- **WHEN** 未登录访客提交注册请求
- **AND** 当前 `REGISTRATION_MODE` 为 `open`
- **THEN** 系统 MAY 允许不带邀请码的注册请求继续进入账号创建流程
- **AND** 仍 MUST 保留邮箱验证、错误收口和受保护主链路边界

### Requirement: Invite-only 注册必须具备可追踪的邀请码使用记录
当注册模式为 `invite_only` 时，系统 MUST 使用可管理的邀请码记录，而不是只依赖单个全局明文环境变量。邀请码 MUST 支持最大使用次数、已使用次数和可选过期时间。系统 MUST 记录注册尝试，以便追踪账号创建和邀请码扣次数之间的不一致。

#### Scenario: 邀请码达到最大使用次数
- **WHEN** 用户提交的邀请码已经达到 `max_uses`
- **THEN** 系统 MUST 拒绝注册
- **AND** 系统 MUST NOT 继续调用 Supabase Auth 创建用户

#### Scenario: 邀请码已过期
- **WHEN** 用户提交的邀请码已经超过 `expires_at`
- **THEN** 系统 MUST 拒绝注册
- **AND** 系统 MUST 记录受控失败原因

#### Scenario: 账号创建成功后记录邀请码使用
- **WHEN** 用户使用有效邀请码成功创建账号
- **THEN** 系统 MUST 增加该邀请码的 `used_count`
- **AND** 系统 MUST 记录包含用户标识或邮箱摘要的使用尝试结果

#### Scenario: 账号创建与邀请码扣次数出现不一致
- **WHEN** 邀请码校验通过且账号创建成功
- **AND** 邀请码扣次数或使用记录写入失败
- **THEN** 系统 MUST 保留可追踪的补偿记录
- **AND** 维护者 MUST 能定位需要人工修复的注册尝试

### Requirement: 未验证邮箱用户不得进入主应用主链路
系统 MUST 阻止邮箱未验证用户进入主应用学习链路或触发会创建学习数据、高成本资源的 API。未验证用户 MAY 访问登录、注册、验证提示或重发验证邮件相关路径。

#### Scenario: 未验证邮箱用户访问主应用页面
- **WHEN** 已登录但邮箱未验证的用户访问 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings` 或 `/lesson`
- **THEN** 系统 MUST 阻止进入目标页面
- **AND** 系统 MUST 引导用户完成邮箱验证

#### Scenario: 未验证邮箱用户调用高成本接口
- **WHEN** 已登录但邮箱未验证的用户调用会触发 AI、TTS 或生成能力的受保护接口
- **THEN** 系统 MUST 在进入高成本处理前拒绝请求
- **AND** 系统 MUST NOT 调用外部模型、TTS 或写入学习数据

#### Scenario: 已验证邮箱用户进入主应用
- **WHEN** 已登录且邮箱已验证的用户访问主应用页面或受保护 API
- **THEN** 系统 MUST 按既有认证、权限、限流和业务校验继续处理
