## ADDED Requirements

### Requirement: 匿名试用必须提供独立场景列表入口

系统 MUST 提供独立于主应用场景列表的匿名试用入口，用于展示精选公开场景，并让未登录访客在不进入主应用登录态路由的前提下理解产品价值。

#### Scenario: 未登录访客访问匿名试用列表

- **WHEN** `ALLOW_ANONYMOUS_TRIAL=true`
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 展示 4-5 条精选公开场景
- **AND** 每条场景 MUST 提供进入匿名详情页的入口
- **AND** 系统 MUST NOT 查询或展示任何用户私有学习数据

#### Scenario: 匿名试用关闭

- **WHEN** `ALLOW_ANONYMOUS_TRIAL` 未开启
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 返回受控登录或注册引导
- **AND** 不得继续加载匿名试用业务数据

### Requirement: 匿名场景详情必须以只读学习能力为主

匿名场景详情 MUST 支持访客查看公开场景内容、句子和详情信息，并允许播放已生成 TTS，但不得写入用户学习状态。

#### Scenario: 未登录访客进入匿名场景详情

- **WHEN** 未登录访客从 `/trial` 进入 `/trial/scene/[slug]`
- **AND** 该 slug 属于精选公开场景
- **THEN** 系统 MUST 展示场景正文、句子列表和可公开的 detail/chunk 信息
- **AND** 系统 MAY 允许播放已生成 TTS
- **AND** 系统 MUST NOT 写入 progress、review、practice run 或其他用户态学习数据

#### Scenario: TTS 音频未预生成

- **WHEN** 匿名详情页中的句子没有已生成 TTS
- **THEN** 系统 MUST 展示受控空态或注册引导
- **AND** MUST NOT 在匿名模式下触发实时 TTS 生成

### Requirement: 匿名练习体验只能消费预生成题集且不得提交

匿名试用 MAY 展示预生成练习题，并允许本地作答体验；系统 MUST 禁止匿名生成题目、提交结果和保存练习状态。

#### Scenario: 匿名访客查看预生成练习题

- **WHEN** 匿名访客访问包含预生成题集的匿名场景详情
- **THEN** 系统 MAY 展示这些题目
- **AND** MAY 在前端提供本地选择答案和本地反馈
- **AND** MUST NOT 创建 practice run、写入答案、写入 progress 或加入复习

#### Scenario: 匿名访客尝试提交练习

- **WHEN** 匿名访客点击提交练习、保存结果或加入复习
- **THEN** 系统 MUST 阻断操作并提示注册
- **AND** 服务端 MUST 拒绝对应匿名写入请求
- **AND** 不得执行任何业务写入

#### Scenario: 场景没有预生成练习题

- **WHEN** 匿名场景详情没有可读取的预生成题集
- **THEN** 系统 MUST 展示注册后生成或注册后练习的引导
- **AND** MUST NOT 调用练习生成接口

### Requirement: 匿名写入和生成能力必须提示注册并保持拒绝

匿名模式下，任何导入、生成、保存、提交、加入复习或写学习状态的能力 MUST 被拒绝，并以注册引导作为用户可理解的反馈。

#### Scenario: 匿名访客触发生成或导入能力

- **WHEN** 匿名访客尝试导入场景、生成场景或生成练习题
- **THEN** 系统 MUST 显示注册引导
- **AND** 服务端 MUST 拒绝匿名请求
- **AND** 不得触发上游 AI、解析、TTS 生成或其他高成本处理

#### Scenario: 匿名访客触发保存或复习能力

- **WHEN** 匿名访客尝试保存表达、加入复习、提交 review 或写入 progress
- **THEN** 系统 MUST 显示注册引导
- **AND** 服务端 MUST 拒绝匿名请求
- **AND** 不得写入用户态业务表

### Requirement: 匿名试用能力必须沿用现有匿名配额

扩展后的匿名试用 MUST 沿用现有匿名身份、匿名配额和高成本接口治理，不得因为新增 `/trial` 入口而新增匿名生成类配额。

#### Scenario: 匿名访客使用允许的高成本只读辅助能力

- **WHEN** 匿名访客使用现有允许的匿名 explain 或 TTS 播放能力
- **THEN** 系统 MUST 继续使用现有匿名配额和错误码
- **AND** 配额耗尽时 MUST 展示注册引导或受控配额提示

#### Scenario: 匿名访客尝试使用未允许的高成本能力

- **WHEN** 匿名访客尝试使用 AI 场景生成、练习生成或实时 TTS 生成
- **THEN** 系统 MUST 按现有匿名高成本接口治理拒绝请求
- **AND** 不得为 `/trial` 单独放宽额度
