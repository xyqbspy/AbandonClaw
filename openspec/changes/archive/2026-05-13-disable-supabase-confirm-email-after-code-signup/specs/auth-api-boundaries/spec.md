## MODIFIED Requirements

### Requirement: 注册必须支持邮箱验证码前置校验
系统 MUST 在允许注册的模式下支持注册邮箱验证码，并在创建 Supabase Auth 用户前完成服务端校验。验证码校验成功且账号创建成功后，系统 MUST 将该账号视为邮箱已验证，不得再依赖 Supabase Confirm email 作为进入主应用的第二道必需确认。

#### Scenario: 用户请求发送注册邮箱验证码
- **WHEN** 用户在注册页提交邮箱并请求验证码
- **THEN** 系统 MUST 在服务端生成短期有效验证码
- **AND** 验证码明文 MUST 不落库
- **AND** 系统 MUST 记录验证码 hash、过期时间、错误次数和消费状态

#### Scenario: 用户提交带邮箱验证码的注册请求
- **WHEN** 用户在 `invite_only` 或 `open` 模式下提交注册请求
- **THEN** 系统 MUST 在创建 Supabase Auth 用户前校验邮箱验证码
- **AND** 验证码 MUST 与注册邮箱一致
- **AND** 验证码 MUST 未过期、未消费且错误次数未超过上限
- **AND** Auth 用户创建成功后 MUST 满足邮箱已验证判定

#### Scenario: 用户提交错误或过期验证码
- **WHEN** 用户提交错误、过期、已消费或超出错误次数上限的验证码
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得创建 Supabase Auth 用户
- **AND** 不得扣减邀请码使用次数

#### Scenario: 注册创建账号成功后消费验证码
- **WHEN** 邮箱验证码校验通过且 Supabase Auth 用户创建成功
- **THEN** 系统 MUST 将该验证码标记为已消费
- **AND** 同一验证码不得再次用于注册

### Requirement: 邮箱未验证用户不得进入主应用或高成本写入口
系统 MUST 在主应用页面入口与高成本/关键写 API 入口检查认证层邮箱验证状态。通过项目 6 位验证码成功注册的新账号 MUST 已满足该状态；未满足该状态的旧账号或异常账号仍 MUST 被阻止进入主应用。

#### Scenario: 邮箱未验证用户访问主应用页面
- **WHEN** 已登录但邮箱未验证的用户访问 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson` 或 `/admin`
- **THEN** 系统 MUST 重定向到受控邮箱验证提示页
- **AND** 不得继续进入学习主链路页面

#### Scenario: 项目验证码注册成功用户访问主应用
- **WHEN** 用户通过项目 6 位验证码完成注册并登录
- **THEN** 系统 MUST 允许用户进入主应用
- **AND** 不得因为缺少 Supabase Confirm email 点击而重定向到 `/verify-email`
