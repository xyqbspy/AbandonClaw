## ADDED Requirements

### Requirement: 账号访问状态必须约束主应用、生成入口和写入口
系统 MUST 支持最小账号访问状态，用于在公开小范围开放期间快速阻止异常账号继续使用主应用、生成能力或写入能力。

#### Scenario: disabled 用户进入主应用
- **WHEN** `access_status = disabled` 的用户访问主应用页面
- **THEN** 系统 MUST 返回受控拒绝或重定向到受控提示页
- **AND** 不得继续加载学习主链路数据

#### Scenario: generation_limited 用户调用高成本接口
- **WHEN** `access_status = generation_limited` 的用户调用 AI、TTS 或 generate 类接口
- **THEN** 系统 MUST 在 quota 检查和上游调用前拒绝请求
- **AND** 不得预占 usage
- **AND** 不得调用模型、TTS 或生成处理

#### Scenario: readonly 用户调用写接口
- **WHEN** `access_status = readonly` 的用户写入学习进度、保存表达或提交 review
- **THEN** 系统 MUST 拒绝写入
- **AND** 响应 MUST 为受控错误

#### Scenario: active 用户正常使用
- **WHEN** `access_status = active` 的已验证用户访问主应用或调用受保护接口
- **THEN** 系统 MUST 按既有权限、quota、限流和业务规则继续处理
