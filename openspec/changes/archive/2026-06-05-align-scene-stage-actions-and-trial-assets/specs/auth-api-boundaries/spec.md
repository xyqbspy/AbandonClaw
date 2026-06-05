## MODIFIED Requirements

### Requirement: 匿名试用路由必须与主应用路由隔离

系统 MUST 将匿名试用路由与已登录主应用路由隔离。新增匿名能力只能通过明确白名单路径开放，不得把主应用学习路由变成匿名可访问入口。

#### Scenario: 未登录访客访问匿名试用路由

- **WHEN** `ALLOW_ANONYMOUS_TRIAL=true`
- **AND** 未登录访客访问 `/trial` 或 `/trial/scene/[slug]`
- **THEN** 中间件 MAY 放行该请求进入匿名试用分支
- **AND** `/trial` 页面 MUST 渲染公开试用场景列表
- **AND** `/trial/scene/[slug]` 页面 MUST 渲染公开场景详情与固定本地练习 / 固定变体体验
- **AND** 页面 MUST NOT 将 `/trial` 默认跳转到 `/share/scene/[slug]`
- **AND** API MUST 使用匿名只读边界处理请求

#### Scenario: 未登录访客访问主应用学习路由

- **WHEN** 未登录访客访问 `/scenes`、`/scene/[slug]`、`/today`、`/review`、`/chunks`、`/progress`、`/settings` 或其他主应用路由
- **THEN** 系统 MUST 继续要求登录
- **AND** 不得因为 `/trial` 存在而放行这些路由

#### Scenario: 匿名访客调用写入或生成 API

- **WHEN** 未登录访客从 `/trial` 页面或其他来源调用导入、生成、保存、提交、加入复习、progress/review 写入类 API
- **THEN** API MUST 在业务处理前拒绝请求
- **AND** 不得依赖前端隐藏按钮作为唯一防护

#### Scenario: 匿名访客调用实时 AI API

- **WHEN** 未登录访客从 `/trial`、`/share` 页面或其他来源调用实时 AI 解释、场景生成、练习生成、变体生成或相似表达生成 API
- **THEN** 默认配置下 API MUST 在外部模型调用前拒绝请求
- **AND** 不得依赖前端隐藏按钮作为唯一防护

### Requirement: 匿名试用公开读取必须避免用户私有数据访问

匿名试用的公开读取链路 MUST 只访问明确可公开的场景、句子、固定练习 / 固定变体 fixture 和音频数据，不得通过用户上下文读取私有学习表。

#### Scenario: 匿名试用读取场景详情

- **WHEN** 匿名试用页面读取精选场景、句子、固定 practice fixture、固定 variant fixture 或 TTS
- **THEN** 读取 helper MUST 使用公开内容边界
- **AND** MUST NOT 查询用户私有 progress、review、saved phrases、practice run 或 variant run 数据

#### Scenario: 精选场景不满足公开读取条件

- **WHEN** allowlist 中某个 slug 不存在、非公开或缺少必要公开数据
- **THEN** 系统 MUST 跳过该场景或展示受控空态
- **AND** 不得回退到用户态读取或绕过权限读取

#### Scenario: 匿名访客触发用户态或高成本能力

- **WHEN** 匿名访客尝试保存表达、加入复习、提交练习、提交变体、写 progress、导入、生成、实时 AI 解释或实时 TTS 生成
- **THEN** 系统 MUST 返回 `ANON_FEATURE_DISABLED` 或显示注册阻断
- **AND** 系统 MUST NOT 写入用户态业务表
- **AND** 系统 MUST NOT 触发上游 AI 或实时 TTS 生成
