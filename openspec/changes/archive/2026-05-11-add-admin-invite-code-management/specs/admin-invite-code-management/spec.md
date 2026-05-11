## ADDED Requirements

### Requirement: 管理员必须能够生成注册邀请码
系统 MUST 在 admin-only 后台提供最小注册邀请码生成能力，允许管理员手动创建单个邀请码或自动生成一批邀请码。

#### Scenario: 管理员手动创建邀请码
- **WHEN** 管理员提交明文邀请码、最大使用次数和过期时间
- **THEN** 系统 MUST 只持久化该邀请码的 hash 与元数据
- **AND** 系统 MUST 在创建成功后仅本次展示明文邀请码

#### Scenario: 管理员自动批量生成邀请码
- **WHEN** 管理员提交生成数量、最大使用次数和过期时间
- **THEN** 系统 MUST 生成对应数量的随机明文邀请码
- **AND** 系统 MUST 只持久化每个邀请码的 hash 与元数据
- **AND** 系统 MUST 在创建成功后仅本次展示生成的明文邀请码列表

### Requirement: 管理员必须能够查看邀请码最小状态
系统 MUST 提供邀请码列表，让管理员查看发放和排查所需的最小状态信息。

#### Scenario: 管理员查看邀请码列表
- **WHEN** 管理员打开邀请码管理页面
- **THEN** 系统 MUST 展示邀请码记录的创建时间、过期时间、启停状态、最大使用次数和已用次数
- **AND** 系统 MUST 不展示历史明文邀请码

### Requirement: 管理员必须能够查看邀请码使用明细
系统 MUST 让管理员看到邀请码是否已被使用、被哪个注册邮箱或账号使用，以及最近的受控失败原因。

#### Scenario: 管理员查看邀请码使用记录
- **WHEN** 管理员查看某个邀请码的使用明细
- **THEN** 系统 MUST 展示该邀请码关联的注册尝试 email、status、failure_reason、auth_user_id 和 created_at
- **AND** 系统 MUST 不展示历史明文邀请码

#### Scenario: 管理员查看已使用邀请码的账号摘要
- **WHEN** 某条邀请码使用记录包含 `auth_user_id`
- **THEN** 系统 MUST 展示该账号的最小 profile 状态与活动摘要
- **AND** 活动摘要 MUST 限制在邮箱验证状态、用户名、访问状态、学习统计或高成本用量的最小字段内

### Requirement: 管理员必须能够停用和调整邀请码
系统 MUST 允许管理员通过受控入口停用邀请码，并调整最大使用次数或过期时间。

#### Scenario: 管理员停用邀请码
- **WHEN** 管理员对某个邀请码提交停用操作
- **THEN** 系统 MUST 持久化 `is_active = false`
- **AND** 后续注册 MUST 不再接受该邀请码

#### Scenario: 管理员调整邀请码元数据
- **WHEN** 管理员调整某个邀请码的最大使用次数或过期时间
- **THEN** 系统 MUST 持久化新的元数据
- **AND** 后续注册 MUST 按更新后的元数据判断邀请码是否可用

### Requirement: 邀请码管理入口必须限制为 admin-only
系统 MUST 将邀请码生成、查看、停用和调整能力限制为管理员能力。

#### Scenario: 非管理员访问邀请码管理页
- **WHEN** 非管理员用户访问邀请码管理页面
- **THEN** 系统 MUST 拒绝访问
- **AND** 不得暴露邀请码记录

#### Scenario: 非管理员调用邀请码写操作
- **WHEN** 非管理员用户调用邀请码生成、停用或调整入口
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得写入 `registration_invite_codes`
