## MODIFIED Requirements

### Requirement: 场景循环音频应纳入既有预热链路
系统 MUST 在现有音频缓存与预热体系内支持整段场景循环音频的受控预热，降低用户首次触发场景循环播放时的等待。该预热体系 MUST 具备稳定的去重规则，避免同一 lesson 在多个入口被重复调度为等价预热任务。

#### Scenario: 不同入口尝试预热同一 lesson 音频

- **WHEN** `scene detail`、`scene prefetch`、`today continue` 等入口在接近时间内为同一 lesson 发起等价的轻量音频预热
- **THEN** 系统 MUST 按统一 key 规则去重这些等价预热任务
- **AND** 不得因为入口不同就重复执行同一组 lesson 级预热

#### Scenario: 局部交互触发更细粒度音频预热

- **WHEN** 用户打开某个 chunk 或句子的局部详情，系统只需要为当前局部上下文做细粒度预热
- **THEN** 系统 MAY 保留独立于 lesson 级预热的更细粒度 key
- **AND** 不得因为全局 lesson 级去重而吞掉这类局部交互预热

### Requirement: 浏览器端 TTS 缓存必须受控增长
系统 MUST 把浏览器端 TTS 缓存视为受控资源，而不是无限增长的临时堆积。对于内存 URL 缓存、Blob URL 缓存和 Cache Storage 持久缓存，系统 MUST 定义明确的增长上限与自动裁剪策略；当缓存超过上限时，系统 MUST 优先清理最旧或最低优先级条目，并保持主播放链路不被阻塞。

#### Scenario: 浏览器端 TTS 缓存超过上限

- **WHEN** 内存缓存或 Cache Storage 中的 TTS 条目数、体积或等价资源占用超过预设上限
- **THEN** 系统 MUST 自动执行受控裁剪
- **AND** 裁剪应优先移除最旧或最低优先级条目，而不是直接清空全部缓存
- **AND** 当前正在请求或刚写入的主音频资源不应被误删

#### Scenario: 缓存裁剪过程中发生失败

- **WHEN** 系统在浏览器端执行 TTS 缓存裁剪时发生异常
- **THEN** 系统 MAY 记录诊断信息
- **AND** 不得因此阻塞当前音频生成、预取或播放主链路
