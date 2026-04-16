## MODIFIED Requirements

### Requirement: Scene full 播放失败时必须给出受控降级
系统 MUST 在 `scene full` 音频播放失败时，不仅给出受控提示，还要提供明确的替代动作入口，使用户无需自行重新寻找逐句播放路径。

#### Scenario: scene full 失败后用户需要继续学习
- **WHEN** `scene full` 在生成、获取 URL 或播放阶段失败
- **THEN** 系统 MUST 清理当前 loop 状态并停止错误播放态
- **AND** 系统 MUST 给出明确失败提示
- **AND** 系统 MUST 提供至少一个可执行的替代 CTA，例如切回逐句播放或当前句跟读

### Requirement: TTS 上游异常必须留下可追踪记录
系统 MUST 允许音频链路把失败记录提升为可消费的业务摘要，至少让维护者能区分“连接异常”“生成异常”“播放异常”和“用户取消或切换目标”。

#### Scenario: 维护者复核音频失败原因
- **WHEN** 维护者查看一次 `scene full` 或句子 / chunk 播放失败的记录
- **THEN** 记录 MUST 至少包含失败类型、入口上下文和最小可追踪标识
- **AND** 不得只留下原始异常字符串而没有业务语义
