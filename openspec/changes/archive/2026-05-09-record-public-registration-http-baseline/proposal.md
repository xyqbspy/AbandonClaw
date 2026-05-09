## Why

公网开放注册的 P0-A / P0-B 代码已经落地，但“真实 HTTP baseline”仍停留在文档要求和零散脚本层，缺少一套可重复执行、可留证据、可判断通过与否的最小基线。继续放着不收，会让开放前检查仍依赖人工临场拼命令，导致清单、脚本和验收记录继续漂移。

现在做这轮，是因为 `invite_only_strict` 已经具备代码侧硬门槛，下一步最必要的不是继续堆 P1 后台，而是把公开前必须跑的真实 HTTP baseline 固定成一条可执行、可回看的维护链路。

## What Changes

- 收口公网开放注册的真实 HTTP baseline 范围，明确注册模式、邮箱未验证、Origin、user/IP 限流、daily quota、账号状态和后台状态接口的最小验证矩阵。
- 扩展现有 baseline 脚本和样例数据，使维护者可以用统一入口执行这些 HTTP 验证，而不是手工临时拼装请求。
- 为 baseline 结果增加最小记录格式，要求保留请求目标、环境前提、关键状态码、限流后端和异常说明，而不是只保留终端输出。
- 同步后端上线检查清单、公网开放计划和相关 stable spec，消除“文档要求一套、脚本覆盖一套、完成态记录又是一套”的漂移。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `api-operational-guardrails`: 真实 HTTP baseline 从泛化压测要求收口为可执行的公网开放验证矩阵和记录要求。
- `project-maintenance`: 公网开放相关变更的完成态收尾需要记录 baseline 证据、未覆盖项和环境阻塞原因。

## Impact

- 代码与脚本：
  - `scripts/load-api-baseline.ts`
  - `scripts/load-handler-baseline.ts`
  - `scripts/load-samples/*`
  - `package.json`
- 文档：
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/dev/public-registration-readiness-plan.md`
  - `docs/dev/dev-log.md`
- 规范：
  - `openspec/specs/api-operational-guardrails/spec.md`
  - `openspec/specs/project-maintenance/spec.md`

## Stability Closure

### 本轮收口

- 收口公网开放前“真实 HTTP baseline 需要跑什么”的验证矩阵。
- 收口“脚本能跑什么”和“清单要求什么”之间的文档漂移。
- 收口 baseline 结果只停留在终端输出、缺少可追溯记录的问题。

### 明确不收

- 不新增新的业务防护能力，不做 P1 运营后台、用户详情页、异常用户列表或封禁 UI。
- 不接真实生产 cookie、真实邀请码或真实环境凭据到仓库脚本中。
- 不把这轮扩展为压测平台、性能报表或自动化 CI 容量测试。

### 延后原因与风险去向

- P1/P2 的后台运营、复杂风控、成本趋势和 heartbeat 仍按 `docs/dev/public-registration-readiness-plan.md` 继续跟踪。
- 真实生产环境的最终 baseline 仍依赖外部环境与凭据；本轮只负责把执行入口、记录格式和阻塞说明固定下来，剩余环境风险继续记录到 `docs/dev/dev-log.md`。
