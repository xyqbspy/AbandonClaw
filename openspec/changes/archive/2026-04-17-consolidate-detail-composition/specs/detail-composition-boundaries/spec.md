## ADDED Requirements

### Requirement: 详情共享基元必须只承载稳定且轻语义的职责
跨 `lesson detail` 与 `chunks detail` 复用的共享基元 MUST 只承载样式稳定、交互表达稳定、领域语义较轻的职责。

#### Scenario: 维护者判断一个 detail 片段是否应该抽共享
- **WHEN** 维护者发现两个详情体系里存在相似实现
- **THEN** 应先判断这部分是否属于 card、icon button、基础 action、loading/detail block 等轻语义结构
- **AND** 只有满足该条件时才优先抽到共享基元

### Requirement: 详情领域层必须保留高业务语义的独立实现
`lesson detail` 与 `chunks detail` 中承载高业务语义、复杂状态组合或强领域差异的部分 MUST 保留独立实现。

#### Scenario: 维护者调整 focus detail 的复杂交互
- **WHEN** 改动涉及 segmented tabs、related rows、cluster actions 或类似复杂结构
- **THEN** 应优先保留在领域层实现
- **AND** 不应为了形式统一强行塞入共享基元

### Requirement: 结构性 detail 改动必须先定义复用边界
涉及详情组件结构性收敛、拆分或跨模块复用的改动 MUST 先定义复用边界，再进入实现阶段。

#### Scenario: 准备重构 detail 组件结构
- **WHEN** 维护者要推进 lesson 与 chunks 详情组件的结构性统一
- **THEN** 应先通过 OpenSpec 说明共享职责、独立职责和预期影响范围
- **AND** 再决定具体实现任务
