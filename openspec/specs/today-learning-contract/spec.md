## Purpose

定义 `today` 页面展示数据、用户当前学习步骤与后端学习态之间的稳定映射契约，确保后续修改 dashboard 聚合、today 页面展示或 scene 学习步骤时，维护者能快速定位数据来源、优先级与回退规则。
## Requirements
### Requirement: Today 页面数据来源与优先级必须可追踪
系统 MUST 为 `today` 页面定义稳定的数据映射契约，明确继续学习入口、今日任务、表达摘要与回忆入口分别依赖哪些后端字段、哪些前端派生结果，以及它们之间的优先级和回退顺序。

#### Scenario: 继续学习入口按约定解析数据来源
- **WHEN** `today` 页面需要生成继续学习卡片
- **THEN** 系统必须先使用服务端 `LearningDashboardResponse` 中的学习聚合结果作为主来源
- **AND** 只有在主来源缺失或不可用时，才允许回退到本地 repeat 生成态或场景列表兜底

### Requirement: Today 页面必须记录后端学习态到展示态的映射
系统 MUST 提供一份可维护的说明文档，覆盖 `user_scene_progress`、`user_scene_sessions`、练习聚合、每日统计和 `LearningDashboardResponse` 字段如何映射到 `today` 页面中的步骤标签、帮助文案、任务状态、跳转入口和摘要信息。若 `today` 需要消费新的 `review` 正式训练信号，也 MUST 明确这些字段来自服务端聚合摘要，而不是前端直接解释 review 原始事件或页面临时状态。

#### Scenario: 维护者需要追踪 today 展示字段来源
- **WHEN** 维护者调整 `today` 页面展示逻辑、学习步骤语义、dashboard 聚合逻辑或 review 聚合解释
- **THEN** 必须能够通过文档直接查到相关后端字段、接口字段、selector 派生规则和页面展示项之间的关系
- **AND** 文档必须明确哪些逻辑属于服务端学习语义，哪些逻辑只属于前端展示派生
- **AND** 若涉及 `review` 递进式训练信号，页面只能消费服务端稳定摘要字段

### Requirement: Today 映射文档必须随学习语义变更同步
系统 MUST 把 today 数据映射文档视为需要维护的正式资产；凡是变更 `currentStep`、`masteryStage`、`completedSentenceCount`、repeat continue、today task 完成判定或相关回退规则时，必须同步更新文档与回归测试。

#### Scenario: 学习步骤或 dashboard 聚合语义发生变化
- **WHEN** 任一影响 `today` 页面展示语义的后端聚合字段、前端映射规则或回退策略发生变化
- **THEN** 对应 change 必须同步更新 today 映射文档
- **AND** 对应测试必须覆盖更新后的解释与展示结果

