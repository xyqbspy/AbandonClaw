## ADDED Requirements

### Requirement: Builtin core phrase 与 user phrase 必须保持清晰边界
系统 MUST 将系统内置高频表达与用户主动保存后的表达资产分开建模。builtin/core phrase 可以作为共享推荐资产存在于 `phrases` 或等价共享实体中，但不得因为系统预置而自动写入 `user_phrases`。

#### Scenario: 新用户浏览必备表达
- **WHEN** 新用户打开 `Chunks` 的“必备表达”
- **THEN** 系统 MUST 只返回共享 builtin/core phrase 资产
- **AND** 不得因为浏览行为自动创建 `user_phrase`

#### Scenario: 用户主动保存 builtin phrase
- **WHEN** 用户点击“保存到我的表达”
- **THEN** 系统 MUST 复用或创建共享 `phrase`，并幂等 upsert 对应 `user_phrase`
- **AND** 相同 `phrase_id` 对同一 `user_id` 不得重复创建第二条 `user_phrase`
- **AND** 已有 mastery / review 统计不得被覆盖回初始状态

### Requirement: Builtin phrase 保存后必须进入现有复习闭环
系统 MUST 保证 builtin phrase 一旦被用户主动保存，就进入与普通 expression 相同的个人资产与复习闭环。

#### Scenario: 用户保存一个新的 builtin core phrase
- **WHEN** 用户第一次保存某个 builtin/core phrase
- **THEN** 该 phrase MUST 在“我的表达”中可见
- **AND** 该 phrase MUST 进入现有 review 可消费状态
- **AND** `today` / `progress` 后续只能通过现有 `user_phrases` 与聚合结果消费它，而不是直接消费共享 builtin phrase

### Requirement: Builtin phrase 列表必须返回用户态已保存标记
系统 MUST 为 builtin/core phrase 列表返回当前用户是否已保存的稳定字段，以支持前端展示“保存到我的表达 / 已保存”状态。

#### Scenario: 用户请求 builtin phrase 列表
- **WHEN** 前端请求 builtin/core phrase 列表
- **THEN** 系统 MUST 返回每条 phrase 的基础共享字段与 `isSaved`
- **AND** `isSaved` MUST 基于当前用户是否存在对应 `user_phrase`
