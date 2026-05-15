## ADDED Requirements

### Requirement: P0 smoke 必须验证主闭环入口稳定但不得重定义业务语义
系统 MUST 允许维护者通过测试账号验证 Today -> Scene -> Chunks -> Review -> Today 推荐推进的 P0 主闭环；该验证不得改变 Today 推荐策略、Scene 学习主流程、Chunks 保存链路或 Review 调度算法。

#### Scenario: 新用户状态从 Today 推荐 daily-greeting
- **WHEN** 普通测试账号已被 reset 为新用户状态并登录
- **THEN** Today MUST 使用既有推荐策略推荐 `daily-greeting` 作为第一个 starter recommendation
- **AND** smoke MUST 只验证该既有结果，不得通过测试专用逻辑覆写推荐

#### Scenario: 保存 scene chunk 后进入 Chunks 与 Review
- **WHEN** 普通测试账号在 `daily-greeting` 中通过正式业务 API 保存一个 builtin chunk
- **THEN** 该表达 MUST 能通过既有 Chunks 查询入口出现在用户态 Chunks
- **AND** 该表达 MUST 能按既有 Review 调度语义进入 due

#### Scenario: Review submit 后状态推进
- **WHEN** 普通测试账号通过正式 Review submit API 提交 due 表达
- **THEN** 系统 MUST 写入 review 日志
- **AND** 系统 MUST 按既有 Review 调度语义推进 user phrase 状态

#### Scenario: 完成 daily-greeting 后 Today 推荐推进
- **WHEN** 普通测试账号按既有 Scene 完成语义完成 `daily-greeting`
- **THEN** Today MUST 使用既有推荐策略推进到 `self-introduction`
- **AND** smoke MUST 不新增测试专用完成语义

### Requirement: P0 smoke 失败必须明确定位失败阶段
系统 MUST 在 P0 smoke 失败时输出失败阶段、目标 API 或页面、状态码和可用 requestId，避免维护者只能看到笼统 `failed fetch`。

#### Scenario: smoke 中任一步 API 失败
- **WHEN** P0 smoke 中任一步正式业务 API 返回失败或发生 network error
- **THEN** smoke MUST 输出失败阶段名称
- **AND** smoke MUST 输出请求目标、状态码或 network error 摘要
- **AND** 如果响应包含 `requestId`，smoke MUST 输出该 `requestId`
