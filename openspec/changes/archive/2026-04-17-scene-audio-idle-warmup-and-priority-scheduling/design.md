# Design: scene audio idle warmup and priority scheduling

## Current Implementation

- `src/lib/utils/audio-warmup.ts` 当前直接调用 `prefetchSentenceAudio()` / `prefetchSceneFullAudio()`，只覆盖固定前几句和可选 scene full。
- `src/lib/utils/resource-actions.ts` 当前负责 idle 调度和弱网下不预热 scene full。
- `src/lib/utils/tts-api.ts` 已有 `ensureSentenceAudio()` / `ensureSceneFullAudio()`，并在底层处理 URL 缓存、Cache Storage、in-flight 去重和真实 `/api/tts` 请求。
- `useLessonReaderPlayback()` 当前在 active sentence 变化时调 `scheduleLessonAudioWarmup()`，外部播放仍走 `playSentenceAudio()` 和 `playSceneLoopAudio()`。

## Step 1 Decision

第一步只新增浏览器侧 scene 音频预热任务模型，并把现有首屏预热接到该模型上。

本步不做：

- 完整空闲增量调度循环
- 页面 hidden / save-data / 高频交互策略
- 播放驱动提权接入
- 新增业务 observability 事件
- 修改服务端 TTS 协议

## Task Model

任务字段：

- `kind`: `sentence` / `scene_full`
- `status`: `queued` / `loading` / `loaded` / `failed`
- `priority`: `immediate` / `next-up` / `idle-warm` / `background`
- `source`: `initial` / `idle` / `playback` / `user-click`
- `key`: 基于现有 TTS key helper 构造，保证同一资源稳定去重

优先级顺序：

1. `immediate`
2. `next-up`
3. `idle-warm`
4. `background`

## Integration

- 新增 `src/lib/utils/scene-audio-warmup-scheduler.ts`。
- `warmupLessonAudio()` 不再直接调用 sentence / scene full 的 `prefetch*`，而是通过 scheduler 入队。
- chunk 预热暂时保持原逻辑，不纳入本次 scene 调度器。
- scheduler 内部调用 `ensureSentenceAudio()` / `ensureSceneFullAudio()`，以便获得成功和失败状态。

## Step 2 Decision

第二步只在 scene detail 页面接入空闲增量预热，不扩展到 chunks、review、today continue 等其他入口。

启动条件：

- scene detail hook 已拿到当前展示 lesson。
- 首屏 `scheduleLessonAudioWarmup()` 被安排后，再延迟启动增量预热。
- 增量预热从首屏句子之后开始，起点由 scene detail 当前首屏 `sentenceLimit` 推导，避免与首屏预热范围硬编码错位。
- 默认每轮只补 2 句；batch size、启动延迟、重试间隔、交互安静窗口和最大轮数集中在 `resource-actions.ts` 的 scene idle warmup 常量中，后续可按真实体验调参。

暂停 / 降级条件：

- 页面 `document.visibilityState === "hidden"`。
- `navigator.connection.saveData` 开启，或 `effectiveType` 为 `2g` / `slow-2g`。
- 用户近期存在滚动、滚轮、触摸、指针或键盘交互。
- 当前 TTS 播放状态处于 `loading`，表示存在用户感知的立即播放请求；普通 `playing` 状态不会暂停低优先级补齐。

本步不做：

- 播放第 N 句后的 N+1 ~ N+3 动态提权。
- sentence / scene full 的 hit / miss / wait / fallback 事件。
- 服务端 TTS 协议或播放 API 外部调用方式调整。

## Step 3 Decision

第三步只在 scene detail 页面接入播放驱动提权，不扩展到 chunks、review 或其他音频域。

提权规则：

- 用户播放第 N 句 sentence 时，系统通过现有 scheduler 将 N+1、N+2、N+3 入队或提升到 `next-up`，`source = playback`。
- 如果目标任务已经 `loaded`，scheduler 只返回已有 key，不重复请求。
- 如果目标任务已经 `queued` 或 `loading`，scheduler 只提升优先级，不新建第二套任务。
- 当前点击播放资源继续走现有播放 API，不进入后台队列等待，因此始终高于 idle warmup。
- 当用户连续播放相邻句子达到 2 次时，允许把 scene full 提升到 `next-up`。
- scene full 提权在后续 sentence 提权之后执行，避免压制下一句播放体验。

接入方式：

- `audio-warmup.ts` 提供 `promoteLessonPlaybackAudioWarmups()`，复用现有 `enqueueSceneSentenceWarmup()` / `enqueueSceneFullWarmup()`。
- `LessonReader` / `useLessonReaderPlayback` 只新增可选 `onSentencePlayback` 回调，不直接依赖调度器。
- scene detail 页面通过 `useSceneDetailPlayback()` 生成回调并传给 base / variant study 视图，保证仅在 scene detail 内生效。

本步不做：

- sentence / scene full 的 hit / miss / wait / fallback 事件。
- 修改 `playSentenceAudio()` / `playSceneLoopAudio()` 的外部调用方式。
- 新建第二套预热队列。

## Step 4 Decision

第四步只补最小 observability 事件，复用现有 `client-events.ts` 本地事件记录与 `/admin/observability` 回看面板。

事件定义：

- `sentence_audio_play_hit_cache`：sentence 播放前已命中内存 URL、Browser Cache 或 persistent object URL。
- `sentence_audio_play_miss_cache`：sentence 播放前未命中本地可用缓存；如果已有同 key in-flight 请求，payload 中 `readiness = pending`。
- `scene_full_play_ready`：scene full 播放前已命中本地可用缓存。
- `scene_full_play_wait_fetch`：scene full 播放前需要等待请求或已有 in-flight 请求。
- `scene_full_play_fallback`：scene full 播放失败，记录为 failure summary。

payload 最小字段：

- sentence：`sceneSlug`、`sentenceId`、`mode`、`readiness`。
- scene full：`sceneSlug`、`sceneType`、`segmentCount`、`readiness` 或失败 `message`。

本步不做：

- 正式 BI 平台。
- 服务端事件上报。
- 跨设备同步。
- 额外埋点基础设施。

## Follow-up Hooks

后续步骤可以继续接入：

- Step 5：补真实 scene 页验收清单与音频链路文档。
