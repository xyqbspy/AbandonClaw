## Why

前几轮已经完成 archive 收尾、维护检查脚本、入口可读性第一轮优化，但还有两类核心缺口：`AGENTS.md` 仍承载过多细则，`docs/README.md` / `CHANGELOG.md` / playbook 的核心阅读体验仍需要单独整理。

本轮按 task 收尾这些剩余事项：把 `AGENTS.md` 瘦身为强约束入口，把详细执行细则迁回 `docs/dev`，并清理核心文档的短入口可读性。

## What Changes

- 精简 `AGENTS.md`：只保留中文输出、任务分流、修改前检查、OpenSpec 红线、测试/文档/提交红线等强约束。
- 重写 `docs/README.md` 为清晰 UTF-8 短入口：文档分层、最小阅读路径、常见 capability 到文档的映射。
- 继续整理 `docs/dev/project-maintenance-playbook.md`，让它承接从 `AGENTS.md` 迁出的执行细则。
- 清理 `CHANGELOG.md` 顶部可读性，保留正式用户可感知记录，不写过程性维护记录。
- 更新 `project-maintenance` stable spec，明确 `AGENTS.md` 只作为强约束入口，详细流程由 dev 文档承接。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-maintenance`: 增加核心维护入口瘦身要求，约束 `AGENTS.md` 与 dev 文档之间的职责边界。

## Impact

- 影响文档：
  - `AGENTS.md`
  - `docs/README.md`
  - `docs/dev/project-maintenance-playbook.md`
  - `docs/dev/dev-log.md`
  - `CHANGELOG.md`
  - `openspec/specs/project-maintenance/spec.md`
- 不影响业务代码、API、数据库、缓存或 UI。

## Stability Closure

本轮收口：
- `AGENTS.md` 从长规则文档收敛为强约束入口。
- 核心文档入口变成短路径，降低 Fast Track 和普通维护阅读成本。
- `CHANGELOG.md` 只保留正式用户可感知记录，避免混入维护过程说明。

明确不收：
- 不清理所有历史 archive 和旧 proposal。
- 不重写所有 feature-flow / domain-rules / system-design。
- 不新增文档格式化工具。

延后原因与风险记录：
- 全仓文档重写会扩大影响范围，容易引入新漂移。
- 剩余风险记录在本 change 的 `design.md`、`tasks.md` 和 `docs/dev/dev-log.md`。
