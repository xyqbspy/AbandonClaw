## ADDED Requirements

### Requirement: 学习时长 delta 必须具备最小防污染规则
系统 MUST 对前端上报的 `studySecondsDelta` 执行最小可信边界，避免一眼假的学习时长污染个人进度数据。

#### Scenario: 单次 delta 超过上限
- **WHEN** 用户上报的单次 `studySecondsDelta` 超过 60 秒
- **THEN** 系统 MUST 不把该 delta 计入学习时长统计
- **AND** 系统 MUST 记录异常上报事件或等价日志

#### Scenario: 同一用户同一场景上报过于频繁
- **WHEN** 同一 `user + scene` 距离上一次被接受的学习时长写入不足 10 秒
- **THEN** 系统 MUST 不把该 delta 计入学习时长统计
- **AND** 系统 MUST 记录或保留可排查的拒绝原因

#### Scenario: 正常学习 delta
- **WHEN** 用户上报的 `studySecondsDelta` 为非负整数、未超过 60 秒，且满足同一 `user + scene` 最小上报间隔
- **THEN** 系统 MUST 按既有学习统计规则写入个人学习时长
- **AND** Progress 页面 MUST 继续基于个人学习统计展示学习概览
