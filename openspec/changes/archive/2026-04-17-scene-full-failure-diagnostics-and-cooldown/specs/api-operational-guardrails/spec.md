## MODIFIED Requirements

### Requirement: 音频失败 observability 必须支持最小排障
系统 MUST 为 scene full 失败提供足以回看的最小结构化事件，不要求建设完整 BI 平台。

#### Scenario: scene full fallback 被记录
- **WHEN** scene full 播放进入 fallback
- **THEN** `scene_full_play_fallback` MUST 包含 `failureReason`
- **AND** payload SHOULD 包含 `sceneFullKey`、`readiness`、`segmentCount` 与 `cooldownMs`

#### Scenario: scene full 冷却被命中
- **WHEN** 同一 scene full 在冷却窗口内被再次请求
- **THEN** 系统 MUST 记录冷却命中事件
- **AND** payload MUST 包含 `failureReason = cooling_down`
- **AND** payload SHOULD 包含剩余冷却时间

#### Scenario: 页面级失败摘要被记录
- **WHEN** lesson reader 捕获 scene full 播放失败
- **THEN** `tts_scene_loop_failed` SHOULD 包含 `failureReason`
- **AND** payload SHOULD 包含 `fallbackBlockId` 或 `fallbackSentenceId`
