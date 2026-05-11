## MODIFIED Requirements

### Requirement: 邮箱未验证用户不得进入主应用或高成本写入口
系统 MUST 在主应用页面入口与高成本/关键写 API 入口检查 Supabase 邮箱验证状态。系统还 MUST 提供项目内邮箱验证回调和重发验证邮件入口，使邮箱注册后的验证链路具备最小闭环。

#### Scenario: 邮箱未验证用户访问主应用页面
- **WHEN** 已登录但邮箱未验证的用户访问 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson` 或 `/admin`
- **THEN** 系统 MUST 重定向到受控邮箱验证提示页
- **AND** 不得继续进入学习主链路页面

#### Scenario: 邮箱未验证用户调用受保护 API
- **WHEN** 已登录但邮箱未验证的用户调用受保护 API
- **THEN** 系统 MUST 返回受控 403 响应
- **AND** 不得触发模型、TTS 或学习数据写入

#### Scenario: 注册邮箱验证邮件回跳
- **WHEN** 用户点击 Supabase 邮箱验证邮件
- **THEN** 系统 MUST 通过项目内受控 callback route 处理验证结果
- **AND** 成功后 MUST 只跳转到安全站内目标

#### Scenario: 用户重发邮箱验证邮件
- **WHEN** 未验证用户需要重新发送验证邮件
- **THEN** 系统 MUST 提供受控重发入口
- **AND** 重发邮件 MUST 使用项目内受控 callback route
