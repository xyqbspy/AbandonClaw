# 变更提案：增加场景随机复习播放

## Status
approved

## Why
用户希望在 `scenes` 列表页直接进入被动听力复习：从已学到一定程度的场景中随机开始播放完整场景音频，并在播放完后自动按列表顺序循环。

当前 `scenes` 列表已有 `progressPercent`，可以判断哪些场景适合进入复习播放；但现有 scene full 播放能力主要面向单个场景详情页的循环播放，还没有跨场景播放队列语义。

## What Changes
- 在 `scenes` 列表页顶部新增一个小型随机复习播放入口。
- 仅将 `progressPercent >= 60` 的场景纳入播放队列。
- 点击入口后随机选择一个符合条件的场景作为起点，之后按当前列表顺序播放并循环。
- 播放每个场景前按需获取场景详情，复用现有 scene full TTS 音频链路。
- 播放失败或场景无可播放内容时跳过当前场景并继续尝试下一个符合条件的场景。

## Stability Closure
### In This Round
- 明确 `scenes` 列表页随机复习播放的资格门槛为 `progressPercent >= 60`。
- 将 scene full 的“单场景 loop”与“跨场景 playlist once playback”语义分开，避免误用 `audio.loop = true`。
- 补最小交互测试，锁定入口资格、无可播状态和播放队列启动行为。
- 同步更新 scene 入口链路文档和 TTS 播放链路文档。

### Not In This Round
- 不做后台/锁屏播放控制：当前项目没有统一后台播放器，本轮只覆盖页面内播放。
- 不做播放列表编辑：本轮队列完全由当前列表顺序和进度门槛派生。
- 不批量预生成所有 scene full 音频：避免一键触发大量 TTS 生成。
- 不把 scene full 失败自动降级为逐句串播：现有音频策略刻意保留该边界。

### Risk Tracking
- 后续若要做后台播放、播放列表编辑或逐句降级，应单独走新的 OpenSpec。
- 本轮剩余风险记录在 `docs/system-design/audio-tts-pipeline.md` 的播放链路说明中。

## Scope
### In Scope
- `scenes` 页面顶部播放入口。
- 前端播放队列状态与停止能力。
- 按需获取场景详情并组装 scene full segments。
- TTS 工具层新增 scene full 单次播放能力。
- 最小测试与文档同步。

### Out of Scope
- 新增数据库字段或改变学习进度计算。
- 改变 scene detail 现有完整场景循环播放行为。
- 新增服务端批量播放接口。
- 更新正式 `CHANGELOG.md`。

## Impact
影响的规范：新增 `scene-random-review-playback` 能力。

影响的模块：`scenes` 页面、场景详情 API 消费、TTS 播放工具、音频链路文档。

是否涉及 API 变更：否，优先复用现有详情 API 与 `/api/tts`。

是否涉及前端交互变化：是。

是否影响缓存策略：不改变缓存策略，仅复用现有 scene detail 与 TTS 缓存。

是否影响测试基线：是，新增页面交互和 TTS 单次播放测试。

兼容性：向后兼容。

风险点：跨场景自动播放受浏览器播放策略、scene full 生成失败和详情拉取失败影响，需要可停止、可跳过和受控提示。
