## MODIFIED Requirements

### Requirement: Scene 主学习视图必须暴露当前下一步
系统 MUST 在 Scene 主学习视图中提供用户可见的当前下一步入口，使用户不依赖浮动进度入口也能理解当前训练动作。该入口 MUST 与现有场景训练步骤一致，不得定义一套新的学习状态流。

#### Scenario: 用户进入 Scene 主学习视图
- **WHEN** 用户打开一个 Scene 的主学习视图
- **THEN** 页面 MUST 展示当前训练步骤或下一步训练动作
- **AND** 该入口 MUST 复用现有 training session、practice snapshot 与 variant unlock 状态
- **AND** 浮动训练入口可以继续展示完整进度、步骤列表、统计摘要和已完成步骤的辅助快捷入口
- **AND** 浮动训练入口不得重复承载当前步骤主 CTA 或“下一步”行动指令

#### Scenario: 当前训练步骤存在可执行动作
- **WHEN** 当前场景训练步骤存在主 CTA
- **THEN** Scene 主学习视图的下一步入口 MUST 承载该主 CTA
- **AND** 浮动训练入口不得同时展示同一当前步骤主 CTA
- **AND** 系统不得因为增加页面级下一步入口而新增数据库字段、API 字段或独立状态机

### Requirement: Scene 辅助和管理动作不得抢占学习主路径
系统 MUST 在 Scene 学习页面中区分学习主动作与辅助 / 管理动作。删除、管理生成结果、查看详情等动作不得与当前学习主动作处于同等主层级。

#### Scenario: 用户进入变体学习页
- **WHEN** 用户打开 Scene 的 variant-study 视图
- **THEN** 系统 MUST 将“基于此变体生成练习”或“继续学习”作为学习主动作
- **AND** 删除变体 MUST 作为辅助或危险次级动作展示

#### Scenario: 用户打开训练进度浮动入口
- **WHEN** 用户展开 Scene 训练进度浮动入口
- **THEN** 系统 MUST 展示完整训练进度、步骤列表和统计摘要
- **AND** 系统 MUST 让当前训练步骤主动作只由主视图下一步入口承载
- **AND** 已完成步骤的复习、回看或再练入口 MAY 作为辅助快捷入口展示
