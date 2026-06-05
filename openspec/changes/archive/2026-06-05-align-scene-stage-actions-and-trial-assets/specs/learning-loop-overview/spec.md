## MODIFIED Requirements

### Requirement: Scene 主学习视图必须暴露当前下一步
系统 MUST 在 Scene 主学习视图中提供用户可见的当前下一步入口，使用户不依赖浮动进度入口也能理解当前训练动作。该入口 MUST 与现有场景训练步骤一致，不得定义一套新的学习状态流。

#### Scenario: 用户进入 Scene 主学习视图
- **WHEN** 用户打开 Scene detail 的主学习视图
- **THEN** 页面 MUST 展示当前训练步骤和下一步动作
- **AND** 该展示 MUST 围绕“听熟这段 / 看重点表达 / 开始练习 / 解锁变体”等稳定训练步骤组织
- **AND** 页面 MAY 在当前下一步之外展示已经到达阶段的次级阶段入口
- **AND** 阶段入口 MUST NOT 抢占当前下一步主 CTA

#### Scenario: 用户处于非练习阶段
- **WHEN** 用户尚未到达 `practice_sentence` 或 `scene_practice`
- **THEN** Scene 主详情页 MUST NOT 展示可点击的 `练习` 阶段入口
- **AND** 当前下一步入口仍按训练状态引导用户继续推进

#### Scenario: 用户已到达练习阶段
- **WHEN** 用户已经到达 `practice_sentence` 或 `scene_practice`
- **THEN** Scene 主详情页 MAY 展示 `练习` 阶段入口
- **AND** 若已有 generated practice set，点击 MUST 进入 practice view
- **AND** 若 latest practice set 已 completed，点击 MUST 开启再练一轮并进入 practice view
- **AND** 若尚无 practice set，首次生成仍 MUST 由当前下一步主 CTA 承担

#### Scenario: 用户已解锁变体阶段
- **WHEN** 用户已经解锁 variant 或当前步骤为 `done`
- **THEN** Scene 主详情页 MAY 展示 `变体` 阶段入口
- **AND** 若已有 generated variant set，点击 MUST 进入 variants view 或当前 active variant
- **AND** 若 latest variant set 已 completed，点击 MUST 开启再练一轮并进入 variants view
- **AND** 若尚无 variant set，首次生成仍 MUST 由当前下一步主 CTA 承担

#### Scenario: 用户未解锁变体阶段
- **WHEN** 用户尚未解锁 variant
- **THEN** Scene 主详情页 MUST NOT 展示可点击的 `变体` 阶段入口
- **AND** 页面不得通过该入口提前生成或打开 variants view
