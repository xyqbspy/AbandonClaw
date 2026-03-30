## MODIFIED Requirements

### Requirement: 非微小改动应优先经过 OpenSpec
涉及功能行为、数据流、状态流、缓存策略、测试链路、维护规范或跨页面 UI 一致性的改动，维护流程 MUST 优先通过 OpenSpec 形成可审阅的 proposal/spec/tasks。

#### Scenario: 准备统一多个详情页的底部动作表现
- **WHEN** 维护者要统一多个页面之间的 footer、按钮、icon 或交互表达
- **THEN** 应先通过 OpenSpec 记录这次统一的目标、基准和影响范围
- **AND** 不应只把决策留在临时聊天记录中
