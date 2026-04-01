## Context

当前浏览器端 TTS 相关状态主要集中在 `src/lib/utils/tts-api.ts`：

- `ttsUrlCache`: 45 分钟 TTL 的内存 URL 缓存
- `pendingTtsUrlRequests`: 同 key 并发去重
- `preloadedAudioUrls`: 防重复 preload
- `persistentAudioObjectUrls`: Cache Storage 命中后派生出的 `blob:` URL
- Cache Storage bucket: `tts-audio-v2`

预热调度主要集中在 `src/lib/utils/resource-actions.ts`：

- `scheduleChunkAudioWarmup()`
- `scheduleLessonAudioWarmup()`
- 底层统一走 `scheduleIdleAction()`

但目前还缺两层“治理规则”：

1. 缓存怎么增长、什么时候自动裁剪，没有统一约束。
2. lesson / chunk 预热 key 虽然有生成函数，但不同入口自己拼 key，导致跨入口去重粒度不稳定。

## Goals / Non-Goals

**Goals**

- 给浏览器端 TTS 缓存加可解释、可维护的上限策略。
- 在不改播放接口语义的前提下，减少同一资源的重复预热。
- 保留现有 admin 手工清理能力，且不破坏当前测试覆盖面。

**Non-Goals**

- 不改服务端 Storage 策略或签名 URL 生成策略。
- 不在本 change 中处理 scene full 播放 fallback。
- 不引入复杂的 IndexedDB 元数据层或全新的缓存后端。

## Decisions

### 1. 浏览器端缓存采用“轻量上限 + 最旧优先裁剪”

- 内存层：
  - 为 `ttsUrlCache`、`preloadedAudioUrls`、`persistentAudioObjectUrls` 增加轻量上限
  - 超限时按“最早写入/最久未用”优先裁剪
- Cache Storage 层：
  - 保留 `tts-audio-v2`
  - 每次新增持久缓存后，读取当前条目摘要
  - 若总条目数或总大小超限，则按最旧条目优先清理

这样做的原因：

- 现有结构已经足够支持轻量治理，不需要引入新的数据库或索引层
- 比“完全不裁剪，只靠人工清”更稳定
- 比“一刀切清空”更不容易伤害命中率

### 2. 预热去重统一到共享 key builder

- 继续保留 `scheduleIdleAction()` 作为统一调度入口
- 但把 lesson / chunk 音频预热 key 的生成规则收口到共享 helper
- `scene detail`、`scene prefetch`、`today continue`、`chunks` 等入口不再各自拼一套相似但不完全一致的 key

目标：

- 同一 lesson 的轻量预热能被跨入口稳定去重
- 交互型局部预热仍能保留更细粒度 key，不被 lesson 级 key 吞掉

### 3. 裁剪和预热都维持“非阻塞”

- 缓存裁剪失败不应阻塞当前播放或预取
- 预热命中去重或裁剪失败都只影响优化收益，不得让主播放链路报错

### 4. 规则需要同步进维护文档

- `docs/audio-tts-pipeline.md` 需要明确：
  - 当前缓存上限
  - 哪些缓存层会自动裁剪
  - lesson / chunk 预热 key 的统一规则

## Risks / Trade-offs

- 若只按“最旧写入”裁剪而不记录最近使用时间，命中率不一定最优，但实现足够简单。
- 若上限设得过低，用户会更频繁重新抓取音频；若设得过高，则治理收益不足。
- 统一预热 key 后，某些历史上重复执行但“看起来没坏”的入口会暴露真实重复调度，测试需要同步更新。

## Validation

- `tts-api` 单测：
  - 超限后会触发定向裁剪
  - 新写入后不会误删当前刚写入的音频
  - 裁剪失败不影响主请求返回
- `resource-actions` / `audio-warmup` 相关测试：
  - 同一 lesson 的多入口预热 key 可以稳定去重
  - chunk 局部预热仍能保留细粒度
- 回归测试：
  - `scene detail` 加载后仍会预热 sentence / chunk / scene full
  - `scene prefetch` 仍会做轻量音频预热
  - `chunks` 列表首屏预热行为不回退
