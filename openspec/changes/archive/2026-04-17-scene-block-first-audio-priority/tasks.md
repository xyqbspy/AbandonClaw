# Tasks

## 1. Block-first warmup
- [x] 1.1 将 `warmupLessonAudio()` 的主候选从 sentence 切换为 playable block
- [x] 1.2 将 idle 增量预热切换为后续 playable block
- [x] 1.3 保留 scene full 预热，并确保不改 `/api/tts` 协议

## 2. Playback bump
- [x] 2.1 block 播放时触发后续 block 提权
- [x] 2.2 明确单句播放仍按需可用，但不作为主预热对象

## 3. Tests and docs
- [x] 3.1 更新 audio warmup / scene playback 相关测试
- [x] 3.2 更新音频链路文档和 dev-log
- [x] 3.3 运行最小回归与 OpenSpec 校验
- [x] 3.4 补充 block 兼容层语义护栏，确保 observability / cache debug 可区分 block 与真实 sentence
