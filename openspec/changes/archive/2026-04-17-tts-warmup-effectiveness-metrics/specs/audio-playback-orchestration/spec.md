## ADDED Requirements

### Requirement: TTS 预热必须可与后续播放事件关联
系统 MUST 在浏览器运行时记录 TTS 音频资源是否曾经被预热触发，并在后续播放事件中标明该资源播放前是否处于 warmed 状态。

#### Scenario: 播放已被预热的 block 音频
- **GIVEN** 某个 block 音频资源已经通过 initial、idle 或 playback 预热入队
- **WHEN** 用户播放该 block 音频
- **THEN** 播放事件 payload MUST 包含 `wasWarmed = true`
- **AND** payload MUST 包含对应 `warmupSource`
- **AND** payload MUST 继续包含 `audioUnit = block`

#### Scenario: 播放未被预热的音频资源
- **GIVEN** 某个 TTS 音频资源没有有效 warmup 记录，或记录已经过期
- **WHEN** 用户播放该资源
- **THEN** 播放事件 payload MUST 包含 `wasWarmed = false`
- **AND** payload MUST NOT 伪造 `warmupSource`

### Requirement: Warmup 记录必须具备时效性
系统 MUST 为每个 TTS warmup 记录设置过期时间（TTL）。

#### Scenario: warmup 记录过期
- **GIVEN** 某个音频资源存在 warmup 记录
- **AND** 当前时间超过该记录 TTL（默认 20 分钟）
- **WHEN** 用户播放该资源
- **THEN** 系统 MUST 视该资源为 `wasWarmed = false`

### Requirement: 多次 warmup 来源必须稳定覆盖
系统 MUST 在同一资源多次 warmup 时保持来源一致性。

#### Scenario: playback 覆盖 earlier warmup
- **GIVEN** 某资源先被 initial 或 idle warmup
- **AND** 后续被 playback warmup
- **WHEN** 用户播放该资源
- **THEN** payload MUST 使用 `warmupSource = playback`

#### Scenario: earlier warmup 不得覆盖 playback
- **GIVEN** 某资源已被 playback warmup
- **WHEN** 后续触发 initial 或 idle warmup
- **THEN** 系统 MUST NOT 覆盖当前 warmupSource

### Requirement: 所有播放事件必须标识音频单元类型
系统 MUST 在所有 TTS 播放事件中统一标识音频单元类型。

#### Scenario: 播放事件统一字段
- **WHEN** 系统记录任意 TTS 播放事件
- **THEN** payload MUST 包含 `audioUnit`
- **AND** audioUnit MUST 属于 `block`、`sentence`、`chunk` 或 `scene_full`

### Requirement: TTS 预热来源必须稳定区分
系统 MUST 对 TTS 预热来源进行稳定分类，至少区分首屏预热、空闲增量预热和播放驱动提权。

#### Scenario: 首屏预热资源被播放
- **WHEN** 资源由首屏或入口级预热触发
- **THEN** 后续播放事件 SHOULD 使用 `warmupSource = initial`

#### Scenario: 空闲增量预热资源被播放
- **WHEN** 资源由页面空闲增量预热触发
- **THEN** 后续播放事件 SHOULD 使用 `warmupSource = idle`

#### Scenario: 播放驱动提权资源被播放
- **WHEN** 资源由用户播放后的后续资源提权触发
- **THEN** 后续播放事件 SHOULD 使用 `warmupSource = playback`
- **AND** playback 来源 MAY 覆盖同一资源较早的 initial 或 idle 来源

### Requirement: Scene full 预热收益必须可回看
系统 MUST 在 scene full 播放相关事件中携带 warmup 信息，以便维护者判断提前准备是否减少 wait 与 fallback。

#### Scenario: scene full 已预热且 ready
- **GIVEN** scene full 资源已被预热触发
- **WHEN** 用户点击 scene full 且资源已 ready
- **THEN** 系统 MUST 记录 `scene_full_play_ready`
- **AND** payload MUST 包含 `audioUnit = scene_full`
- **AND** payload MUST 包含 `wasWarmed = true` 和 `warmupSource`

#### Scenario: scene full 未预热且需要等待
- **GIVEN** scene full 没有有效 warmup 记录
- **WHEN** 用户点击 scene full 且资源处于 cold 或 pending
- **THEN** 系统 MUST 记录 wait/fetch 类事件
- **AND** payload MUST 包含 `wasWarmed = false`

#### Scenario: scene full 进入 fallback
- **WHEN** scene full 播放失败并记录 fallback 摘要
- **THEN** fallback payload MUST 包含 `wasWarmed`
- **AND** 如果存在有效 warmup 记录，payload MUST 包含 `warmupSource`

### Requirement: 管理端必须展示本地 TTS 预热收益摘要
系统 MUST 在现有 `/admin/observability` 本地事件回看能力中提供 TTS 预热收益摘要，用于比较 warm 与 cold 样本的命中差异。

#### Scenario: 查看 block 预热收益
- **WHEN** 管理端读取最近本地业务事件
- **THEN** summary MUST 能展示 block warm hit rate、block cold hit rate 和 warmup gain
- **AND** 统计 MUST 基于 `audioUnit = block` 的播放事件

#### Scenario: 查看 scene full 预热收益
- **WHEN** 管理端读取最近本地业务事件
- **THEN** summary MUST 能展示 scene full warm ready rate、cold ready rate 和 fallback rate
- **AND** 统计 MUST 区分 warmed 与 cold 样本

#### Scenario: 按预热来源拆分
- **WHEN** 最近事件包含 `warmupSource`
- **THEN** summary SHOULD 按 `initial`、`idle`、`playback` 展示最小拆分指标

#### Scenario: 最近样本不足
- **WHEN** 最近本地事件不足以计算某项指标
- **THEN** 管理端 MUST 展示空值或 0
- **AND** 不得因为样本不足报错

### Requirement: 预热收益指标必须保持本地轻量
系统 MUST 将 TTS 预热收益指标限制在客户端本地回看范围内，不得引入新的数据库写入或正式 BI 依赖。

#### Scenario: 记录预热收益字段
- **WHEN** 系统记录 warmup 与播放事件关联信息
- **THEN** 系统 MUST 复用现有客户端本地事件链路
- **AND** 不得新增服务端事件表
- **AND** 不得修改 `/api/tts` 协议
