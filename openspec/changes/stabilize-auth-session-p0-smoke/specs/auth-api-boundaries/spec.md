## ADDED Requirements

### Requirement: 登录成功必须稳定进入安全站内落点
系统 MUST 在登录成功后使用统一安全 redirect 规则进入站内页面；当没有合法 redirect 目标时，默认进入 `/today`。

#### Scenario: 正确账号登录且没有 redirect
- **WHEN** 用户在登录页输入正确邮箱和密码并点击一次登录
- **THEN** 系统 MUST 完成登录 session 写入
- **AND** 系统 MUST 跳转到 `/today`
- **AND** 系统 MUST 不停留在登录页仅展示成功提示

#### Scenario: 正确账号登录且 redirectTo 合法
- **WHEN** 用户在登录页带合法站内 `redirectTo` 或等效 redirect 参数登录成功
- **THEN** 系统 MUST 跳转到该站内路径
- **AND** 系统 MUST 保持与 middleware 使用一致的安全 redirect 校验

#### Scenario: 正确账号登录且 redirectTo 不安全
- **WHEN** 用户在登录页带外部 URL、协议相对 URL 或非法 redirect 参数登录成功
- **THEN** 系统 MUST 忽略该 redirect 参数
- **AND** 系统 MUST 跳转到 `/today`

#### Scenario: 登录提交期间重复点击
- **WHEN** 用户点击登录后登录请求尚未结束
- **THEN** 登录按钮 MUST 处于 loading 或 disabled 状态
- **AND** 系统 MUST 不重复发起多个登录请求

### Requirement: Auth 入口必须展示可读错误
系统 MUST 将注册、发验证码和登录入口的 Supabase、fetch 与 API 错误映射为用户可读中文提示；排障信息可通过 console 或日志保留，不得直接裸露原始错误给用户。

#### Scenario: 登录凭据错误
- **WHEN** 用户使用错误邮箱或密码登录
- **THEN** 登录页 MUST 展示 `邮箱或密码不正确`
- **AND** 页面 MUST 不直接展示 Supabase 原始英文错误

#### Scenario: 网络异常
- **WHEN** 注册、发验证码或登录请求发生 network error 或 `failed fetch`
- **THEN** 页面 MUST 展示 `网络请求失败，请刷新后重试`
- **AND** 页面 MUST 不直接展示 `failed fetch`

#### Scenario: 请求过于频繁
- **WHEN** 注册、发验证码或登录入口收到 429 或等效限流错误
- **THEN** 页面 MUST 展示 `操作太频繁，请稍后再试`
- **AND** 系统 MUST 不移除或绕过既有限流

#### Scenario: 邀请码无效或过期
- **WHEN** 用户注册时提交无效或过期邀请码
- **THEN** 注册页 MUST 展示 `邀请码无效或已过期`
- **AND** 系统 MUST 不创建 Supabase Auth 用户

#### Scenario: 验证码发送失败
- **WHEN** 用户请求发送邮箱验证码但服务端返回发送失败
- **THEN** 注册页 MUST 展示 `验证码发送失败，请稍后再试`

#### Scenario: 错误响应包含 requestId
- **WHEN** Auth API 错误响应包含 `requestId`
- **THEN** 前端 MUST 在 console 输出该 `requestId` 以便日志定位
- **AND** 用户提示默认 MUST 不展示冗长排障信息

### Requirement: 测试账号不得放宽正式注册边界
系统 MUST 通过受保护脚本创建测试账号；该能力不得放开真实用户注册、验证码或邀请码限制。

#### Scenario: 测试账号 seed 创建用户
- **WHEN** 维护者通过受保护 seed 脚本创建测试账号
- **THEN** 系统 MAY 使用 service role 创建 email confirmed 的测试用户
- **AND** 系统 MUST 不改变 `/api/auth/signup` 的 `invite_only`、验证码或限流语义
