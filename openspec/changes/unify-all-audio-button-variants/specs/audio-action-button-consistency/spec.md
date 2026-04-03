## MODIFIED Requirements

### Requirement: 音频动作按钮状态变化不得依赖可见文本
系统 MUST 允许音频动作按钮在 active、paused 或 loading 状态下继续表达状态变化，但这种表达不得依赖重新显示正文文字。

#### Scenario: 用户查看详情区播放按钮
- **WHEN** 用户查看句子详情、chunk 详情或例句卡片中的播放按钮
- **THEN** 这些按钮必须与正文和气泡里的播放按钮使用同一套状态图形语言
- **AND** `tts` 波纹图标不得因为画布过紧而在右侧出现裁切
