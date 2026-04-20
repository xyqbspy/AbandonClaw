## Purpose
定义 `chunks` 页面核心动作与后端数据写入的稳定契约，确保表达保存、relation / cluster 维护、AI enrich 与进入复习等副作用可追踪、可校验。该 capability 在学习闭环中承接表达沉淀后的数据语义与副作用边界，而不重复定义 `chunks` 在闭环里的总体角色。
## Requirements
### Requirement: Chunks 核心动作与后端数据写入必须可追踪
系统 MUST 为 `chunks` 页面定义稳定的数据契约，明确手动新建表达、句子提取表达、生成同类表达、生成对照表达、快速添加关系、expression cluster 操作和进入复习等动作分别会调用哪些接口、写入哪些后端数据，以及需要触发哪些页面刷新或缓存失效。

#### Scenario: 维护者追踪 chunks 动作副作用
- **WHEN** 维护者调整 `chunks` 页面任一核心动作
- **THEN** 必须能够通过契约或文档直接查到该动作对应的 API、service、数据写入和页面反馈
- **AND** 不得只修改局部页面行为而忽略 relation、cluster、review 或统计副作用

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
- **THEN** 必须同步更新 `docs/chunks-data-mapping.md`
- **AND** 必须通过回归测试覆盖主表达补位、空 cluster 清理和 related rows 刷新

### Requirement: Chunks 表达删除不得误删共享音频资源
系统 MUST 将 `chunks` 表达删除与共享 TTS 存储资源回收解耦；第一版删除表达时不得把按文本共享的音频缓存或存储对象视为表达私有资源直接删除。

#### Scenario: 用户删除带有详情音频的表达
- **WHEN** 用户删除一个当前可播放或已生成 TTS 的表达
- **THEN** 系统可以停止当前前端播放状态并清理临时详情引用
- **AND** 系统不得因为删除该 `user_phrase` 就直接删除共享 TTS 存储对象
- **AND** 若未来需要回收共享音频资源，必须通过独立的回收策略或专门变更定义
