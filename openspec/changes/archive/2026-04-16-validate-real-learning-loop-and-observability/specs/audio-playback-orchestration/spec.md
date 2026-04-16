## MODIFIED Requirements

### Requirement: TTS 上游异常必须留下可追踪记录
系统 MUST 允许维护者在不依赖浏览器 console 的前提下，回看最近一次真实使用里产生的音频失败摘要，至少覆盖 `scene full` 失败与替代 CTA 点击结果。

#### Scenario: 维护者复核最近一次 scene full 失败
- **WHEN** 维护者打开本地可回看面板
- **THEN** 系统 MUST 展示最近一次音频失败摘要
- **AND** 若用户点击了替代 CTA，也 MUST 能看到对应动作记录
