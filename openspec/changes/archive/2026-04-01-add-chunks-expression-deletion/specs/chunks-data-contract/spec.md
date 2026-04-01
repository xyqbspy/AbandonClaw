# chunks-data-contract Specification

## ADDED Requirements

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
