## ADDED Requirements

### Requirement: 账号状态修改入口必须限制为 admin-only
系统 MUST 通过明确的管理员入口修改 `profiles.access_status`，不得把普通用户入口、公共 API 或手工 SQL 视为默认唯一运维路径。

#### Scenario: 管理员修改账号状态
- **WHEN** 管理员通过后台页面、server action 或受控 admin route 提交新的 `access_status`
- **THEN** 系统 MUST 先校验调用者为管理员
- **AND** 只允许写入 `active`、`disabled`、`generation_limited` 或 `readonly`

#### Scenario: 非管理员尝试修改账号状态
- **WHEN** 非管理员用户调用账号状态修改入口
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得执行 `profiles.access_status` 更新

#### Scenario: 非法状态值写入
- **WHEN** 调用方提交不在允许集合内的状态值
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得写入数据库
