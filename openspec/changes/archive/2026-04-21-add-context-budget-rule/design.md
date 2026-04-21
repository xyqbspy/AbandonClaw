## Context

项目文档已经形成多层结构：`AGENTS.md` 负责智能体入口规则，`docs/README.md` 负责文档定位，`docs/dev/project-maintenance-playbook.md` 负责维护执行，`openspec/specs/project-maintenance/spec.md` 负责长期稳定契约。

现有规则能防止“完全不读文档就改代码”，但对 token 成本和上下文污染缺少明确边界。对智能体来说，读得太少会误改主链路，读得太多会把旧 archive、历史 dev-log 或无关模块误当成当前约束。

## Goals / Non-Goals

**Goals:**

- 按任务类型定义上下文预算：Fast Track 最小读，Cleanup 读删除影响范围，Spec-Driven 按链路递增读。
- 明确文档层级关系，避免同一规则在多个入口互相抢解释权。
- 把上下文预算纳入需求接入和完成态 Review。

**Non-Goals:**

- 不引入固定 token 数字或自动统计工具。
- 不清理历史归档内容。
- 不改变业务功能、测试策略或 OpenSpec 基础流程。

## Decisions

### Decision 1: 使用“上下文预算”而不是固定 token 上限

固定 token 数字容易过期，也不适合不同模型和任务规模。规则采用按任务类型控制阅读范围：小改动只读局部，大改动按文档层级递进，遇到主链路风险再补读。

替代方案：为每类任务写固定 token 上限。放弃原因是不可维护，且容易让智能体为了达标而少读关键上下文。

### Decision 2: 规则层级保持单向引用

`AGENTS.md` 写执行入口和强约束，`docs/README.md` 写文档定位顺序，`project-maintenance` stable spec 写长期契约，`project-maintenance-playbook` 写执行清单，`change-intake-template` 写接需求时的提示骨架。

替代方案：把所有细则都塞进 AGENTS。放弃原因是会让入口文件变重，反而增加每轮默认上下文成本。

### Decision 3: 完成态 Review 检查上下文污染

Spec-Driven 完成态 Review 不只检查代码和文档，也要检查本轮是否引入无关上下文依据，例如把旧 archive 当成当前稳定规则，或把无关模块规则扩散到当前需求。

替代方案：只在接需求阶段控制。放弃原因是复杂任务中间经常会新增上下文，收尾时仍需要复核。

## Risks / Trade-offs

- 规则太保守导致少读关键文档 → 用“主链路、状态流、数据流、稳定规则出现时必须补读”兜底。
- 规则太复杂导致智能体执行成本上升 → 只在 stable spec 写完整要求，在 AGENTS 中保留短规则。
- 历史 archive 仍可能被误读 → 本轮先明确 archive 只能作为历史参考，不能替代 stable spec；后续如仍频繁发生再做文档结构清理。

## Stability Closure

本轮收口项：
- 将上下文预算写入 stable spec。
- 将 AGENTS、docs README、playbook、change-intake-template 的关系写清。
- 将完成态 Review 加入上下文污染检查。

明确不收项：
- 不做历史文档清理。
- 不新增工具化 token 统计。
- 不改变 OpenSpec CLI 或技能实现。
