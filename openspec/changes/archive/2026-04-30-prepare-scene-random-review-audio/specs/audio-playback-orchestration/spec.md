## MODIFIED Requirements

### Requirement: scenes 随机复习播放必须优先消费已准备资源

scenes 列表的随机复习播放 MUST 在播放队列中优先消费本地 scene detail cache 与浏览器 TTS 音频缓存，避免每个队列项切换时默认依赖网络请求。

#### Scenario: 随机复习播放优先使用单个 review pack

- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** 用户启动随机复习播放
- **THEN** 系统 SHOULD 优先把当前随机起点后的少量合格场景组装成单个可循环播放的 scene review pack 音频
- **AND** review pack 播放开始后不应依赖每个场景结束时的 JS 切歌来继续后台播放
- **AND** 单个候选场景详情加载失败时，系统 SHOULD 跳过该候选并继续使用其他可用场景组包

#### Scenario: review pack 失败后回退逐场景播放

- **WHEN** review pack 无法生成或无法开始播放
- **THEN** 系统 MAY 回退到逐场景 scene full 队列播放
- **AND** 回退队列 MUST 继续遵守 scene detail cache 优先、本轮已加载详情复用、失败跳过和整轮失败停止提示规则

#### Scenario: 随机复习播放命中 scene detail 缓存

- **GIVEN** 合格场景已经存在有效 scene detail cache
- **WHEN** 用户启动 scenes 随机复习播放
- **THEN** 系统 MUST 使用缓存中的 scene detail 构建 scene full segments
- **AND** 不得为了该缓存命中的 scene detail 再请求 `/api/scenes/{slug}`

#### Scenario: 随机复习播放启动时准备后续场景

- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** 用户启动随机复习播放
- **THEN** 系统 SHOULD 对当前场景及后续少量候选场景准备 scene detail 与 scene full 音频
- **AND** 准备失败不得中断当前播放队列

#### Scenario: 准备资源仍不可用

- **WHEN** 某个随机复习队列项无法读取 scene detail、无法构建可播放 segments 或 scene full 播放失败
- **THEN** 系统 MAY 跳过该场景并尝试下一个合格场景
- **AND** 若一轮内所有合格场景都失败，系统 MUST 停止随机复习播放并给出受控提示
