## MODIFIED Requirements

### Requirement: 音频动作按钮状态变化不得依赖可见文本
系统 MUST 允许音频动作按钮在 active、paused 或 loading 状态下继续表达状态变化，但这种表达不得依赖重新显示正文文字。

#### Scenario: 按钮处于播放中、暂停或加载中
- **WHEN** 某个音频动作按钮进入播放中、暂停或加载中状态
- **THEN** 按钮必须仍保持纯 icon 展示
- **AND** 默认、播放中、暂停三种状态必须具备可区分的图形差异
- **AND** 状态反馈必须通过 icon 样式、动画、项目常用语义色和可访问名称完成
