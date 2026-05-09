## Context

当前仓库已经有两类 baseline 工具：

- `scripts/load-handler-baseline.ts`
  - 用于进程内 handler 级基线，适合本地逻辑和限流 helper 验证
- `scripts/load-api-baseline.ts`
  - 用于对单个真实 HTTP 入口发请求，适合本地 dev server 或目标环境

但对公网开放注册这条链路来说，现状仍有三个明显缺口：

1. 文档要求的是一组场景矩阵，不是单个 endpoint 压测；现有脚本只覆盖单目标请求。
2. 结果记录口径不稳定，维护者容易只留终端输出，后续无法追溯“当时用的是什么环境、什么 cookie、打到了哪类 429/403/500、限流后端是什么”。
3. 清单、计划和稳定规范都要求真实 HTTP baseline，但当前没有统一入口把这些要求串成一轮可执行流程。

这轮不会改变用户业务语义，而是把“公开前必须验证的 HTTP baseline”固定成维护链路的一部分，减少开放前的人工拼接和口径漂移。

## Goals / Non-Goals

**Goals:**

- 提供一条面向公网开放注册的场景化真实 HTTP baseline 入口，而不是让维护者手工逐条拼 curl。
- 明确 baseline 必跑场景：注册模式、邀请码、邮箱未验证、Origin 拒绝、user/IP 限流、daily quota、账号状态和 `/api/admin/status`。
- 让 baseline 输出能直接沉淀为完成态证据，至少保留环境前提、请求目标、关键状态码、后端状态和阻塞项。
- 同步清单与 stable spec，保证“脚本覆盖范围”和“维护要求”一致。

**Non-Goals:**

- 不自动化登录、邀请码生成、测试账号初始化或数据库清理。
- 不把这轮扩展成性能平台、CI 压测、生产容量测试或持续监控。
- 不新增业务防护能力，不实现 P1 运营后台或更复杂风控。

## Decisions

### 1. 使用专门的“场景 runner”，而不是继续手工串单接口命令

决策：

- 新增一个公网开放 baseline runner，负责串行执行一组具名场景。
- 继续复用 `load-api-baseline.ts` 中的真实 HTTP 请求逻辑或抽出的共享 helper，而不是把所有逻辑都塞进现有单接口脚本。

原因：

- 现有 `load-api-baseline.ts` 适合单 endpoint 压测，不适合表达“无邀请码注册应失败”“受限账号 generate 应失败”“同 IP 多账号达到阈值应返回 429”这种多场景矩阵。
- 场景 runner 更适合把环境前提、跳过原因和结果记录一起固化。

替代方案：

- 继续只用 README / checklist 教维护者手工拼命令。放弃：重复劳动高，且结果不可追踪。
- 直接把 `load-api-baseline.ts` 改成一个超大多模式脚本。放弃：会把通用单接口工具和场景化基线职责混在一起。

### 2. baseline 矩阵按“匿名注册 / 已登录保护 / 受限用户 / 运行状态”分组

决策：

- 场景矩阵最小分为四组：
  - 匿名注册场景
  - 已登录正常用户场景
  - 受限或未验证用户场景
  - 运行状态与后端状态场景

每组下只保留当前公开前必需的案例：

- `closed` 注册失败
- `invite_only` 无邀请码失败
- `invite_only` 有邀请码成功
- 未验证邮箱访问主应用或受保护 API 被拒绝
- 写接口 `Origin` 不匹配被拒绝
- 高成本接口正常调用
- user 限流命中 429
- IP 限流命中 429
- daily quota 命中 429
- `generation_limited` 命中受控拒绝
- `/api/admin/status` 返回限流后端与 usage 摘要

原因：

- 这是当前计划里“公开前必要”和“已有代码防护”之间的交集，足以判断是否真的进入 `invite_only_strict`。

### 3. baseline 结果必须支持文件输出，并要求在 dev-log 留存摘要

决策：

- runner 支持将结果写入 JSON 文件。
- 完成态记录仍落在 `docs/dev/dev-log.md`，但不要求把所有原始响应贴进文档；文档只保留命令、环境前提、关键结果和阻塞项，原始 JSON 作为辅助证据。

原因：

- 直接把大量原始结果塞进 dev-log 可读性差。
- 只保留终端输出又缺少复盘证据。

替代方案：

- 仅 stdout 输出。放弃：无法稳定归档。
- 新建长期保存的 baseline 结果目录。暂不采用：容易引入大量一次性文件和提交噪音。

### 4. 环境凭据只通过 CLI / env 注入，脚本本身不接管登录和建号

决策：

- runner 只消费外部提供的 `baseUrl`、`origin`、cookie、邀请码、测试账号标识等环境参数。
- 若缺少执行某个场景的必要参数，runner 必须把该场景标记为 blocked/skipped，并要求维护者记录原因。

原因：

- 仓库不应内置真实凭据或邀请码。
- 自动化登录和账号准备会把这轮范围膨胀成环境编排。

## Risks / Trade-offs

- [真实环境前提仍然繁琐] → 通过统一参数命名、样例命令和 blocked 结果格式降低认知成本，但不隐藏外部前提。
- [baseline 脚本过于严格导致本地难以全跑] → 允许场景级 blocked/skipped，并要求显式记录原因，而不是静默跳过。
- [单次结果受临时网络波动影响] → 输出保留状态分布、延迟和失败摘要，避免用一次 500 直接替代完整判断。
- [脚本和 checklist 再次漂移] → 同轮更新 stable spec、清单和计划，把矩阵写成统一口径。

## Migration Plan

1. 新增 baseline runner 和样例配置。
2. 复用或抽取 `load-api-baseline.ts` 的请求/统计能力。
3. 为关键场景补最小脚本级测试或 dry-run 验证。
4. 同步 `backend-release-readiness-checklist`、公网开放计划和 stable spec。
5. 在 `dev-log` 记录新的执行方式与未覆盖环境阻塞。

回滚策略：

- 若新 runner 不稳定，可暂时回退到现有单接口脚本 + 文档命令，但不得删除新的验证矩阵要求。
- 若场景分组过细导致使用成本过高，可收敛为更少的必跑场景，但仍需保留 blocked/record 机制。

## Open Questions

- baseline 原始 JSON 是否只保留本地文件，还是需要约定一个临时归档目录；本轮倾向先只定义 `--output`，不增加仓库常驻结果目录。
- `tts` 场景是否需要单独 runner 逻辑处理较长响应时间，还是先复用通用 POST 场景；实现时再结合现有接口表现决定。

## Stability Closure

### 本轮收口

- 收口脚本入口、验证矩阵和结果记录的三处漂移。
- 收口“公开前必须跑 baseline，但没有统一执行入口”的维护断层。

### 明确不收

- 不接真实环境自动登录、自动造数据或自动清理数据。
- 不处理生产容量评估、CI 定时基线或长期观测。

### 风险去向

- 环境凭据和真实开放前执行阻塞继续记到 `docs/dev/dev-log.md`。
- 更长期的压测、观测和成本趋势仍留在 `docs/dev/public-registration-readiness-plan.md` 的 P1/P2。
