# anonymous-trial-mode Specification

## Purpose

定义免登录试用与分享灰度入口的稳定边界：访客可以查看公开场景列表与只读场景详情，体验预生成 TTS 播放；任何写入、生成、导入、练习、变体或实时 AI 能力都只能展示入口并提示注册，不得进入真实处理链路。

## Requirements

### Requirement: 匿名试用入口必须展示公开场景列表

系统 MUST 将 `/trial` 作为免登录试用的公开场景列表入口，而不是默认跳转到某个固定场景或 `/share/scene/[slug]`。

#### Scenario: 未登录访客访问匿名试用入口

- **WHEN** `ALLOW_ANONYMOUS_TRIAL=true`
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 查询精选公开场景 allowlist 中 `is_public=true` 的场景
- **AND** 页面 MUST 使用与主 `/scenes` 列表一致的筛选条、场景卡片和点击进入体验
- **AND** 用户 MUST 自己点击某个场景后进入 `/trial/scene/[slug]`
- **AND** 系统 MUST NOT 默认跳转到 `/share/scene/[slug]`
- **AND** 系统 MUST NOT 查询或展示任何用户私有学习数据

#### Scenario: 匿名试用关闭

- **WHEN** `ALLOW_ANONYMOUS_TRIAL` 未开启
- **AND** 未登录访客访问 `/trial`
- **THEN** 系统 MUST 返回受控登录或注册引导
- **AND** 不得继续加载匿名试用业务数据

### Requirement: 匿名场景详情必须复用主场景阅读体验

匿名场景详情 MUST 支持访客查看公开场景内容、句子气泡、翻译、相关短语和详情面板，并允许播放已预生成 TTS，但不得写入用户学习状态。

#### Scenario: 未登录访客进入匿名场景详情

- **WHEN** 未登录访客访问 `/trial/scene/[slug]` 或 `/share/scene/[slug]`
- **AND** 该 slug 属于精选公开场景且 `is_public=true`
- **THEN** 系统 MUST 展示与主 `/scene/[slug]` 阅读层一致的句子气泡、翻译入口、朗读入口和句子详情面板/弹层
- **AND** 系统 MUST 展示可公开的 chunk/detail 信息
- **AND** 系统 MAY 允许播放已预生成 TTS
- **AND** 系统 MUST NOT 写入 progress、review、practice run、variant run 或其他用户态学习数据

#### Scenario: TTS 音频未预生成

- **WHEN** 匿名详情页中的句子、短语或场景音频没有已生成 TTS
- **THEN** 系统 MUST 展示受控不可用状态或注册引导
- **AND** MUST NOT 在匿名模式下触发实时 TTS 生成

### Requirement: 匿名写入、生成、导入和 AI 能力必须只做注册阻断

匿名模式下，任何导入、生成、保存、提交、加入复习、练习、变体、实时 AI 解释或写学习状态的能力 MUST 被拒绝，并以注册引导作为用户可理解的反馈。页面 MAY 展示这些功能的入口外观，但触发后 MUST 只进入注册阻断。

#### Scenario: 匿名访客触发生成、导入、练习或变体能力

- **WHEN** 匿名访客点击导入场景、生成场景、生成练习、打开变体训练或其它需要生成/写入的入口
- **THEN** 页面 MUST 显示注册阻断弹窗
- **AND** 服务端 MUST 拒绝匿名请求
- **AND** 不得触发上游 AI、解析、TTS 生成、practice set、variant set 或其他高成本处理

#### Scenario: 匿名访客触发保存或复习能力

- **WHEN** 匿名访客尝试保存表达、加入复习、提交 review 或写入 progress
- **THEN** 页面 MUST 显示注册阻断弹窗
- **AND** 服务端 MUST 拒绝匿名请求
- **AND** 不得写入用户态业务表

#### Scenario: 匿名访客触发实时 AI 解释能力

- **WHEN** 匿名访客从试用页、分享页或直接请求 `/api/explain-selection` 触发 AI 解释
- **THEN** 默认配置下系统 MUST 返回 `ANON_FEATURE_DISABLED`
- **AND** 页面 MUST 提示注册解锁
- **AND** 不得调用外部模型

### Requirement: 匿名只读能力必须沿用匿名身份与 TTS 配额

扩展后的匿名试用 MUST 沿用现有匿名身份、匿名 session、IP 防绕过和 TTS 播放配额，不得因为新增 `/trial` 入口而新增匿名生成类配额。

#### Scenario: 匿名访客播放预生成 TTS

- **WHEN** 匿名访客播放已预生成的句子或短语 TTS
- **THEN** 系统 MUST 调用 `/api/anonymous/tts/play`
- **AND** 系统 MUST 只返回 Storage 已存在音频的签名 URL
- **AND** 系统 MUST 使用 `tts_play` 匿名配额
- **AND** 配额耗尽时 MUST 展示注册引导或受控配额提示

#### Scenario: 匿名访客尝试使用未允许的高成本能力

- **WHEN** 匿名访客尝试使用 AI 场景生成、练习生成、实时 AI 解释或实时 TTS 生成
- **THEN** 系统 MUST 按现有匿名高成本接口治理拒绝请求
- **AND** 不得为 `/trial` 单独放宽额度
