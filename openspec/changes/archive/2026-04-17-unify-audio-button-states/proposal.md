## Why

当前项目中的播放按钮状态表现并不统一：`TtsActionButton` 和 `LoopActionButton` 分别维护自己的 icon 与激活样式，默认态、播放中和暂停态缺少一致的视觉语言。用户希望参考 `newApphtml/palyerIcon.html`，把“播放 / 播放中 / 暂停”几种状态统一起来，并改成项目内更常见的主色与中性色。

## What Changes

- 为公共音频按钮补充统一的状态图标能力，覆盖默认、播放中、暂停和加载中。
- `TtsActionButton` 与 `LoopActionButton` 改为共用统一的状态视觉规则。
- 默认态、播放中和暂停态改为项目常用色，而不再依赖零散的局部样式。
- 补充公共音频按钮测试，并验证现有朗读入口未被破坏。

## Impact

- 受影响文件：
  - `src/components/audio/tts-action-button.tsx`
  - `src/components/audio/loop-action-button.tsx`
  - `src/components/audio/audio-state-icon.tsx`
  - 音频按钮相关测试
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：是，统一播放按钮视觉状态
- 是否影响测试基线或回归范围：是，需要补充公共按钮测试并回归已有朗读入口
