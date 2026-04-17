# Design: tts warmup effectiveness metrics

## Current Implementation

当前 TTS 链路已经具备：

- `scene-audio-warmup-scheduler.ts`：scene sentence / scene full 浏览器侧预热队列，包含优先级、来源和状态。
- `audio-warmup.ts`：将 lesson 首屏 block、idle block、播放驱动后续 block 和 scene full 入队。
- `resource-actions.ts`：用 idle callback / timeout 调度 `scheduleLessonAudioWarmup()` 和 `scheduleSceneIdleAudioWarmup()`。
- `tts-api.ts`：播放前记录 sentence hit / miss、scene full ready / wait / fallback / cooling_down。
- `client-events.ts`：把最近本地事件写入 localStorage，供 `/admin/observability` 回看。
- `ClientEventsPanel`：展示最近事件与失败摘要。

缺口是：预热队列知道任务来源，播放事件知道命中结果，但两者没有通过稳定 cache key 关联起来。

## Decision

新增一个浏览器运行时 warmup registry，把“某个 TTS cache key 曾经被哪类预热触发”记录下来。播放事件发出前按 cache key 查询 registry，并把结果写入 payload。

本次采用本地内存 registry，不写 localStorage。原因：

- 预热收益判断只需要同页或短时会话内关联。
- localStorage 持久化会让旧预热污染新会话。
- 事件本身仍会持久化到 `client-events`，summary 可以基于事件回看。

## Warmup Source Model

```ts
export type WarmupSource = "initial" | "idle" | "playback";

type WarmupRecord = {
  warmedAt: number;
  source: WarmupSource;
};
```

来源映射：

- `initial`：首屏或入口级预热，例如 `scheduleLessonAudioWarmup()` 触发的首批 block / chunk / scene full。
- `idle`：页面稳定后的增量预热，例如 `scheduleSceneIdleAudioWarmup()` 入队的后续 block。
- `playback`：用户播放后触发的后续资源提权，例如 `promoteLessonPlaybackAudioWarmups()`。

`user-click` 不进入 warmup source。当前点击播放是 demand，不是预热收益。

## Registry API

新增 `src/lib/utils/tts-warmup-registry.ts`：

```ts
export const markAudioWarmed = (cacheKey: string, source: WarmupSource) => void;

export const getWarmupInfo = (cacheKey: string) => ({
  wasWarmed: boolean;
  source?: WarmupSource;
});
```

内部规则：

- TTL 默认 20 分钟。
- 每次 `markAudioWarmed()` 和 `getWarmupInfo()` 顺手 prune 过期项。
- 默认最多保留 240 条，超过后按最旧记录裁剪。
- 同 key 重复标记时允许更新 `warmedAt`。
- 来源优先级：`playback` > `idle` > `initial`。较高来源可以覆盖较低来源，较低来源不覆盖较高来源。
- 提供 `__resetTtsWarmupRegistryForTests()` 和可调 TTL / limit 的测试 helper。

## Cache Key Strategy

必须复用现有 TTS cache key 语义：

- block 音频当前复用 sentence 通道：`sentence:<sceneSlug>:<sentenceAudioKey>`
- 真实 sentence 音频：`sentence:<sceneSlug>:<sentenceAudioKey>`
- chunk 音频：`chunk:<chunkKey>`
- scene full：`scene:<sceneSlug>:<sceneFullKey>`

为避免 key 逻辑散落，本次应优先从现有 helper 导出或复用：

- `buildSentenceTtsCacheKey(...)`
- `buildSceneFullTtsCacheKey(...)`
- chunk key 继续使用 `buildChunkAudioKey()` 拼成 `chunk:<chunkKey>`

如果 helper 当前是模块私有，应改为显式导出，而不是在 registry 或 scheduler 里重复实现。

## Marking Integration

### initial

`warmupLessonAudio()` / `scheduleLessonAudioWarmup()` 触发首屏资源时，应对实际入队或预取的资源标记：

