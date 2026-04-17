# 任务清单

## Status
complete

## Step 1: Warmup registry
- [x] 1.1 新增 `src/lib/utils/tts-warmup-registry.ts`
- [x] 1.2 支持 `markAudioWarmed()`、`getWarmupInfo()`、TTL prune、容量裁剪和来源优先级覆盖
- [x] 1.3 补 registry 单元测试，覆盖 initial / idle / playback、过期和覆盖规则

## Step 2: 统一 cache key 复用
- [x] 2.1 从 `tts-api.ts` 导出 sentence / scene full cache key builder，避免重复实现
- [x] 2.2 确认 block 复用 sentence TTS key 的路径仍保持一致
- [x] 2.3 补 key 相关测试或扩展现有 TTS 测试，确保 warmup 标记和播放读取使用同一 key

## Step 3: 接入 warmup 标记
- [x] 3.1 initial：首屏 lesson 音频预热标记 block / chunk / scene full
- [x] 3.2 idle：scene idle 后续 block 入队时标记 `idle`
- [x] 3.3 playback：播放驱动提权后续 block / scene full 时标记 `playback`
- [x] 3.4 补 `audio-warmup` / scheduler 相关测试，确认来源字段正确

## Step 4: 扩展播放事件 payload
- [x] 4.1 `playSentenceAudio()` 事件增加 `wasWarmed` / `warmupSource`
- [x] 4.2 block 事件继续带 `audioUnit = block`
- [x] 4.3 `playChunkAudio()` 如记录播放事件，则带 `audioUnit = chunk` 和 warmup 字段
- [x] 4.4 `playSceneLoopAudio()` ready / wait / cooling_down / fallback 事件增加 `audioUnit = scene_full` 和 warmup 字段
- [x] 4.5 补 `tts-api.test.ts` / `tts-api.scene-loop.test.ts`，覆盖 warm 与 cold 事件

## Step 5: Admin observability summary
- [x] 5.1 新增本地 summary 计算 helper，基于 `ClientEventRecord[]` 输出 block / scene full warmup effectiveness
- [x] 5.2 在 `ClientEventsPanel` 顶部展示精简 summary 卡片
- [x] 5.3 支持按来源 `initial` / `idle` / `playback` 拆分最小指标
- [x] 5.4 补 helper 和 `ClientEventsPanel` 测试

## Step 6: 文档与验收
- [x] 6.1 更新 `docs/system-design/audio-tts-pipeline.md`，补充 warmup registry、事件字段和 summary 口径
- [x] 6.2 更新 `docs/dev/dev-log.md`
- [x] 6.3 不更新正式 `CHANGELOG.md`，按项目规则留待合并 main 后处理
- [x] 6.4 跑最小回归：`node --import tsx --test src/lib/utils/tts-warmup-registry.test.ts src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/utils/audio-warmup.test.ts src/lib/utils/scene-audio-warmup-scheduler.test.ts src/lib/utils/client-events.test.ts`
- [x] 6.5 若改到 admin 面板，再跑：`node --import tsx --import ./src/test/setup-dom.ts --test src/components/admin/client-events-panel.test.tsx`
