## ADDED Requirements

### Requirement: Review 正式信号必须覆盖变体改写完成状态
系统 MUST 将普通表达 review 的变体改写完成状态纳入正式事件信号，并与现有 `recognition_state`、`output_confidence`、`full_output_status`、`review_result` 并存。该信号 MUST 记录在单次 review 事件层，而不是直接写成表达资产的长期掌握状态。

#### Scenario: 系统记录完成变体改写的 review
- **WHEN** 用户提交一次包含已完成变体改写的普通表达 review
- **THEN** 后端 MUST 在本次 review 日志中记录 `variant_rewrite_status = completed`
- **AND** 后端 MUST 记录本次使用的固定改写方向 id
- **AND** 系统 MUST 同时保留最终 `again / hard / good` 反馈

#### Scenario: 系统记录未完成变体改写的 review
- **WHEN** 用户提交一次未完成变体改写的普通表达 review
- **THEN** 后端 MUST 在本次 review 日志中记录 `variant_rewrite_status = not_started` 或保持历史兼容空值
- **AND** 后端不得伪造固定改写方向 id

### Requirement: Review 正式信号必须覆盖完整输出目标表达覆盖结果
系统 MUST 为普通表达 review 的完整输出记录确定性的目标表达覆盖结果。该结果 MUST 只表示用户完整输出是否覆盖目标表达，不得被解释为语法正确率、自然度评分或 AI 评价。

#### Scenario: 完整输出覆盖目标表达
- **WHEN** 用户提交完整输出且确定性覆盖目标表达
- **THEN** 后端 MUST 记录 `full_output_coverage = contains_target`
- **AND** 该记录 MUST 可以被聚合摘要和调度规则消费

#### Scenario: 完整输出未覆盖目标表达
- **WHEN** 用户提交完整输出但未确定性覆盖目标表达
- **THEN** 后端 MUST 记录 `full_output_coverage = missing_target`
- **AND** 该记录 MUST 保留为训练信号，而不是直接覆盖最终 feedback

#### Scenario: 完整输出未开始或无法稳定判断
- **WHEN** 用户未填写完整输出或目标表达无法稳定判断
- **THEN** 后端 MUST 记录 `full_output_coverage = not_started` 或采用保守空值
- **AND** 系统不得把无法判断的结果伪造成已覆盖

### Requirement: Review 新增正式信号必须聚合为稳定摘要
系统 MUST 将变体改写完成状态与完整输出目标表达覆盖结果聚合为稳定 review 摘要字段，以便 review、today 或 dashboard 消费，而不是要求页面直接解释原始 review 日志。

#### Scenario: 聚合页面展示今日 review 训练深度
- **WHEN** 页面需要展示今日 review 中有多少条进入迁移改写或目标表达完整输出
- **THEN** 系统 MUST 通过服务端 summary 返回稳定计数字段
- **AND** 页面不得直接查询或解释 `phrase_review_logs` 原始事件

#### Scenario: 系统处理历史 review 日志
- **WHEN** 历史 review 日志缺少新增正式信号字段
- **THEN** 聚合层 MUST 对空值采用保守解释
- **AND** 系统不得对历史记录做不可靠回填
