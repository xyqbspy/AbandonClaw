# 规范文档：project-maintenance

## MODIFIED Requirements

### Requirement: 认证与高成本接口改动必须先审计边界与失败保护
当服务端治理进入上线准备阶段时，维护流程 MUST 在实现完成后补一轮部署前检查，覆盖数据库权限策略、真实 HTTP 基线、共享限流环境变量、允许的 Origin、后台白名单入口和剩余风险接受项，而不能只停留在代码实现与 in-process baseline。

#### Scenario: 完成服务端治理改动后准备上线
- **WHEN** 维护者完成本轮数据库边界、限流或一致性保护改动并准备上线
- **THEN** 必须执行并记录部署前检查清单
- **AND** 必须明确写出仍保留的白名单入口与剩余风险

#### Scenario: 完成真实 HTTP 基线验证
- **WHEN** 维护者在本地或 preview 环境下完成真实 HTTP baseline
- **THEN** 必须把结果与异常说明记录到开发日志或相应审计文档
- **AND** 不得只保留临时终端输出而不留可追踪记录

#### Scenario: 真实 HTTP 基线出现限流或单次异常
- **WHEN** 真实 HTTP baseline 出现 `429`、`500` 或其他非 `200` 状态
- **THEN** 维护者 MUST 一并记录状态分布、异常上下文和初步判断
- **AND** 不得只记录成功请求的延迟数据
