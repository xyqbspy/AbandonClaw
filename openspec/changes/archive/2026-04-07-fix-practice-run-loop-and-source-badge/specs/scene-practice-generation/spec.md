## MODIFIED Requirements

### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: 题目页启动练习 run
- **WHEN** 用户首次进入某个 scene 练习集的题目页，或在同一页面里刚手动重新生成出新的练习集
- **THEN** 系统必须只为当前 `practiceSetId + mode` 启动一次 `practice run`
- **AND** 不得因为页面重渲染或回调引用变化而持续重复调用 `/api/learning/scenes/[slug]/practice/run`

#### Scenario: 练习集记录生成来源
- **WHEN** 系统为某个 scene 生成练习集
- **THEN** 练习集必须显式记录当前题目是 `AI生成` 还是 `系统生成`
- **AND** 该元数据必须随练习集一起保留，供题目页展示使用

#### Scenario: 题目页展示题目生成来源
- **WHEN** 用户进入 scene 练习题目页
- **THEN** 题目页必须在“来源场景”文案中展示当前练习集的生成来源提示
- **AND** 原始场景与变体场景都必须保持原有来源语义不丢失
- **AND** 用户必须能直接看到类似 `来源场景 | 系统生成：...` 或 `来源场景 | AI生成：...` 的文案
