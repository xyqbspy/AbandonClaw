# 规范文档：audio-playback-orchestration

## MODIFIED Requirements

### Requirement: scenes 随机复习播放必须优先消费已准备资源
scenes 列表的复习播放 MUST 优先消费本地 scene detail cache 与浏览器 TTS 音频缓存，避免播放时默认依赖网络请求。为了最大化后台播放稳定性，系统 SHOULD 使用可提前准备且同日稳定的 deterministic review pack，而不是为了随机起点牺牲提前准备命中率。

#### Scenario: scenes 复习播放提前准备同日稳定 review pack
- **GIVEN** scenes 列表中存在多个合格场景
- **WHEN** 页面完成列表加载并识别出合格场景
- **THEN** 系统 SHOULD 按同日稳定顺序取少量合格场景预准备单个可循环播放的 scene review pack 音频
- **AND** 预准备 MUST 使用 scene detail cache 优先策略
- **AND** 单个候选场景详情加载失败时，系统 SHOULD 跳过该候选并继续使用其他可用场景组包
- **AND** 预准备失败不得阻断页面使用

#### Scenario: 弱网或省流量下跳过自动准备
- **GIVEN** 浏览器报告 `saveData = true` 或网络类型为 `slow-2g / 2g`
- **WHEN** scenes 列表识别出合格场景
- **THEN** 系统 SHOULD 跳过 review pack 自动预准备
- **AND** 用户明确点击循环播放时，系统 MAY 继续按同一队列尝试准备并播放 review pack

#### Scenario: 用户启动 scenes 复习播放
- **GIVEN** deterministic review pack 已经准备或正在准备
- **WHEN** 用户启动 scenes 复习播放
- **THEN** 系统 SHOULD 优先播放同一个同日稳定 review pack
- **AND** 播放开始后不应依赖每个场景结束时的 JS 切歌来继续后台播放

#### Scenario: review pack 准备状态可见
- **WHEN** 系统自动准备、跳过准备、准备完成或准备失败
- **THEN** scenes 循环播放入口 SHOULD 通过非侵入式方式暴露当前准备状态
- **AND** 不得因为准备失败阻断用户点击后的重试或回退

#### Scenario: review pack 链路可本地回看
- **WHEN** 系统准备、播放或回退 review pack
- **THEN** 系统 SHOULD 记录本地客户端事件
- **AND** 事件 SHOULD 至少区分准备开始、准备完成、准备跳过、准备失败、播放开始和回退逐场景队列
- **AND** 该事件链路 MUST NOT 引入新的服务端事件表或正式 BI 依赖

#### Scenario: review pack 失败后回退逐场景播放
- **WHEN** review pack 无法生成或无法开始播放
- **THEN** 系统 MAY 回退到逐场景 scene full 队列播放
- **AND** 回退队列 MUST 继续遵守 scene detail cache 优先、本轮已加载详情复用、失败跳过和整轮失败停止提示规则
