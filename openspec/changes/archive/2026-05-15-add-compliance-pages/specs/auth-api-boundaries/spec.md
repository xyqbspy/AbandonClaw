# 规范文档：auth-api-boundaries

## ADDED Requirements

### Requirement: 注册流程必须包含明示同意条款步骤
系统 MUST 在用户提交注册请求前，要求其明确勾选同意服务条款与隐私政策；未勾选时 MUST 阻止提交。

#### Scenario: 用户未勾选同意条款
- **WHEN** 用户访问注册页
- **AND** 未勾选「我已阅读并同意《服务条款》和《隐私政策》」 checkbox
- **THEN** 注册提交按钮 MUST 处于 disabled 状态
- **AND** 即使绕过 disabled 状态触发提交，前端 MUST 阻止请求并提示用户勾选

#### Scenario: 用户勾选同意条款
- **WHEN** 用户勾选 consent checkbox
- **THEN** 注册提交按钮 MUST 变为可点击状态
- **AND** 后续注册流程 MUST 与现有逻辑一致
