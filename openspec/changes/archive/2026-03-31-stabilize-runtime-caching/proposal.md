## Why

当前项目已经在 `scenes`、`scene detail`、`chunks` 和音频播放链路里引入了 IndexedDB、运行时内存缓存、预取和浏览器音频缓存，但这些策略并不完全一致。`scenes` 列表与场景详情存在“命中新鲜缓存后直接停止联网刷新”的行为，配合 7 天 TTL，容易让用户持续看到过期的学习状态或旧内容；音频缓存已经具备持久化能力，但整段场景循环音频仍然容易在首次播放时冷启动。

现在需要先把缓存优化目标、行为边界和实施范围沉淀为可评审的 OpenSpec change，避免后续只做局部补丁，导致 `today -> scene -> chunks -> review` 链路继续出现刷新不一致、缓存失效不统一和性能优化方向分裂的问题。

## What Changes

- 规范 `scenes` 列表与 `scene detail` 的缓存刷新策略，改为优先秒开缓存并继续后台刷新，而不是在新鲜缓存命中后直接停止联网。
- 约束用户可见学习数据的缓存时效，避免本地 TTL 过长导致列表状态、详情进度和变体入口长期陈旧。
- 统一前端缓存层与 API 响应层的职责边界，明确哪些 GET 接口应由前端缓存主导，哪些响应头必须显式声明。
- 补齐场景音频预热范围，覆盖整段场景循环播放所需资源，降低首次播放等待。
- 明确本次改动涉及的受影响页面、缓存模块、音频模块和回归测试范围。

## Capabilities

### New Capabilities

- `runtime-cache-coherence`: 定义 `scenes`、`scene detail`、`chunks` 列表与场景音频的缓存一致性、新鲜度与预热行为。

### Modified Capabilities

- `learning-loop-overview`: 调整学习链路中 `scene` 与 `chunks` 用户可见数据的刷新要求，确保缓存不会长期遮蔽服务端最新状态。

## Impact

- 受影响页面与前端模块：
  - `src/app/(app)/scenes/page.tsx`
  - `src/app/(app)/scene/[slug]/*`
  - `src/app/(app)/chunks/*`
  - `src/features/lesson/components/lesson-reader.tsx`
- 受影响缓存与资源模块：
  - `src/lib/cache/scene-list-cache.ts`
  - `src/lib/cache/scene-cache.ts`
  - `src/lib/cache/scene-prefetch.ts`
  - `src/lib/cache/phrase-list-cache.ts`
  - `src/lib/utils/tts-api.ts`
  - `src/lib/utils/audio-warmup.ts`
  - `src/lib/utils/resource-actions.ts`
- 受影响 API：
  - `/api/scenes`
  - `/api/scenes/[slug]`
  - `/api/phrases/mine`
  - `/api/tts`
- 数据库迁移：否
- API 契约变化：可能涉及响应头与缓存语义调整，不计划改动业务字段结构
- 前端交互变化：是，主要体现在列表/详情刷新时机和场景循环音频首播体验
- 缓存策略变化：是
- 测试影响：是，需要补充或更新 `scenes`、`scene detail`、`chunks` 和音频缓存相关回归测试
