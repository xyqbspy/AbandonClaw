## MODIFIED Requirements

### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: AI 返回的 chunk_cloze 数量偏少
- **WHEN** 某个场景有足够多的可练句子，但 AI 返回的 `chunk_cloze` 数量低于当前题量目标
- **THEN** 系统必须使用本地 scene chunk 挖空结果补足填空题
- **AND** 最终 `cloze` 模块题量不得低于当前配置的最少覆盖目标，除非场景本身可用句子不足

#### Scenario: 上游模型请求失败
- **WHEN** `/api/practice/generate` 的上游模型请求超时、失败或返回空内容
- **THEN** 系统必须优先回退到本地 `buildExerciseSpecsFromScene`
- **AND** 不得直接把上游失败暴露成泛化英文 500 给用户

#### Scenario: 自动预热短时间内连续失败
- **WHEN** 同一 scene 练习生成在短时间内连续失败达到当前阈值
- **THEN** 系统必须停止继续自动重复请求
- **AND** 返回稳定的最终失败结果
- **AND** 错误提示必须使用中文

#### Scenario: 用户对已有练习不满意并主动重生
- **WHEN** 当前 scene 已经存在练习集，但用户主动触发“重新生成题目”之类的手动入口
- **THEN** 系统必须允许重新生成新的练习集
- **AND** 用户不应被要求先删除练习再回到 scene 页
- **AND** 新生成结果必须成为当前最新练习集
