## ADDED Requirements

### Requirement: Review 页面必须把原场景入口视为条件能力
系统 MUST 将 `review` 页面中的“查看原场景”入口视为条件能力，而不是对所有带 `sourceSceneSlug` 的普通表达项都无条件展示可跳转按钮。

#### Scenario: 页面渲染普通表达复习项
- **WHEN** 页面渲染一个普通表达复习项
- **THEN** 必须根据来源场景是否仍可用决定是否展示可点击的原场景入口
- **AND** 若场景不可用，页面必须展示明确的降级状态或隐藏该入口
