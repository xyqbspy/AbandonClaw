# anonymous-trial-mode Specification

## Purpose
TBD - created by archiving change expand-anonymous-trial-experience. Update Purpose after archive.
## Requirements
### Requirement: 匿名试用入口必须复用分享场景页

系统 MUST 将匿名试用入口收敛为分享场景页的入口别名，让未登录访客在不进入主应用登录态路由的前提下体验默认公开场景，并避免维护第二套试用列表或详情 UI。

#### Scenario: 未登录访客访问匿名试用入口

- **WHEN** `ALLOW_ANONYMOUS_TRIAL=true`
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 跳转到默认精选公开场景的 `/share/scene/[slug]`
- **AND** 页面 MUST 复用 `/share/scene/[slug]` 的匿名预览 UI
- **AND** 系统 MUST NOT 渲染独立 `/trial` 场景列表
- **AND** 系统 MUST NOT 查询或展示任何用户私有学习数据

#### Scenario: 匿名试用关闭

- **WHEN** `ALLOW_ANONYMOUS_TRIAL` 未开启
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 返回受控登录或注册引导
- **AND** 不得继续加载匿名试用业务数据

### Requirement: 匿名场景详情必须以只读学习能力为主

匿名场景详情 MUST 支持访客查看公开场景内容、句子和详情信息，并允许播放已生成 TTS，但不得写入用户学习状态。

#### Scenario: 未登录访客进入匿名场景详情

- **WHEN** 未登录访客访问 `/share/scene/[slug]` 或从 `/trial/scene/[slug]` 跳转到同 slug 分享页
- **AND** 该 slug 属于精选公开场景
- **THEN** 系统 MUST 展示场景正文、句子列表和可公开的 detail/chunk 信息
- **AND** 系统 MAY 允许播放已生成 TTS
- **AND** 系统 MUST NOT 写入 progress、review、practice run 或其他用户态学习数据

#### Scenario: TTS 音频未预生成

- **WHEN** 匿名详情页中的句子没有已生成 TTS
- **THEN** 系统 MUST 展示受控空态或注册引导
- **AND** MUST NOT 在匿名模式下触发实时 TTS 生成

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
