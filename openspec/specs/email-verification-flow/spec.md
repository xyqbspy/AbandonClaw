# email-verification-flow Specification

## Purpose

定义注册邮箱验证码、Supabase 邮件链接确认兼容入口、未验证拦截和重发验证邮件闭环。注册页主体验是“发送验证码 -> 输入验证码 -> 提交注册”；Supabase `/auth/callback` 和 `/verify-email` 继续作为账号邮箱确认与兼容兜底。

## Requirements

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

### Requirement: 邮箱注册必须显式发送项目内验证回跳地址
系统 MUST 在通过 Supabase Auth 创建邮箱账号时传入项目内受控邮箱验证回跳地址。

#### Scenario: 用户通过邮箱注册
- **WHEN** 用户在允许注册的模式下提交邮箱、密码和有效邮箱验证码
- **THEN** 系统 MUST 调用 Supabase Auth 创建邮箱账号
- **AND** 请求 SHOULD 包含项目内 `/auth/callback` 回跳地址
- **AND** 回跳地址 MUST 只包含安全站内目标

### Requirement: 邮箱验证回调必须建立会话并跳转到安全站内目标
系统 MUST 提供邮箱验证 callback route，用于处理 Supabase 邮件链接中的 code。

#### Scenario: 用户点击有效验证邮件
- **WHEN** Supabase 将用户带到 `/auth/callback?code=...`
- **THEN** 系统 MUST 使用 Supabase server client 交换 code
- **AND** 成功后 MUST 跳转到安全站内目标

#### Scenario: 回调缺少 code 或交换失败
- **WHEN** `/auth/callback` 缺少 code 或 Supabase 交换失败
- **THEN** 系统 MUST 跳转到受控失败页面
- **AND** 不得跳转到跨站目标

### Requirement: 未验证用户必须能重发验证邮件
系统 MUST 为未验证邮箱用户提供受控的重发验证邮件入口。

#### Scenario: 用户请求重发验证邮件
- **WHEN** 用户在 `/verify-email` 提交邮箱地址
- **THEN** 系统 MUST 调用 Supabase Auth resend signup 邮件能力
- **AND** 请求 MUST 包含项目内 `/auth/callback` 回跳地址

#### Scenario: 用户提交非法邮箱
- **WHEN** 用户提交空邮箱或明显非法邮箱
- **THEN** 系统 MUST 返回受控校验失败
- **AND** 不得调用 Supabase resend
