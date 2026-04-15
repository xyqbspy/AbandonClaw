# 规范文档：api-operational-guardrails

## MODIFIED Requirements

### Requirement: 高成本接口必须具备统一限流基线
高成本接口的共享限流能力在进入上线准备阶段时，系统 MUST 通过真实 HTTP 入口验证限流、认证、Origin 与错误收口行为，而不能只依赖 in-process baseline 结果。

#### Scenario: 维护者准备确认高成本接口可上线
- **WHEN** 维护者完成高成本接口的服务端治理改动并准备进入上线前检查
- **THEN** 系统 MUST 通过真实 HTTP 入口执行最小基线压测
- **AND** 验证结果 MUST 记录至少一组延迟与状态分布结果

### Requirement: 限流与追踪能力必须可独立接入接口入口
进入上线准备阶段时，系统 MUST 提供一份可执行的运维检查清单，覆盖共享限流环境变量、允许的 Origin、白名单后台入口和最小验证命令，以确保已接入的治理能力在部署环境下可被确认。

#### Scenario: 维护者准备部署已接入治理能力的接口
- **WHEN** 维护者准备将已接入 requestId、限流、Origin 校验和统一参数校验的接口部署到目标环境
- **THEN** 系统 MUST 提供统一的上线前检查清单
- **AND** 清单 MUST 明确 Redis 配置、Origin 配置、白名单入口和验证命令

#### Scenario: 真实 HTTP baseline 使用了不匹配的来源域
- **WHEN** 维护者在真实 HTTP baseline 中传入的 `Origin` 与目标环境实际允许域不一致
- **THEN** 受保护写接口 MUST 拒绝请求
- **AND** 维护者 MUST 在记录中明确这是来源校验命中，而不是业务处理失败
