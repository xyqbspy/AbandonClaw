## ADDED Requirements

### Requirement: Scene 主学习视图必须暴露当前下一步
系统 MUST 在 Scene 主学习视图中提供用户可见的当前下一步入口，使用户不依赖浮动进度入口也能理解当前训练动作。该入口 MUST 与现有场景训练步骤一致，不得定义一套新的学习状态流。

#### Scenario: 用户进入 Scene 主学习视图
- **WHEN** 用户打开 Scene detail 的主学习视图
- **THEN** 页面 MUST 展示当前训练步骤或下一步训练动作
- **AND** 该展示 MUST 围绕“听熟这段 / 看重点表达 / 开始练习 / 解锁变体”等稳定训练步骤组织
- **AND** 浮动训练入口可以继续展示完整进度，但不得成为用户理解下一步的唯一入口

#### Scenario: 当前步骤存在可执行动作
- **WHEN** 当前场景训练步骤存在主 CTA
- **THEN** Scene 主学习视图 MUST 提供与该步骤一致的主行动入口
- **AND** 该主行动入口不得绕过现有 practice set、variant set、learning sync 或 route state 语义

### Requirement: Scene 辅助和管理动作不得抢占学习主路径
系统 MUST 在 Scene 学习页面中区分学习主动作与辅助 / 管理动作。删除、管理生成结果、查看详情等动作不得与当前学习主动作处于同等主层级。

#### Scenario: 用户查看变体学习页
- **WHEN** 用户进入某个变体的学习视图
- **THEN** 页面 MUST 优先展示继续学习或基于该变体继续练习的动作
- **AND** 删除变体等管理动作 MUST 降级为辅助或危险次级动作
- **AND** 降级不得移除现有管理能力，只调整用户可见层级

#### Scenario: 用户在 Scene 页面看到多个动作
- **WHEN** 页面同时存在学习、查看、删除、返回或管理类动作
- **THEN** 系统 MUST 让当前训练步骤主动作成为唯一主 CTA
- **AND** 其它动作 MUST 以辅助入口、次按钮或更低视觉层级呈现
