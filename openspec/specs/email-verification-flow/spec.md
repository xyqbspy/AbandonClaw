# email-verification-flow Specification

## Purpose

定义邮箱注册后的验证邮件回跳、验证结果处理和重发验证邮件闭环，确保邮箱验证不是只有注册成功提示，而是具备项目内可控入口与失败收敛。

## Requirements

### Requirement: 邮箱注册必须显式发送项目内验证回跳地址
系统 MUST 在通过 Supabase Auth 创建邮箱账号时传入项目内受控邮箱验证回跳地址。

#### Scenario: 用户通过邮箱注册
- **WHEN** 用户在允许注册的模式下提交邮箱和密码
- **THEN** 系统 MUST 调用 Supabase Auth 创建邮箱账号
- **AND** 请求 MUST 包含项目内 `/auth/callback` 回跳地址
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
