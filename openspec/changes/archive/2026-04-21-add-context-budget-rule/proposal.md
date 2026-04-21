## Why

当前项目已经有“只读最少上下文”和“先定位再精读”的规则，但没有把 token 成本、上下文预算和任务规模之间的关系沉淀成稳定维护契约。智能体在大需求里容易读太多旧材料，在小改动里又容易误套重流程，影响理解速度和开发准确性。

本次变更用于把“上下文预算”明确为维护规则，让 AI 和维护者能按任务类型递增读取范围，减少无关上下文污染，同时保留主链路风险出现时的补读入口。

## What Changes

- 在项目维护规范中新增上下文预算规则，明确 Fast Track、Cleanup、Spec-Driven 的阅读范围和补读条件。
- 在智能体入口规则中补充 token / 上下文控制提示，强调先定位、再精读、避免批量通读目录。
- 在维护手册与变更接入模板中加入上下文预算检查项，帮助接需求阶段先判断需要读什么、不读什么。
- 在完成态 Review 中加入“是否存在无关上下文膨胀或旧材料误导”的检查。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `project-maintenance`: 增加上下文预算、阅读范围分层和上下文污染防护要求。

## Impact

- 影响维护规则、智能体提示词和接需求模板。
- 不影响业务代码、API、数据库、缓存或用户界面。
- 不要求固定 token 数字；以任务类型、链路风险和文档层级控制阅读范围。

## Stability Closure

本轮收口项：
- 将分散的“最少上下文”要求沉淀为 stable spec。
- 明确 AGENTS、docs/README、project-maintenance spec、playbook、change-intake-template 之间的关系。
- 明确小改动不因上下文预算规则被迫升级为完整 Spec-Driven 流程。

明确不收项：
- 不清理历史 archive、dev-log 或旧 proposal。
- 不新增自动 token 统计工具。
- 不重写现有文档目录结构。

延后原因与风险去向：
- 历史材料清理属于独立信息架构任务，本轮只补规则入口。
- 自动化 token 工具会引入额外复杂度，后续若频繁出现上下文膨胀再单独评估。
