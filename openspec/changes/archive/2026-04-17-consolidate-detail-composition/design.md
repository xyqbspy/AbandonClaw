## Context

当前 detail 体系已经分成两条：

- `lesson` 侧的 selection detail，更偏“阅读中的即时解释和加入复习”
- `chunks` 侧的 focus detail，更偏“资产详情、关系扩展和进一步操作”

它们共享的部分包括：

- audio trigger
- sentence/source card
- info block / loading block
- footer action bar 的主次操作结构

但它们也存在真实差异：

- `lesson` 详情偏即时上下文理解
- `chunks` 详情偏表达资产扩展和关系操作
- `chunks` 详情存在 segmented tabs、related rows、focus actions 等更复杂结构

## Goals / Non-Goals

**Goals:**

- 先定义共享基元和领域差异层的边界
- 为后续组件收敛提供稳定判断标准
- 降低未来 detail 组件继续各自分叉的风险

**Non-Goals:**

- 这次不直接合并 `lesson` 和 `chunks` 的所有 detail 组件
- 不在本 change 中推进大规模代码迁移
- 不改变当前已验证通过的交互行为

## Decisions

1. 共享基元优先承载“样式和交互表达稳定、领域语义较轻”的部分，例如 card、icon button、基础 action、loading/detail block。
2. 领域差异层继续保留“业务语义重、状态组合复杂”的部分，例如 focus detail tabs、similar/contrast rows、cluster actions。
3. 后续任何 detail 结构性改动，先判断是否属于共享基元，再决定放 `lesson` 侧、`chunks` 侧或共享层。
4. 这次 change 先沉淀规则和任务，不强行带出未经验证的重构。

## Risks / Trade-offs

- 如果共享基元抽得过深，会把 `lesson` 和 `chunks` 的真实业务差异压扁。
- 如果完全不约束复用边界，两边又会继续产生近似但不兼容的实现。
- 因此当前最合适的策略是“先定义边界，再按需收敛”，而不是一次性全量统一。
