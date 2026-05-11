## ADDED Requirements

### Requirement: Admin 生成的邀请码必须沿用注册入口 hash 校验
系统 MUST 让 admin-only 后台生成的邀请码与现有 `invite_only` 注册入口使用同一套 normalize 与 hash 匹配规则。

#### Scenario: 用户使用管理员生成的邀请码注册
- **WHEN** 用户在 `invite_only` 模式下提交管理员生成的明文邀请码
- **THEN** 注册入口 MUST 按现有 hash 规则匹配 `registration_invite_codes.code_hash`
- **AND** 注册成功后 MUST 继续记录 `registration_invite_attempts` 并扣减 `used_count`

#### Scenario: 数据库保存管理员生成的邀请码
- **WHEN** 管理员生成邀请码
- **THEN** 数据库 MUST 只保存邀请码 hash
- **AND** 不得持久化明文邀请码
