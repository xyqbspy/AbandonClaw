## MODIFIED Requirements

### Requirement: Today 页面必须记录后端学习态到展示态的映射
系统 MUST 提供一份可维护的说明文档，覆盖 `user_scene_progress`、`user_scene_sessions`、练习聚合、每日统计和 `LearningDashboardResponse` 字段如何映射到 `today` 页面中的步骤标签、帮助文案、任务状态、跳转入口和摘要信息。若 `today` 需要消费新的 `review` 正式训练信号，也 MUST 明确这些字段来自服务端聚合摘要，而不是前端直接解释 review 原始事件或页面临时状态。

#### Scenario: 维护者需要追踪 today 展示字段来源
- **WHEN** 维护者调整 `today` 页面展示逻辑、学习步骤语义、dashboard 聚合逻辑或 review 聚合解释
- **THEN** 必须能够通过文档直接查到相关后端字段、接口字段、selector 派生规则和页面展示项之间的关系
- **AND** 文档必须明确哪些逻辑属于服务端学习语义，哪些逻辑只属于前端展示派生
- **AND** 若涉及 `review` 递进式训练信号，页面只能消费服务端稳定摘要字段
