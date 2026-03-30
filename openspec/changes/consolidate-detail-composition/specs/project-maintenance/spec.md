## MODIFIED Requirements

### Requirement: 非微小改动应优先经过 OpenSpec
涉及功能行为、数据流、状态流、缓存策略、测试链路、维护规范、跨页面 UI 一致性或详情组件结构性复用边界的改动，维护流程 MUST 优先通过 OpenSpec 形成可审阅的 proposal/spec/tasks。

#### Scenario: 准备收敛 detail 组件结构
- **WHEN** 维护者要统一或拆分 lesson detail 与 chunks detail 的组件边界
- **THEN** 应先通过 OpenSpec 记录共享基元、领域差异和实施范围
- **AND** 不应先做代码迁移再补规范
