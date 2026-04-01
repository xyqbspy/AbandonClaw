## MODIFIED Requirements

### Requirement: 场景循环音频应纳入既有预热链路
系统 MUST 在现有音频缓存与预热体系内支持整段场景循环音频的受控预热，降低用户首次触发场景循环播放时的等待。该预热体系 MUST 具备稳定的去重规则，避免同一 lesson 在多个入口被重复调度为等价预热任务。当前端引入统一播放编排层时，该公共层 MUST 继续复用既有 lesson 级与局部预热 key 规则，不得因页面重构而派生新的等价 key 语义。

#### Scenario: 用户准备进入或刚进入场景学习
- **WHEN** 系统在允许的入口与空闲时机为某个场景执行音频预热
- **THEN** 除句子和 chunk 音频外，系统还必须能够预热该场景的整段循环播放音频
- **AND** 该预热必须复用现有 TTS 持久缓存机制
- **AND** 在弱网或不适合预取的环境下必须可以跳过该预热

#### Scenario: 不同入口尝试预热同一 lesson 音频
- **WHEN** `scene detail`、`scene prefetch`、`today continue` 等入口在接近时间内为同一 lesson 发起等价的轻量音频预热
- **THEN** 系统 MUST 按统一 key 规则去重这些等价预热任务
- **AND** 不得因为入口不同就重复执行同一组 lesson 级预热

#### Scenario: 局部交互触发更细粒度音频预热
- **WHEN** 用户打开某个 chunk 或句子的局部详情，系统只需要为当前局部上下文做细粒度预热
- **THEN** 系统 MAY 保留独立于 lesson 级预热的更细粒度 key
- **AND** 不得因为全局 lesson 级去重而吞掉这类局部交互预热

#### Scenario: 页面迁移到统一播放编排层
- **WHEN** `lesson`、`scene detail`、`chunks` 等页面改为通过公共播放编排层触发播放和相关预热
- **THEN** 公共播放编排层必须继续复用既有 `buildChunkAudioKey`、lesson 级预热 key 和局部预热 key 约定
- **AND** 不得为语义等价的播放或预热任务生成另一套重复 key
