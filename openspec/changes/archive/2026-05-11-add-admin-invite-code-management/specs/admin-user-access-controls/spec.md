## ADDED Requirements

### Requirement: Admin 后台必须提供最小注册准入管理入口
系统 MUST 在现有 admin 后台边界内提供最小注册邀请码管理入口，让管理员无需直接操作数据库即可完成测试和小范围发码。

#### Scenario: 管理员进入注册准入管理入口
- **WHEN** 管理员访问后台中的邀请码管理入口
- **THEN** 系统 MUST 提供生成、查看、停用和调整邀请码的最小操作
- **AND** 该入口 MUST 与现有 admin 鉴权边界保持一致

#### Scenario: 首版邀请码管理入口加载
- **WHEN** 系统渲染首版邀请码管理能力
- **THEN** 页面 MAY 提供最小列表、生成表单和停用/调整操作
- **AND** 不得把 recipient、渠道归因、邮件发送或完整增长运营能力视为本 requirement 的完成条件
