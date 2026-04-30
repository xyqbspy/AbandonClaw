## Purpose
定义前端音频播放、预热、调度、fallback 与可回看行为，确保 scene detail 的 block-first 主路径、scene full secondary 路径和兼容层语义保持一致。该 capability 在学习闭环中承接 `scene` 音频消费与播放编排的专项规则，而不重复定义场景步骤或学习完成语义。

## Requirements

### Requirement: TTS 上游异常必须留下可追踪记录
系统 MUST 允许维护者在不依赖浏览器 console 的前提下，回看最近一次真实使用里产生的音频失败摘要，至少覆盖 `scene full` 失败与替代 CTA 点击结果。

#### Scenario: 维护者复核最近一次 scene full 失败
- **WHEN** 维护者打开本地可回看面板
- **THEN** 系统 MUST 展示最近一次音频失败摘要
- **AND** 若用户点击了替代 CTA，也 MUST 能看到对应动作记录

### Requirement: Scene detail 音频预热必须以 block 为主消费单元
系统 MUST 在 scene detail 页优先预热用户真实点击播放的 block 音频，而不是默认预热独立 sentence 音频。

#### Scenario: 进入 scene detail 页后预热首屏 block
- **WHEN** 用户进入 scene detail 页
- **THEN** 系统 MUST 将首屏可播放 block 入队预热
- **AND** 每个 block 预热资源 MUST 使用与 `playBlockTts()` 相同的文本和 `block-*` 标识
- **AND** 系统 MUST NOT 默认把 block 内的单独 sentence 作为主预热对象

#### Scenario: 页面空闲期间补齐后续 block
- **WHEN** scene detail 页可见、网络条件允许且无立即播放需求
- **THEN** 系统 MUST 小批量入队后续可播放 block
- **AND** 每轮入队数量 MUST 有上限

### Requirement: Scene detail 播放驱动提权必须优先后续 block
系统 MUST 在用户播放 block 或 block 内句子后，优先提权后续 block 音频。

#### Scenario: 用户播放某个 block
- **WHEN** 用户点击 block 播放按钮
- **THEN** 系统 MUST 使用现有播放 API 播放当前 block
- **AND** 系统 SHOULD 将后续 block 提升到更高预热优先级
- **AND** 不得因为提权导致同一 block 音频重复请求

#### Scenario: 用户明确播放单句
- **WHEN** 用户在明确单句消费入口播放 sentence
- **THEN** 系统 MAY 按需请求该 sentence 音频
- **AND** 后台主预热队列仍 SHOULD 优先后续 block

### Requirement: Block 兼容层不得污染 sentence 语义
系统 MUST 在调试与观测入口区分 block 音频和真实 sentence 音频，即使 block 音频暂时复用 sentence TTS 通道。

#### Scenario: 回看 block 播放事件
- **WHEN** scene detail 页通过 `block-*` 标识播放 block 音频
- **THEN** 系统 MUST 继续记录现有 `sentence_audio_play_*` 事件
- **AND** 事件 payload MUST 包含 `audioUnit = block`
- **AND** 系统 MUST NOT 让回看入口只能依赖 `sentenceId` 推断音频语义

#### Scenario: 查看浏览器 TTS 缓存
- **WHEN** 管理端查看 `sentence:...:sentence-block-*` 缓存项
- **THEN** 系统 MUST 将其展示为 `block` 类型
- **AND** 系统 MUST NOT 将其展示为真实 sentence 缓存

### Requirement: Scene full 后台准备和播放必须不压制 block 主路径
scene detail 页 MUST 继续以 block 为主播放单元，scene full 作为 secondary 音频资源进行准备和播放。

#### Scenario: scene full 冷却期间
- **GIVEN** 某个 scene full 最近失败并处于冷却期
- **WHEN** 页面执行后台预热或用户点击 full
- **THEN** 系统 MUST NOT 让 full 反复生成挤占 block 播放资源
- **AND** block 播放、block 预热和 fallback CTA MUST 继续可用

#### Scenario: scene full 可以重试
- **GIVEN** scene full 未处于冷却期
- **WHEN** 用户明确点击 full 或后台调度允许
- **THEN** 系统 MAY 尝试准备 scene full
- **AND** 当前用户点击的 block 播放仍 MUST 高于 full 后台任务

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
### Requirement: scenes 随机复习播放必须优先消费已准备资源
scenes 列表的复习播放 MUST 优先消费本地 scene detail cache 与浏览器 TTS 音频缓存，避免播放时默认依赖网络请求。为了最大化后台播放稳定性，系统 SHOULD 使用固定顺序的 deterministic review pack，而不是为了随机起点牺牲提前准备命中率。

#### Scenario: scenes 复习播放提前准备固定顺序 review pack
- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** 页面完成列表加载并识别出合格场景
- **THEN** 系统 SHOULD 按当前列表顺序取少量合格场景预准备单个可循环播放的 scene review pack 音频
- **AND** 预准备 MUST 使用 scene detail cache 优先策略
- **AND** 单个候选场景详情加载失败时，系统 SHOULD 跳过该候选并继续使用其他可用场景组包
- **AND** 预准备失败不得阻断页面使用

#### Scenario: 用户启动 scenes 复习播放
- **GIVEN** deterministic review pack 已经准备或正在准备
- **WHEN** 用户启动 scenes 复习播放
- **THEN** 系统 SHOULD 优先播放同一个固定顺序 review pack
- **AND** 播放开始后不应依赖每个场景结束时的 JS 切歌来继续后台播放

#### Scenario: review pack 失败后回退逐场景播放
- **WHEN** review pack 无法生成或无法开始播放
- **THEN** 系统 MAY 回退到逐场景 scene full 队列播放
- **AND** 回退队列 MUST 继续遵守 scene detail cache 优先、本轮已加载详情复用、失败跳过和整轮失败停止提示规则

#### Scenario: scenes 复习播放命中 scene detail 缓存
- **GIVEN** 合格场景已经存在有效 scene detail cache
- **WHEN** 系统准备或启动 scenes 复习播放
- **THEN** 系统 MUST 使用缓存中的 scene detail 构建 scene full segments
- **AND** 不得为了该缓存命中的 scene detail 再请求 `/api/scenes/{slug}`

#### Scenario: scenes 复习播放启动时准备后续场景
- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** review pack 需要回退为逐场景播放
- **THEN** 系统 SHOULD 对当前场景及后续少量候选场景准备 scene detail 与 scene full 音频
- **AND** 准备失败不得中断当前播放队列

#### Scenario: 准备资源仍不可用
- **WHEN** 某个随机复习队列项无法读取 scene detail、无法构建可播放 segments 或 scene full 播放失败
- **THEN** 系统 MAY 跳过该场景并尝试下一个合格场景
- **AND** 若一轮内所有合格场景都失败，系统 MUST 停止随机复习播放并给出受控提示
