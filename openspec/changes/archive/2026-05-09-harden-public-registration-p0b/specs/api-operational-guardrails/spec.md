## ADDED Requirements

### Requirement: 高成本接口必须具备每日 quota 与调用前预占
公网小范围开放前，所有会触发模型、TTS、练习生成或重解析成本的接口 MUST 在调用上游前执行每日 quota 检查和 usage 预占。预占成功后才允许进入上游调用。

#### Scenario: 用户未超过每日额度
- **WHEN** 已验证且未受限制的用户调用高成本接口，并且当天该 capability 未超过 quota
- **THEN** 系统 MUST 在调用上游前记录一次 `reserved`
- **AND** 系统 MUST 继续执行模型、TTS 或生成处理

#### Scenario: 用户超过每日额度
- **WHEN** 用户当天某个 capability 的预占次数已经达到 quota
- **THEN** 系统 MUST 返回受控超额错误
- **AND** 系统 MUST 不再调用模型、TTS 或生成处理
- **AND** 响应 MUST 带有 `requestId`

#### Scenario: 上游调用成功
- **WHEN** 高成本接口在预占后成功完成上游调用或生成处理
- **THEN** 系统 MUST 将该 usage 标记为 `success`
- **AND** 今日 usage 摘要 MUST 能统计到该成功次数

#### Scenario: 上游调用失败
- **WHEN** 高成本接口在预占后发生上游失败、超时或受控 fallback
- **THEN** 系统 MUST 将该 usage 标记为 `failed`
- **AND** 默认不得退回已预占额度

### Requirement: 管理员状态必须暴露今日高成本 usage 摘要
系统 MUST 在管理员状态入口暴露当天高成本 usage 摘要，帮助维护者判断公开小范围测试期间是否出现成本异常。

#### Scenario: 管理员查看今日 usage
- **WHEN** 管理员访问 `/api/admin/status`
- **THEN** 响应 MUST 包含今日各 capability 的 `reserved`、`success`、`failed` 和 quota 摘要
- **AND** 响应 MUST 继续包含限流后端状态
