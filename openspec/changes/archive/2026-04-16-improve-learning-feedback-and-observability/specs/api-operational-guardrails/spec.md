## ADDED Requirements

### Requirement: 关键学习动作必须具备最小业务级可观测性
系统 MUST 为关键学习动作提供最小业务级事件或失败摘要记录，至少覆盖 `today` 首要任务点击、continue learning 启动、review submit、lesson complete、practice generate fail 和 tts fail，以便维护者能从业务层判断用户在哪一步掉线或失败。

#### Scenario: 维护者排查学习闭环中断点
- **WHEN** 维护者需要排查用户在学习闭环中的中断点
- **THEN** 系统 MUST 能提供关键业务动作或失败摘要
- **AND** 这些记录 MUST 能与现有请求级日志关联

### Requirement: 业务事件记录必须保持最小范围
系统 MUST 控制业务级可观测性的范围，只记录排查学习闭环所需的最小字段，而不是在本阶段引入重型埋点平台或大范围事件泛滥。

#### Scenario: 新增学习动作记录
- **WHEN** 维护者为某个学习动作新增业务记录
- **THEN** 记录 MUST 只包含最小必要字段
- **AND** 不得在本阶段要求完整 BI 平台或全站埋点 SDK 改造
