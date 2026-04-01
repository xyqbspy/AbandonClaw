# runtime-cache-coherence Specification

## Purpose
TBD - created by archiving change stabilize-runtime-caching. Update Purpose after archive.
## Requirements
### Requirement: Scene 列表缓存不得长期遮蔽服务端最新状态
系统 MUST 允许 `scenes` 列表在命中本地缓存时立即渲染缓存内容，但不得因为缓存仍在本地 TTL 内就停止对服务端最新列表的后台刷新。

#### Scenario: 打开 scenes 页面且本地已有未过期缓存
- **WHEN** 用户进入 `scenes` 页面且本地存在结构有效、未过期的场景列表缓存
- **THEN** 页面必须先使用缓存快速展示场景列表
- **AND** 系统必须继续发起受控的后台刷新请求以校验最新服务端状态
- **AND** 后台刷新成功后必须用最新结果更新页面与本地缓存

### Requirement: Scene 详情缓存必须同时支持秒开与后台校验
系统 MUST 允许 `scene detail` 在命中本地缓存时先渲染详情内容，但不得把“缓存命中”作为跳过服务端校验的唯一依据。

#### Scenario: 进入场景详情且本地已有未过期详情缓存
- **WHEN** 用户进入某个 `scene` 详情页且本地存在结构有效、未过期的详情缓存
- **THEN** 页面必须先使用缓存渲染详情内容
- **AND** 系统必须继续执行后台详情刷新
- **AND** 若服务端返回更新后的学习状态、标题、副标题或关联入口，页面与缓存都必须同步更新

### Requirement: 用户态缓存职责必须显式声明
系统 MUST 为用户个性化 GET 接口显式声明缓存职责，并使客户端请求策略与前端自管缓存保持一致，避免依赖浏览器默认缓存行为。

#### Scenario: 读取用户专属列表或详情数据
- **WHEN** 前端请求 `scenes`、`scene detail`、`chunks` 列表等用户专属数据
- **THEN** 接口响应必须显式声明缓存语义
- **AND** 客户端请求必须明确自身缓存策略
- **AND** 不得出现同类接口一部分依赖自定义缓存、一部分依赖浏览器默认缓存的隐式分裂

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
