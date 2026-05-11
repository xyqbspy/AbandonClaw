## Purpose

定义管理员最小用户处置入口的稳定行为，确保 `/admin/users` 能作为受控后台入口完成账号查找与 `access_status` 调整，而不膨胀成完整运营后台。
## Requirements
### Requirement: 管理员必须能够检索并查看最小用户状态信息
系统 MUST 在现有 `/admin` 后台内提供最小用户管理入口，让管理员可以按关键标识检索用户，并查看执行账号处置所需的最小信息。

#### Scenario: 管理员打开用户管理页
- **WHEN** 管理员访问用户管理页面
- **THEN** 系统 MUST 返回用户列表
- **AND** 每条记录 MUST 至少展示 `userId`、`email`、`username`、`access_status` 和 `created_at`

#### Scenario: 管理员按关键标识筛选用户
- **WHEN** 管理员使用 `email`、`userId`、`username` 或 `access_status` 进行筛选
- **THEN** 系统 MUST 只返回匹配条件的用户
- **AND** 不得要求管理员先进入数据库或调用手工 SQL

### Requirement: 管理员必须能够通过受控入口修改 access_status
系统 MUST 提供 admin-only 的受控操作入口，把用户状态切换到 `active`、`disabled`、`generation_limited` 或 `readonly`。

#### Scenario: 管理员把用户切换到受控状态
- **WHEN** 管理员对某个用户提交新的 `access_status`
- **THEN** 系统 MUST 持久化更新 `profiles.access_status`
- **AND** 页面 MUST 返回明确的成功反馈与更新后的状态

#### Scenario: 管理员解除限制
- **WHEN** 管理员把被限制用户重新切换为 `active`
- **THEN** 系统 MUST 持久化更新 `profiles.access_status = active`
- **AND** 后续该用户应按现有主链路规则恢复正常访问

### Requirement: 用户状态处置入口必须保持最小范围
系统 MUST 将该后台能力限制在单账号最小处置范围，不得在首版中隐式扩展为完整运营后台。

#### Scenario: 首版用户管理页加载
- **WHEN** 系统渲染首版用户管理能力
- **THEN** 页面 MAY 提供最小筛选与状态修改
- **AND** 不得把长期成本趋势、异常排行、学习画像或批量封禁视为本 requirement 的完成条件

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
