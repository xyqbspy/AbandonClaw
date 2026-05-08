## Purpose
定义 `review` 递进式练习中的正式后端信号边界，明确哪些阶段结果会成为稳定学习信号，以及这些信号如何与最终反馈并存并参与后续调度。该 capability 在学习闭环中承接 `review` 正式信号、聚合摘要与迁移边界，而不重复定义页面阶段流程。
## Requirements
### Requirement: Review 递进式练习必须定义正式后端信号边界
系统 MUST 为 `review` 递进式练习定义正式后端信号边界，明确哪些阶段结果会成为稳定学习信号，哪些仍只是前端临时训练态。

#### Scenario: 维护者评估某个 review 阶段是否落库
- **WHEN** 维护者计划把熟悉度、输出信心、变体改写或完整输出中的某个结果接入服务端
- **THEN** 必须先明确该结果属于正式学习信号还是仅用于前端训练
- **AND** 不得在未定义正式边界的情况下直接把前端阶段状态写成长期学习字段

### Requirement: Review 正式信号必须与最终反馈并存
系统 MUST 允许 `review` 递进式练习的新正式信号与现有最终反馈结果并存，而不是在没有迁移策略时直接替换 `again / hard / good`。这些正式信号 MUST 不只停留在记录或摘要层，还必须能按约定参与调度排序与节奏细调。

#### Scenario: 系统记录一次包含递进式阶段的 review
- **WHEN** 用户完成一次包含识别、输出信心或完整输出的复习流程
- **THEN** 系统必须能同时保留本次最终反馈结果
- **AND** 新的正式阶段信号必须作为补充维度存在
- **AND** 调度层不得因为接入新信号而丢失现有最终反馈兼容性
- **AND** 这些正式信号必须能够影响后续排序或节奏，而不是只写入日志后长期不被调度使用

### Requirement: Review 正式信号必须可被聚合为稳定摘要
系统 MUST 提供可聚合的 `review` 正式信号摘要，以便 `today`、dashboard 或其他入口消费，而不需要页面直接解释原始事件流。

#### Scenario: today 或 dashboard 需要展示 review 训练深度
- **WHEN** 聚合页面需要解释用户当前 review 是否停留在识别级别，或已进入完整输出级别
- **THEN** 系统必须通过服务端稳定摘要字段提供这些结果
- **AND** 页面不得直接依赖 review 原始事件自行推断正式学习语义

### Requirement: Review 正式信号必须支持渐进迁移
系统 MUST 允许 review 正式信号按新增记录逐步生效，而不是要求一次性把所有历史复习数据回填到新字段。

#### Scenario: 系统上线新的 review 正式信号
- **WHEN** 新字段、新事件或新聚合能力首次上线
- **THEN** 历史记录可以保持空值或保守解释
- **AND** 新信号必须对上线后的新复习记录稳定生效
- **AND** 系统不得因为历史记录缺失而伪造不可靠的回填结果

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

### Requirement: Review 场景回补必须复用真实 practice set 锚点

系统 MUST 在 Review 场景回补任务中携带产生该回补任务的真实 `practiceSetId`，并在提交回补答案时复用该 ID 调用 scene practice run / attempt / complete 链路。系统不得为 Review 场景回补构造不存在于服务端的临时 `practiceSetId`。

#### Scenario: Review 页提交场景回补

- **WHEN** 用户在 Review 页提交一个 scene practice 回补答案
- **THEN** 前端 MUST 使用 due item 返回的真实 `practiceSetId`
- **AND** 服务端 MUST 继续用 scene practice set 归属校验保护 run / attempt 写入

#### Scenario: 回补任务缺少 practice set 锚点

- **WHEN** Review 场景回补任务缺少可用 `practiceSetId`
- **THEN** 前端 MUST 阻断提交并给出受控失败
- **AND** 系统 MUST NOT 构造 `review-inline:*` 这类临时 ID 继续写入 scene practice run
