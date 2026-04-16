## ADDED Requirements

### Requirement: Scene 页音频预热必须具备浏览器侧任务模型
系统 MUST 为 scene 页 sentence 与 scene full 音频预热提供浏览器侧任务模型，支持任务去重、基础状态流转、优先级更新和有界并发。

#### Scenario: scene 页触发首屏音频预热
- **WHEN** scene 页进入后触发首屏音频预热
- **THEN** 系统 MUST 将 sentence 音频预热转换为可去重的预热任务
- **AND** 不得改变现有 sentence 播放入口的外部调用方式

#### Scenario: scene full 音频被请求预热
- **WHEN** scene 页请求预热 scene full 音频
- **THEN** 系统 MUST 将 scene full 预热转换为可去重的预热任务
- **AND** 不得修改服务端 TTS 生成协议

#### Scenario: 多个预热任务同时存在
- **WHEN** 浏览器侧存在多个待执行预热任务
- **THEN** 系统 MUST 按优先级和入队顺序执行
- **AND** 同时执行的后台预热任务数量 MUST 有明确上限

### Requirement: Scene 页预热不得抢占当前播放链路
系统 MUST 保持当前播放请求高于后台预热任务，并确保新增预热模型不会改变 `playSentenceAudio()` 或 `playSceneLoopAudio()` 的外部行为。

#### Scenario: 用户点击播放句子
- **WHEN** 用户点击播放 sentence 音频
- **THEN** 播放链路 MUST 继续通过现有播放 API 执行
- **AND** 后台预热不得要求调用方改用新的播放接口

### Requirement: Scene 页必须支持空闲增量预热后续句子
系统 MUST 在 scene 页稳定停留后，以小批量方式为后续 sentence 音频入队低优先级预热任务，并避免一次性激进全量预热。

#### Scenario: scene 页首屏预热完成后继续停留
- **WHEN** 用户进入 scene 页且页面保持可见、网络条件允许、近期没有高频交互
- **THEN** 系统 MUST 在空闲时分批入队后续 sentence 预热任务
- **AND** 每轮入队数量 MUST 有明确上限

#### Scenario: 页面不适合执行低优先级预热
- **WHEN** 页面 hidden、save-data 或弱网开启、用户近期高频交互，或当前存在播放 loading 需求
- **THEN** 系统 MUST 暂停或不启动低优先级空闲增量预热
- **AND** 不得改变现有播放 API 的外部调用方式

### Requirement: Scene 页必须支持播放驱动的预热提权
系统 MUST 在 scene detail 页面内根据用户实际 sentence 播放行为提升后续音频预热任务优先级，并继续复用浏览器侧 scene 音频预热任务模型。

#### Scenario: 用户播放第 N 句
- **WHEN** 用户在 scene detail 页面播放第 N 句 sentence 音频
- **THEN** 系统 MUST 将第 N+1 到第 N+3 句 sentence 音频作为播放驱动任务入队或提权
- **AND** 已 `loaded` 的目标任务不得重复请求
- **AND** 已 `queued` 或 `loading` 的目标任务不得重复入队

#### Scenario: 用户连续播放多个句子
- **WHEN** 用户连续播放相邻 sentence 音频
- **THEN** 系统 MAY 将 scene full 音频提升到 `next-up`
- **AND** scene full 提权 MUST 排在后续 sentence 提权之后
- **AND** 不得改变现有 scene full 播放 API 的外部调用方式

### Requirement: Scene 页音频播放必须提供最小可回看事件
系统 MUST 为 scene 页 sentence 与 scene full 播放记录最小业务事件，事件必须进入现有客户端业务事件回看链路。

#### Scenario: 用户播放 sentence 音频
- **WHEN** 用户播放 sentence 音频
- **THEN** 系统 MUST 根据播放前缓存状态记录 `sentence_audio_play_hit_cache` 或 `sentence_audio_play_miss_cache`
- **AND** 事件 payload MUST 至少包含 `sceneSlug`、`sentenceId`、`mode` 与 `readiness`

#### Scenario: 用户播放 scene full 音频
- **WHEN** 用户播放 scene full 音频
- **THEN** 系统 MUST 根据播放前缓存状态记录 `scene_full_play_ready` 或 `scene_full_play_wait_fetch`
- **AND** 如果 scene full 播放失败，系统 MUST 记录 `scene_full_play_fallback`
- **AND** 不得建设新的 BI 平台或改变现有播放 API 的外部调用方式
