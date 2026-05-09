## ADDED Requirements

### Requirement: 高成本接口必须支持 user 与 IP 双维度限流
在公网小范围开放前，任何会触发 AI 生成、TTS、批量音频处理、重解析或其他高成本服务端处理的用户态接口 MUST 同时应用用户维度和 IP 维度限流。任一维度超限时，系统 MUST 在进入高成本处理前返回受控限流错误。

#### Scenario: 同一用户超过高成本接口限流阈值
- **WHEN** 同一已登录用户在限流窗口内超过高成本接口的用户维度阈值
- **THEN** 系统 MUST 返回 429 或等价受控限流错误
- **AND** 系统 MUST NOT 继续触发模型调用、TTS 生成或其他高成本处理

#### Scenario: 同一 IP 多账号超过高成本接口限流阈值
- **WHEN** 同一 IP 下多个已登录账号在限流窗口内超过高成本接口的 IP 维度阈值
- **THEN** 系统 MUST 返回 429 或等价受控限流错误
- **AND** 系统 MUST NOT 因为账号不同而绕过 IP 维度保护

#### Scenario: 正常用户在阈值内调用高成本接口
- **WHEN** 已验证邮箱用户在用户维度和 IP 维度阈值内调用高成本接口
- **THEN** 系统 MUST 允许请求进入后续业务处理
- **AND** 限流判断 MUST 不改变原有成功路径的业务语义

### Requirement: 高成本接口限流必须具备可确认的共享后端状态
在公网小范围开放前，系统 MUST 提供可确认的限流后端状态，使维护者能判断当前限流使用共享后端还是 memory-only fallback。公网开放检查 MUST 不接受无提示的 memory-only 状态。

#### Scenario: 管理员查看限流后端状态
- **WHEN** 管理员打开状态检查入口或运行上线检查
- **THEN** 系统 MUST 显示当前限流后端为 `upstash` 或 `memory`
- **AND** 系统 MUST 显示共享限流配置是否存在

#### Scenario: 公网 baseline 发现 memory-only 限流
- **WHEN** 维护者执行公网开放前 baseline
- **AND** 当前限流后端为 `memory`
- **THEN** baseline MUST 记录该状态为公网开放阻断项
- **AND** 维护者 MUST 配置共享限流后端或明确停止公网开放

#### Scenario: 共享限流后端异常时回退
- **WHEN** Upstash 或等价共享限流后端出现异常
- **THEN** 系统 MAY 为可用性回退到 memory 限流
- **AND** 系统 MUST 让维护者能通过状态入口识别该降级状态

### Requirement: 高成本接口公网 baseline 必须覆盖真实 HTTP 入口
公网小范围开放前，高成本接口治理验证 MUST 通过真实 HTTP 入口执行，而不能只依赖 in-process 单元测试。baseline MUST 覆盖认证、邮箱验证、Origin、用户限流、IP 限流和 requestId。

#### Scenario: 未验证邮箱用户调用高成本接口 baseline
- **WHEN** 维护者使用未验证邮箱账号通过真实 HTTP 调用高成本接口
- **THEN** 系统 MUST 在进入高成本处理前拒绝请求
- **AND** 响应 MUST 带有可追踪的 `requestId`

#### Scenario: 同用户限流 baseline
- **WHEN** 维护者使用同一用户通过真实 HTTP 在限流窗口内重复调用高成本接口
- **THEN** 系统 MUST 在超过阈值后返回 429 或等价受控限流错误
- **AND** 响应 MUST 带有可追踪的 `requestId`

#### Scenario: 同 IP 多账号限流 baseline
- **WHEN** 维护者使用同一 IP 下多个账号通过真实 HTTP 调用高成本接口
- **THEN** 系统 MUST 能在 IP 维度超过阈值后返回 429 或等价受控限流错误
- **AND** 验证记录 MUST 明确这是 IP 维度限流命中

#### Scenario: Origin 不匹配 baseline
- **WHEN** 维护者使用不匹配的 `Origin` 通过真实 HTTP 调用受保护写接口
- **THEN** 系统 MUST 拒绝请求
- **AND** 验证记录 MUST 明确这是来源校验命中，而不是业务处理失败
