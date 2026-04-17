## Current Flow

当前公共音频按钮存在两套状态表达：
- `TtsActionButton`：默认 `Volume2`，active 仅靠 `animate-pulse text-primary`
- `LoopActionButton`：根据 `icon` 在 `Play` 和 `Volume2` 之间切换，active 规则与 `TtsActionButton` 不一致

当前问题：
- 默认、播放中和暂停缺少统一视觉
- 颜色主要依赖局部调用处 className，公共层没有稳定基线
- 项目里目前没有统一的暂停视觉能力

## Decision

设计决策 1：
- 新增共享 `AudioStateIcon`，统一承接音频按钮的图标状态

设计决策 2：
- 为公共按钮显式支持 `idle / playing / paused / loading`
- 现有页面默认继续消费 `idle / playing / loading`
- `paused` 作为公共能力落地，便于后续真实暂停语义接入

设计决策 3：
- 颜色统一为项目常用语义：
  - 默认：`muted-foreground`
  - 播放中 / 暂停 / 加载中：`primary`
  - hover：`foreground`

## Validation

验证方式：
- 新增公共按钮测试，验证默认、播放中、暂停和加载中状态切换
- 回归 `lesson-reader` 与 `sentence-block` 的朗读交互测试
