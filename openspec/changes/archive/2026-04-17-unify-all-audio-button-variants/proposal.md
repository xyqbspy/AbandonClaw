## Why

上一轮已经开始统一公共播放按钮状态，但还存在两类问题没有收口：
- `tts` 状态图标的最外层波纹在右侧会被视觉裁切
- 句子详情 / chunk 详情仍保留独立的旧版播放按钮实现，没有完全接入统一状态组件

这会导致页面上仍然并存多套音频按钮样式，不符合“全站播放按钮统一”的目标。

## What Changes

- 调整共享 `tts` 状态图标的画布与波纹路径，避免右侧裁切。
- 将 `selection-detail-primitives` 中的句子详情 / chunk 详情播放按钮改为复用统一的 `AudioStateIcon`。
- 保持默认、播放中、暂停、加载中四种状态的项目色与图形语义一致。
- 更新相关测试与 `CHANGELOG.md`。

## Impact

- 受影响文件：
  - `src/components/audio/audio-state-icon.tsx`
  - `src/features/lesson/components/selection-detail-primitives.tsx`
  - 详情相关交互测试
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：是，统一详情区播放按钮视觉
- 是否影响测试基线或回归范围：是，需要回归详情区与例句朗读测试
