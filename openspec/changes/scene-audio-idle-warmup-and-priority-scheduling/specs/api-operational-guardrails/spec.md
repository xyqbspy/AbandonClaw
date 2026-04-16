## ADDED Requirements

### Requirement: Scene 音频预热优化必须保留最小观测入口
系统 MUST 为 scene sentence 和 scene full 音频预热优化保留最小观测入口，以便后续验证预热是否减少真实播放等待。

#### Scenario: 维护者验证 sentence 播放是否命中预热
- **WHEN** 维护者需要判断 sentence 播放是否受益于预热
- **THEN** 系统 MUST 能记录或回看最小 hit / miss 结果
- **AND** 这些记录不得要求本阶段引入完整埋点平台

#### Scenario: 维护者验证 scene full 播放准备态
- **WHEN** 维护者需要判断 scene full 播放是否已经提前准备
- **THEN** 系统 MUST 能记录或回看 ready / wait / fallback 结果
- **AND** 这些记录 MUST 控制在最小字段范围内
## ADDED Requirements

### Requirement: 音频播放观测事件必须复用现有客户端回看链路
系统 MUST 将 scene 音频播放的最小观测事件写入现有客户端业务事件记录能力，避免新增独立埋点平台。

#### Scenario: 音频播放事件被记录
- **WHEN** sentence 或 scene full 播放链路记录缓存命中、等待拉取或失败降级事件
- **THEN** 事件 MUST 可通过现有客户端业务事件回看入口查看
- **AND** 系统 MUST 继续使用本地最近事件记录能力
- **AND** 不得引入跨设备同步或正式 BI 平台
