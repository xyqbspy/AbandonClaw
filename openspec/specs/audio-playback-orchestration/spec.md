## ADDED Requirements

### Requirement: Scene full 播放失败时必须给出受控降级
系统 MUST 在 `scene full` 音频播放失败时提供受控降级行为，至少保证用户得到明确反馈，并且不得让页面残留错误的循环播放状态。

#### Scenario: Scene full 获取或播放失败
- **WHEN** `scene full` 音频在生成、获取 URL 或播放阶段失败
- **THEN** 系统 MUST 清理当前 loop 状态并停止错误播放态
- **AND** 系统 MUST 给出明确的失败提示或降级入口

#### Scenario: scene full 失败后用户需要继续学习
- **WHEN** `scene full` 在生成、获取 URL 或播放阶段失败
- **THEN** 系统 MUST 清理当前 loop 状态并停止错误播放态
- **AND** 系统 MUST 给出明确失败提示
- **AND** 系统 MUST 提供至少一个可执行的替代 CTA，例如切回逐句播放或当前句跟读

### Requirement: 批量音频重生成必须采用有界并发
系统 MUST 对批量音频重生成采用有界并发策略，防止管理端批量操作对上游 TTS 或存储链路造成无边界压力。

#### Scenario: 管理端批量重生成 chunk 音频
- **WHEN** 维护者触发批量 chunk 音频重生成
- **THEN** 系统 MUST 使用明确的并发上限执行任务
- **AND** 必须记录失败项而不是在首个失败后直接吞掉上下文

### Requirement: TTS 上游异常必须留下可追踪记录
系统 MUST 对 TTS 上游连接失败、生成失败或异常响应留下可追踪记录，以便后续结合 requestId、入口场景和批量任务上下文排查。

#### Scenario: TTS 上游返回连接异常
- **WHEN** TTS 生成链路遇到上游连接错误或异常响应
- **THEN** 系统 MUST 记录异常上下文
- **AND** 记录中 MUST 包含足以关联入口请求或批量任务的最小信息

#### Scenario: 维护者复核音频失败原因
- **WHEN** 维护者查看一次 `scene full` 或句子 / chunk 播放失败的记录
- **THEN** 记录 MUST 至少包含失败类型、入口上下文和最小可追踪标识
- **AND** 不得只留下原始异常字符串而没有业务语义
