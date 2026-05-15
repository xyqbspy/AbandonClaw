## Purpose
定义 `chunks` 页面核心动作与后端数据写入的稳定契约，确保表达保存、relation / cluster 维护、AI enrich 与进入复习等副作用可追踪、可校验。该 capability 在学习闭环中承接表达沉淀后的数据语义与副作用边界，而不重复定义 `chunks` 在闭环里的总体角色。
## Requirements
### Requirement: Chunks 核心动作与后端数据写入必须可追踪
系统 MUST 为 `chunks` 页面定义稳定的数据契约，明确手动新建表达、句子提取表达、生成同类表达、生成对照表达、快速添加关系、expression cluster 操作和进入复习等动作分别会调用哪些接口、写入哪些后端数据，以及需要触发哪些页面刷新或缓存失效。

#### Scenario: 维护者追踪 chunks 动作副作用
- **WHEN** 维护者调整 `chunks` 页面任一核心动作
- **THEN** 必须能够通过契约或文档直接查到该动作对应的 API、service、数据写入和页面反馈
- **AND** 不得只修改局部页面行为而忽略 relation、cluster、review 或统计副作用

### Requirement: Builtin core phrase 与 user phrase 必须保持清晰边界
系统 MUST 将系统内置高频表达与用户主动保存后的表达资产分开建模。builtin/core phrase 可以作为共享推荐资产存在于 `phrases` 或等价共享实体中，但不得因为系统预置或用户浏览而自动写入 `user_phrases`。

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

### Requirement: Similar / Contrast 保存语义必须稳定
系统 MUST 明确区分 `similar` 与 `contrast` 在保存表达时的后端语义，包括 relation 写入、cluster 同步、AI enrich 与 source note 的差异。

#### Scenario: 用户保存同类或对照表达
- **WHEN** 用户在 `chunks` 页面保存一个 similar 或 contrast 候选
- **THEN** 系统必须按关系类型写入稳定的 relation 语义
- **AND** similar 链路在需要时必须同步 expression cluster，而 contrast 不得被错误并入同类 cluster
- **AND** 页面反馈与后端数据副作用必须保持一致

### Requirement: Chunks 维护文档必须随数据语义变更同步
系统 MUST 把 chunks 数据映射文档视为需要维护的正式资产；凡是变更保存接口语义、relationType、expressionClusterId、AI enrich、副作用统计或 review 入口逻辑时，必须同步更新文档与回归测试。

#### Scenario: chunks 数据契约发生变化
- **WHEN** 任一影响 `chunks` 页面数据解释或副作用链路的字段、接口或聚合逻辑发生变化
- **THEN** 对应 change 必须同步更新 chunks 映射文档
- **AND** 对应测试必须覆盖更新后的保存、关系、cluster 和页面反馈结果

### Requirement: Chunks 工作台入口层级调整不得破坏数据副作用契约
系统 MUST 在调整 Chunks 工作台主路径、高级整理入口或句子条目动作时，保持表达保存、sentence 保存、relation、cluster、expression map、review session、缓存失效和页面刷新等既有数据副作用契约稳定。

#### Scenario: 维护者调整 Chunks 用户动作层级
- **WHEN** 维护者将 relation、cluster、expression map 或 AI 候选入口移动到详情或更多操作中
- **THEN** 对应动作调用的 API、service、数据写入、cache invalidation、toast 或页面反馈 MUST 与调整前语义一致
- **AND** 必须通过测试覆盖至少一个受影响入口的副作用仍然可追踪

#### Scenario: 维护者调整 sentence 条目主动作
- **WHEN** 维护者调整 sentence 条目在 Chunks 工作台里的主 CTA 或提示
- **THEN** 系统 MUST 保持 sentence 保存语义和 source fields 不变
- **AND** 不得把 sentence 条目错误写入 expression review session

#### Scenario: 维护者调整 expression 复习入口
- **WHEN** 维护者移动 expression 复习入口或修改其展示层级
- **THEN** 系统 MUST 保持 review session 创建、继续和完成回写的既有数据契约
- **AND** 调整不得改变已保存表达与复习队列之间的绑定语义

### Requirement: Chunks 表达删除语义必须稳定
系统 MUST 为 `chunks` 详情中的表达删除定义稳定契约，明确主表达、同类表达和对照表达删除时的后端删除对象、cluster 重排、副作用清理与前端回退行为。删除入口 MUST 绑定当前详情正在展示的表达，并放在详情左下角 `...` 更多操作菜单中。删除动作 MUST 经过公共确认弹框。

#### Scenario: 用户删除当前 cluster 的主表达且仍有剩余成员
- **WHEN** 用户在 `chunks` 详情中删除当前 cluster 的主表达，且该 cluster 还有其他成员
- **THEN** 系统必须删除该用户的目标 `user_phrase`
- **AND** 系统必须为该 cluster 显式选择新的主表达，而不是保留 `main_user_phrase_id = null`
- **AND** 前端详情必须切换到新的主表达并刷新 related rows、cluster 状态和 saved relations

#### Scenario: 用户删除当前 cluster 的唯一主表达
- **WHEN** 用户删除的主表达是该 cluster 的唯一成员
- **THEN** 系统必须删除该 `user_phrase`
- **AND** 系统必须清理空 cluster，而不是保留无成员 cluster
- **AND** 前端必须关闭当前详情或回到可用的上一层上下文，避免停留在悬空详情

#### Scenario: 用户删除同类表达或对照表达
- **WHEN** 用户在 `chunks` 详情中删除一个非当前主表达的 similar 或 contrast 表达
- **THEN** 系统必须删除对应的目标 `user_phrase`
- **AND** 系统必须同步清理该表达关联的 relation、cluster member 与 review 相关数据，或依赖等价的数据库级联结果完成清理
- **AND** 系统必须优先切换到另一条可展示表达；若不存在可切换对象，才允许关闭详情弹框
- **AND** 当前主表达详情必须保持可用，并刷新受影响的 tab 列表、计数和导航状态

#### Scenario: 用户通过更多操作删除当前详情表达
- **WHEN** 用户在详情左下角 `...` 更多操作菜单中点击删除当前表达
- **THEN** 系统必须弹出公共确认弹框，展示当前表达信息与删除风险
- **AND** 用户确认前不得真正执行删除

#### Scenario: 维护者调整表达删除链路
- **WHEN** 维护者修改 `chunks` 表达删除的接口、service、副作用或详情回退逻辑
- **THEN** 必须同步更新 `docs/system-design/chunks-data-mapping.md`
- **AND** 必须通过回归测试覆盖主表达补位、空 cluster 清理和 related rows 刷新

### Requirement: Chunks 表达删除不得误删共享音频资源
系统 MUST 将 `chunks` 表达删除与共享 TTS 存储资源回收解耦；第一版删除表达时不得把按文本共享的音频缓存或存储对象视为表达私有资源直接删除。

#### Scenario: 用户删除带有详情音频的表达
- **WHEN** 用户删除一个当前可播放或已生成 TTS 的表达
- **THEN** 系统可以停止当前前端播放状态并清理临时详情引用
- **AND** 系统不得因为删除该 `user_phrase` 就直接删除共享 TTS 存储对象
- **AND** 若未来需要回收共享音频资源，必须通过独立的回收策略或专门变更定义
