## MODIFIED Requirements

### Requirement: Scene practice 重新生成必须创建新的 practice set
系统 MUST 将手动重新生成题目视为创建新 practice set，而不是覆盖旧 practice set 本体。

#### Scenario: 用户手动重新生成题目
- **WHEN** 用户在 scene 练习页主动点击“重新生成题目”
- **THEN** 系统必须创建新的 `practiceSetId`
- **AND** 旧 practice set 对应的历史 run / attempt 不得被改写为指向新题目
- **AND** 页面当前继续入口必须切换到新生成的 practice set

#### Scenario: 用户在 Scene 主详情页点击练习阶段入口
- **WHEN** 用户在 Scene 主详情页点击已经可用的 `练习` 阶段入口
- **THEN** 系统 MUST 进入已有 practice set 或开启再练一轮
- **AND** 该入口 MUST NOT 等同于“重新生成题目”
- **AND** 若用户需要新题集，必须在 practice view 内通过明确的重新生成动作触发
