# Design: fix-bubble-loop-button-surface

## Context

仓库已经通过 `audio-action-button-consistency` 规范统一了音频按钮组件边界，但当前仍有两个尾差：

1. `lesson-reader.tsx` 和 `lesson-reader-dialogue-content.tsx` 中循环播放按钮仍残留不同的尺寸与图标规格
2. `AudioStateIcon` 的 `play` 家族播放中态只有轻微脉冲，缺少和循环播放语义匹配的扩散感

## Decision

### 1. 循环按钮继续走统一 ghost surface

- 阅读器与对话气泡里的循环按钮都收口为 `size-9`
- 保持透明表面，不引入独立白底或额外描边
- 图标统一为 `size-4`，避免移动端继续使用更小一档的 `3.5`

### 2. 播放中图标改成显式扩散反馈

- `AudioStateIcon` 的 `play` 家族在 `playing` 态下渲染单独的 SVG
- 视觉元素包含：
  - 三角播放主体
  - 三层扩散圆环
  - 三道向外扩散的声波弧线
- 环和弧线分别走独立 keyframes，让低位接近背景、高位明显抬亮

### 3. 测试只锁关键语义，不锁死实现细节

- `loop-action-button.test.tsx` 只校验播放态存在至少 6 个 `data-audio-wave`
- 不校验具体路径或动画类名，避免后续微调动效时测试过脆

## Non-Goals

- 不改动 TTS 播放控制逻辑
- 不新增新的按钮变体
- 不调整音频请求或播放状态机
