# 规范文档：audio-playback-orchestration

## MODIFIED Requirements

### Requirement: scenes 随机复习播放必须优先消费已准备资源
scenes 列表的复习播放 MUST 优先消费本地 scene detail cache 与浏览器 TTS 音频缓存。为了最大化后台播放稳定性，系统 SHOULD 使用固定顺序的 deterministic review pack，而不是为了随机起点牺牲提前准备命中率。

#### Scenario: scenes 复习播放提前准备固定顺序 review pack
- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** 页面完成列表加载并识别出合格场景
- **THEN** 系统 SHOULD 按当前列表顺序取少量合格场景预准备单个可循环播放的 scene review pack 音频
- **AND** 预准备 MUST 使用 scene detail cache 优先策略
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
