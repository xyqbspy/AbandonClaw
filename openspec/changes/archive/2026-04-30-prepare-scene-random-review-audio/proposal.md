## 为什么

scenes 列表的复习播放现在本质是“一个场景播完后，页面 JS 再切到下一个场景”。这种模式即使做了 scene detail cache 和 TTS Cache Storage，仍然会在后台、锁屏或移动端省电策略下暴露不稳定：当前音频能继续播，但下一段是否能由后台 JS 顺利切换并调用 `play()` 不可靠。

用户目标是后台连续播放。更合适的方向是：用户点击播放后，优先把少量合格场景组装成一个可循环播放的 review pack 长音频，让浏览器原生音频管线持续播放同一个资源，而不是依赖每段结束后的 JS 切歌。

## 改什么

- scenes 复习播放读取场景详情时继续优先消费本地 scene cache。
- 播放启动后，优先把当前起点后的少量合格场景组装成单个 scene review pack 音频，并以单个 loop 音频播放。
- review pack 组装时单个候选场景详情加载失败不拖垮整包，只要仍有可播放片段就继续播放。
- review pack 生成或播放失败时，回退到逐场景 scene full 队列播放。
- 回退队列继续提前准备当前队列前几个候选场景的 scene detail 与 scene full 音频。
- 不改变 `/api/tts` 协议，不改变 scene 学习状态、完成判定或 today 推荐。

## 稳定性收口

### 本轮收口

- scenes 复习播放绕过 scene cache 的重复语义。
- scene full 队列播放缺少最小准备队列导致的后台切歌联网风险。
- 后台连续播放依赖 JS 在每段结束后切下一段的核心不稳定点。
- review pack 组包阶段单个坏候选拖垮整包、回退阶段重复读取已加载详情的问题。
- 音频文档中对 scenes 复习播放缓存与后台播放边界的缺口。

### 明确不收

- 不做完整离线 / PWA。
- 不承诺所有浏览器锁屏或后台状态下都允许启动新音频。
- 不把 scene full 自动降级为逐句串播。
- 不扩大浏览器 TTS cache 容量策略。
- 不引入 ffmpeg 或新的音频拼接服务；MVP 复用现有 scene_full TTS 通道。

剩余风险记录在 `docs/system-design/audio-tts-pipeline.md`。

## 影响范围

- `src/app/(app)/scenes/use-scene-random-review-playback.ts`
- `src/app/(app)/scenes/page.interaction.test.tsx`
- `docs/system-design/audio-tts-pipeline.md`
- `openspec/specs/audio-playback-orchestration/spec.md`
