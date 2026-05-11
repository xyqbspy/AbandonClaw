## Purpose
定义 API 与关键业务链路的最小可观测、失败回看和运行护栏要求，帮助维护者在不建设完整 BI 平台的前提下排查真实使用问题。

## Requirements

### Requirement: 受治理接口必须具备统一请求追踪标识
系统 MUST 为受保护接口和高风险接口生成并透传统一的请求追踪标识，使中间件、route、handler、service 与错误响应能够引用同一标识定位单次请求。

#### Scenario: 请求进入受治理接口
- **WHEN** 客户端请求受保护接口或高风险接口
- **THEN** 系统 MUST 为该请求生成或继承唯一的 `requestId`
- **AND** 后续错误响应与服务端日志 MUST 能引用同一个 `requestId`

### Requirement: 关键学习动作必须具备最小业务级可观测性
系统 MUST 让维护者能够回看最近记录的关键学习动作与失败摘要，而不是只能依赖控制台瞬时输出。

#### Scenario: 维护者查看最近业务事件
- **WHEN** 维护者打开可回看入口
- **THEN** 系统 MUST 展示最近关键业务事件与失败摘要
- **AND** 这些记录 MUST 控制在最小字段范围内

### Requirement: 音频失败 observability 必须支持最小排障
系统 MUST 为 scene full 失败提供足以回看的最小结构化事件，不要求建设完整 BI 平台。

#### Scenario: scene full fallback 被记录
- **WHEN** scene full 播放进入 fallback
- **THEN** `scene_full_play_fallback` MUST 包含 `failureReason`
- **AND** payload SHOULD 包含 `sceneFullKey`、`readiness`、`segmentCount` 与 `cooldownMs`

#### Scenario: scene full 冷却被命中
- **WHEN** 同一 scene full 在冷却窗口内被再次请求
- **THEN** 系统 MUST 记录冷却命中事件
- **AND** payload MUST 包含 `failureReason = cooling_down`
- **AND** payload SHOULD 包含剩余冷却时间

#### Scenario: 页面级失败摘要被记录
- **WHEN** lesson reader 捕获 scene full 播放失败
- **THEN** `tts_scene_loop_failed` SHOULD 包含 `failureReason`
- **AND** payload SHOULD 包含 `fallbackBlockId` 或 `fallbackSentenceId`

### Requirement: 高成本接口必须具备统一限流基线
任何会触发 AI 生成、重解析、批量音频处理或其他高成本服务端计算的接口 MUST 在入口层应用统一限流策略，并在超限时返回受控错误响应，而不是继续进入高成本处理。

#### Scenario: 用户在限流窗口内正常请求高成本接口
- **WHEN** 已登录用户在允许窗口内调用高成本接口
- **THEN** 系统 MUST 允许请求进入后续业务处理
- **AND** 限流判断 MUST 不改变原有业务成功路径

#### Scenario: 用户超过高成本接口限流阈值
- **WHEN** 同一用户或同一后备标识在窗口期内超过高成本接口阈值
- **THEN** 系统 MUST 直接返回受控的限流错误响应
- **AND** 系统 MUST 不再继续触发模型调用、解析或音频生成

#### Scenario: 维护者准备确认高成本接口可上线
- **WHEN** 维护者完成高成本接口的服务端治理改动并准备进入上线前检查
- **THEN** 系统 MUST 通过真实 HTTP 入口执行最小基线压测
- **AND** 验证结果 MUST 记录至少一组延迟与状态分布结果

### Requirement: 外部模型调用必须具备最小失败保护
所有直接面向外部模型供应商的服务端调用 MUST 提供最小失败保护，包括可控超时、统一错误收敛与空响应防御，以避免慢上游或异常上游无限占用接口处理时间。

#### Scenario: 模型供应商长时间无响应
- **WHEN** 外部模型调用超过系统配置的超时阈值
- **THEN** 系统 MUST 主动终止该调用并返回可处理的失败结果
- **AND** 不得无限等待直到上游自行断开

#### Scenario: 模型供应商返回异常或空内容
- **WHEN** 外部模型接口返回非成功状态或空响应体
- **THEN** 系统 MUST 将其收敛为受控错误
- **AND** 不得把未收敛的上游异常直接扩散成不透明的接口行为

### Requirement: 限流与追踪能力必须可独立接入接口入口
接口治理能力 MUST 以公共 helper、公共入口约束或统一检查清单的形式提供，使 route/handler 能按风险分级逐步接入 requestId、限流、来源校验与相关保护能力，而不是要求一次性重构全部接口。

