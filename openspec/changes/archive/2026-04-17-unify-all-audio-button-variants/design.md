## Current Flow

当前问题：
- `AudioStateIcon` 的 `tts` 波纹路径靠近右边界，图标在小尺寸按钮里容易显得被裁切
- `SelectionAudioIcon / SelectionAudioButton` 仍然自带旧版 `Volume2 + Loader2` 逻辑，没有接入公共状态图标

## Decision

设计决策 1：
- 扩大 `tts` 图标的水平留白，调整最外层波纹路径，避免最右侧被切掉

设计决策 2：
- `selection-detail-primitives` 直接复用 `AudioStateIcon`
- 详情页与 chunk 详情只保留一套音频状态视觉，不再并行维护旧图标

## Validation

验证方式：
- 新增 / 更新详情区交互测试，确保朗读入口仍可被语义查询
- 回归 `selection-detail-panel`、`selection-detail-sheet`、`example-sentence-cards`
- 执行乱码检查与 OpenSpec 校验
