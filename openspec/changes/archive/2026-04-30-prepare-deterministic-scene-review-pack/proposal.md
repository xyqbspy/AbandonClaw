# 变更提案：固定顺序预准备 scenes review pack

## Status
draft

## Why
上一轮已经把 scenes 复习播放主路径改成单个 `scene review pack` loop 音频，解决了“每个场景结束后依赖后台 JS 切下一段”的主要不稳定点。但当前仍保留随机起点：用户点击后才按随机起点组包，导致页面提前准备的资源不一定就是用户马上要播放的资源。

如果目标是尽量彻底实现后台连续播放，随机不是核心能力，稳定命中同一个可循环音频包才是核心。更优方案是把入口收敛为固定顺序循环播放：页面加载出合格场景后，就按列表顺序准备一个有上限的 review pack；用户点击时优先播放同一个已准备资源。

## What Changes
- scenes 列表复习入口从“随机播放”收敛为“循环播放”语义。
- 合格场景按当前列表顺序取前 N 个组成 deterministic review pack。
- 页面加载后在后台预准备这个 pack：优先读 scene detail cache，必要时请求详情，并调用现有 scene full TTS 通道预取 pack 音频。
- 用户点击播放时使用同一套 pack payload，最大化浏览器 Cache Storage / 内存 URL 命中。
- pack 不可用时保留逐场景回退队列。

## Stability Closure
### In This Round
- 收口随机起点导致提前缓存难以命中的问题。
- 收口点击后才组包导致首次播放更容易依赖联网的问题。
- 收口 UI 文案仍称“随机播放”但主目标已经变成后台稳定循环播放的问题。

### Not In This Round
- 不做完整离线 / PWA。
- 不引入 Media Session。
- 不新增服务端专用音频包 API。
- 不引入 ffmpeg 或新的音频拼接服务。
- 不承诺所有浏览器锁屏或后台状态下都允许启动新音频。

### Risk Tracking
- 延后原因：这些能力会改变平台级缓存、系统媒体控制或服务端音频生成边界，需要单独评估。
- 风险记录位置：本 change、`docs/system-design/audio-tts-pipeline.md` 和最终说明。

## Scope
### In Scope
- scenes 列表复习播放入口语义。
- review pack 固定顺序组包与后台预准备。
- 相关测试和音频文档同步。

### Out of Scope
- scene detail 单场景播放。
- `/api/tts` 协议。
- 学习状态、完成判定、today 推荐和 review 写回。

## Impact
影响的规范：audio-playback-orchestration。
影响的模块：`src/app/(app)/scenes`、音频 TTS 文档、交互测试。
是否涉及 API 变更：否。
是否涉及前端交互变化：是，入口文案从随机播放调整为循环播放。
是否影响缓存策略：是，新增列表页 review pack 后台预准备。
是否影响测试基线：是，更新 scenes interaction 测试。
兼容性：向后兼容；回退队列保留。
风险点：后台预准备可能增加一次 TTS 请求，因此 pack 数量和候选场景数必须有上限。