#### Scenario: 新的高风险接口接入治理能力
- **WHEN** 维护者为新的高风险接口补充治理保护
- **THEN** 系统 MUST 支持在该接口入口独立接入 `requestId`、限流或相关保护能力
- **AND** 不得要求先重写整个业务 service 才能获得基础治理能力

#### Scenario: 维护者准备部署已接入治理能力的接口
- **WHEN** 维护者准备将已接入 `requestId`、限流、Origin 校验和统一参数校验的接口部署到目标环境
- **THEN** 系统 MUST 提供统一的上线前检查清单
- **AND** 清单 MUST 明确 Redis 配置、Origin 配置、白名单入口和验证命令

#### Scenario: 真实 HTTP baseline 使用了不匹配的来源域
- **WHEN** 维护者在真实 HTTP baseline 中传入的 `Origin` 与目标环境实际允许域不一致
- **THEN** 受保护写接口 MUST 拒绝请求
- **AND** 维护者 MUST 在记录中明确这是来源校验命中，而不是业务处理失败

### Requirement: 高成本接口必须支持 user + IP 双维度限流
公网小范围开放前，所有会触发模型、TTS、练习生成或重解析成本的接口 MUST 同时按用户和客户端 IP 执行限流。

#### Scenario: 同一用户超过限流阈值
- **WHEN** 同一登录用户在窗口期内超过高成本接口 user 阈值
- **THEN** 系统 MUST 返回 429
- **AND** 响应 MUST 带有 `requestId`
- **AND** 系统 MUST 不再继续触发模型、TTS 或其他高成本处理

#### Scenario: 同一 IP 多账号超过限流阈值
- **WHEN** 同一客户端 IP 在窗口期内通过多个账号超过高成本接口 IP 阈值
- **THEN** 系统 MUST 返回 429
- **AND** 响应 MUST 带有 `requestId`
- **AND** 系统 MUST 不再继续触发模型、TTS 或其他高成本处理

#### Scenario: 管理员检查限流后端
- **WHEN** 管理员访问运行状态入口
- **THEN** 系统 MUST 暴露当前限流后端是 `upstash` 还是 `memory`
- **AND** 公网开放 baseline MUST 记录当前后端状态

### Requirement: 公网开放真实 HTTP baseline 必须覆盖注册与高成本防护矩阵
当系统准备进入公网小范围开放时，维护者 MUST 通过真实 HTTP 入口执行一组固定的基线场景，而不能只保留单接口压测或单元测试结果。

#### Scenario: 维护者执行公网开放 baseline
- **WHEN** 维护者为注册模式、邀请码、邮箱验证、限流、quota、账号状态或后台状态入口做公开前验证
- **THEN** 系统 MUST 提供统一的真实 HTTP baseline 执行入口
- **AND** baseline MUST 至少覆盖注册模式、邮箱未验证、Origin 拒绝、高成本接口正常调用、user 限流、IP 限流、daily quota、受限账号和后台状态场景

#### Scenario: baseline 结果被记录
- **WHEN** 维护者完成一轮公网开放 baseline
- **THEN** 系统 MUST 输出可留存的结构化结果
- **AND** 结果 MUST 包含请求目标、关键状态码、状态分布、异常摘要以及当前限流后端或等价运行状态

#### Scenario: baseline 缺少必要环境参数
- **WHEN** 维护者执行某个公网开放 baseline 场景时缺少 cookie、邀请码、Origin 或其他必要参数
- **THEN** 系统 MUST 将该场景标记为 blocked 或 skipped
- **AND** 不得静默跳过并宣称该场景已验证

### Requirement: 注册频控必须纳入统一运行护栏
系统 MUST 将注册入口 IP 频控纳入统一限流与失败收敛体系，使维护者可以用与高成本接口一致的方式验证、留证和排障。

#### Scenario: 注册入口命中频控
- **WHEN** 同一 IP 在注册窗口内超过阈值并请求 `/api/auth/signup`
- **THEN** 系统 MUST 返回受控 429
- **AND** 响应 MUST 带有 `requestId`
- **AND** 不得继续进入后续注册处理

#### Scenario: 维护者验证注册频控
- **WHEN** 维护者执行公网开放真实 HTTP baseline
- **THEN** baseline MUST 覆盖至少一个“同一 IP 注册命中 429”的场景
- **AND** 结果 MUST 与当前限流后端状态一起留证
