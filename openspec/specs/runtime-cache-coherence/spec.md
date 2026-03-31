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
系统 MUST 在现有音频缓存与预热体系内支持整段场景循环音频的受控预热，降低用户首次触发场景循环播放时的等待。

#### Scenario: 用户准备进入或刚进入场景学习
- **WHEN** 系统在允许的入口与空闲时机为某个场景执行音频预热
- **THEN** 除句子和 chunk 音频外，系统还必须能够预热该场景的整段循环播放音频
- **AND** 该预热必须复用现有 TTS 持久缓存机制
- **AND** 在弱网或不适合预取的环境下必须可以跳过该预热

