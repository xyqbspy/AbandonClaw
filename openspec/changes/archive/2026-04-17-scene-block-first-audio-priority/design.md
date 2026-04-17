# Design: scene block-first audio priority

## Current Behavior

- `warmupLessonAudio()` 当前从 `getLessonSentences()` 取前几句预热。
- dialogue UI 的真实播放按钮调用 `playBlockTts(block)`，它会把 block 内多句合并成一段文本，并使用 `sentenceId = block-${block.id}` 调用现有 sentence 播放 API。
- 因此，`sentence-s1-*` 的预热不会命中 `block-blk-*` 的真实播放请求。
- scene full 播放仍走 `playSceneLoopAudio()`，生成失败时只提供“先逐句跟读”的受控提示。

## Decision

本次不新增 `block` TTS kind，而是继续复用现有 sentence TTS 通道承载 block 音频：

- `kind = sentence`
- `sentenceId = block-${block.id}`
- `text = block.tts || block.sentences[].tts/audioText/text join(" ")`
- `speaker = block.speaker || firstSentence.speaker`

这样可以复用现有：

- `/api/tts` 协议
- Storage path 规则
- 浏览器 Cache Storage
- scheduler 去重、并发和优先级
- hit/miss observability

## Priority Rules

1. 当前用户点击播放的 block 仍直接走播放 API，不排队等待后台 warmup。
2. scene detail 首屏预热优先入队前几个 playable block。
3. scene full 保留后台准备，但不得抢占当前播放。
4. idle warmup 小批量补齐后续 playable block。
5. 播放某个 block 或该 block 内句子后，提权后续 block。
6. sentence 只在明确单句点击、chunk detail、fallback CTA 等场景按需请求。

## Implementation Notes

- `audio-warmup.ts` 增加 block speak text helper，并把 lesson warmup 候选从 sentences 切到 playable blocks。
- `resource-actions.ts` 保留现有 option 名称 `sentenceLimit`，但其在 scene detail warmup 中表示“可播放音频单元上限”，避免一次性扩大调用面。
- `LessonReader` 增加可选 `onBlockPlayback` 回调，block 播放时触发后续 block 提权。
- 旧的 `sentence_audio_play_*` 事件继续记录，因为底层 TTS kind 未变；payload 中 `sentenceId` 可能是 `block-*`。

## Semantic Guardrails

- `block-*` 只是兼容现有 sentence TTS 通道的 transport id，不代表它是真实 sentence。
- observability payload 必须带 `audioUnit = block | sentence`，让回看时可以区分 block 音频和真实单句音频。
- 浏览器 TTS cache 调试面板必须把 `sentence:...:sentence-block-*` 展示为 `block` 类型，避免把 block 缓存误判为 sentence 缓存。
- 后续如果引入正式 `block` TTS kind，应能从 `audioUnit=block` 与 `block-*` 兼容层平滑迁移，不应被当前命名卡住。

统一产品口径：

- scene detail Primary：block。
- scene detail Secondary：scene full。
- scene detail Fallback：sentence。
- chunk / phrase 工作台 Primary：chunk / phrase audio。
- sentence 与 scene block 不互相替代。

## Rollback

如果 block 音频体积或生成耗时明显不可接受，可以把 `warmupLessonAudio()` 的候选源切回 `getLessonSentences()`，播放 API 与服务端协议不需要回滚。
