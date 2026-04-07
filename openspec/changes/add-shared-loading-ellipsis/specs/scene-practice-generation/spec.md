## MODIFIED Requirements

### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: 用户手动重新生成题目
- **WHEN** 用户在 scene 练习页主动点击“重新生成题目”
- **THEN** 系统必须展示统一的 loading 反馈
- **AND** 文案必须明确表示当前正在生成中
- **AND** 该 loading 展示必须复用公共组件，而不是在页面局部单独实现
