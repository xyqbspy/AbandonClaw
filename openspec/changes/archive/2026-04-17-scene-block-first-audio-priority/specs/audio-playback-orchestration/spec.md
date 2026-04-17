## ADDED Requirements

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

### Requirement: Scene full 必须保持高优先级但不得抢占当前 block 播放
系统 MUST 继续为 scene full 音频提供后台准备能力，并保证当前用户点击播放优先。

#### Scenario: scene full 后台准备
- **WHEN** scene detail 页完成首屏音频调度
- **THEN** 系统 SHOULD 继续入队 scene full 预热
- **AND** scene full 预热不得压制当前 block 播放请求

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