- block-first sentence key -> `initial`
- chunk key -> `initial`
- scene full key -> `initial`

标记应尽量靠近实际入队点，避免 schedule 被取消后误标。

### idle

`enqueueLessonIdleBlockWarmups()` 或 `scheduleSceneIdleAudioWarmup()` 入队后续 block 时，应标记：

- 后续 block key -> `idle`

如果后续扩展 idle chunk 或 scene full，也沿用同一来源。

### playback

`promoteLessonPlaybackAudioWarmups()` 对后续 block 或 scene full 提权时，应标记：

- 后续 block key -> `playback`
- 被提权的 scene full key -> `playback`

播放驱动来源优先级最高，允许覆盖 earlier `initial` / `idle`。

## Playback Event Integration

播放前读取 warmup 信息：

- `playSentenceAudio()`：用 sentence/block cache key 读取 registry。
- `playChunkAudio()`：用 chunk cache key 读取 registry。
- `playSceneLoopAudio()`：用 scene full cache key 读取 registry。

所有相关事件增加：

```ts
wasWarmed: boolean;
warmupSource?: "initial" | "idle" | "playback";
```

audioUnit 约定：

- block：`audioUnit = "block"`
- sentence：`audioUnit = "sentence"`
- chunk：如新增 chunk 播放事件则用 `audioUnit = "chunk"`
- scene full：scene full 事件 payload 增加 `audioUnit = "scene_full"`

`cacheLayer` 作为可选字段，只在低成本可稳定区分时加入。第一版可以继续保留现有 `readiness`，避免为了区分 memory / persistent_blob / network 改动过大。

## Admin Summary

新增一个纯前端 summary helper，基于 `listClientEventRecords()` 的最近本地事件计算：

```ts
buildTtsWarmupEffectivenessSummary(records)
```

输出至少包含：

- block warm / cold total
- block warm hit rate
- block cold hit rate
- block warmup gain
- scene full warm / cold total
- scene full warm ready rate
- scene full cold ready rate
- scene full warm / cold fallback rate
- source breakdown：`initial` / `idle` / `playback`

计算口径：

- block hit：`sentence_audio_play_hit_cache` 且 `audioUnit = "block"`
- block miss：`sentence_audio_play_miss_cache` 且 `audioUnit = "block"`
- scene full ready：`scene_full_play_ready`
- scene full wait：`scene_full_play_wait_fetch`
- scene full fallback：`scene_full_play_fallback`
- warm：`payload.wasWarmed === true`
- cold：`payload.wasWarmed !== true`

对于老记录：

- `wasWarmed` 缺失按 cold 处理
- `warmupSource` 缺失不计入来源拆分

UI 接入：

- 在 `/admin/observability` 的 `ClientEventsPanel` 顶部增加一组小型 summary 卡片。
- 只展示本地最近事件样本，不新增路由或后端接口。
- 样本不足时展示 `—` 或 0，不报错。

## Testing

重点测试：

- registry TTL、来源覆盖和过期清理。
- initial / idle / playback 标记能写入正确 cache key。
- sentence/block/scene full 播放事件带 `wasWarmed` 和 `warmupSource`。
- 非 warmup 资源播放事件 `wasWarmed = false`。
- summary helper 正确计算 warm / cold hit rate、ready rate、fallback rate 和 source breakdown。
- `/admin/observability` 能渲染 summary，不影响原有事件列表筛选和清空。

## Risks

- key 不一致会导致 warmup 标记无法关联播放事件。缓解：统一导出并复用 cache key builder。
- 样本量小会导致 gain 为负或波动。缓解：summary 只展示诊断数据，不作为自动失败条件。
- registry TTL 太长会污染后续会话。缓解：默认 20 分钟并支持 prune。
- admin 面板信息过多。缓解：只加精简 summary，不做复杂图表。

## Rollback

如果指标噪声过大，可先隐藏 admin summary，只保留事件字段；如果事件字段也需要回滚，删除 registry 调用和 payload 扩展即可，不影响 TTS 播放和缓存主链路。
