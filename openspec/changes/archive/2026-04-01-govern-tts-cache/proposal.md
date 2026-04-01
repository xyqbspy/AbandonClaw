## Why

当前音频链路已经具备“服务端生成 + 浏览器持久缓存 + 页面空闲预热”的完整能力，但随着 `scene`、`today`、`chunks` 等入口都接入预热，缓存治理开始出现两个越来越明显的问题：

- 浏览器端 TTS 缓存只有“写入”和“手动清理”，没有容量上限或自动裁剪策略。长会话或重度使用下，`ttsUrlCache`、`persistentAudioObjectUrls` 和 Cache Storage `tts-audio-v2` 可能持续增长，维护者只能靠 admin 面板或手工清理排障。
- 音频预热虽然统一经过 `scheduleIdleAction()` 调度，但不同入口的 key 规则并不完全一致，同一 lesson 仍可能被 `scene detail`、`scene prefetch`、`today continue learning` 等链路重复调度，造成额外网络与缓存写入噪声。

这类问题不会立刻让功能失效，但会逐步放大为：

- 浏览器端音频缓存体积不可控
- 长会话内存对象累计过多
- 同一 lesson 重复预热，弱网或低端设备更明显
- 维护者很难判断“到底该清理哪层、为什么又热了一次”

需要通过一个独立 change，把“浏览器端 TTS 缓存如何裁剪”和“预热 key 如何统一”写成明确规则，再实现。

## What Changes

- 为浏览器端 TTS 缓存增加有界治理策略，覆盖内存层与 Cache Storage 层。
- 为音频预热调度统一 key 语义，降低同一 lesson 或同一批 chunk 的重复预热。
- 保持现有播放能力、签名 URL 复用、弱网下 scene full 预热抑制和 admin 手动清理能力不变。
- 补充针对缓存裁剪、预热去重和现有预热入口不回退的自动化测试。
- 更新音频链路维护文档，明确新的缓存上限与裁剪规则。

## Capabilities

### Modified Capabilities

- `runtime-cache-coherence`: 补充浏览器端 TTS 缓存容量治理与音频预热去重要求。

## Impact

- 受影响模块：
  - `src/lib/utils/tts-api.ts`
  - `src/lib/utils/resource-actions.ts`
  - `src/lib/utils/audio-warmup.ts`
  - `src/lib/cache/scene-prefetch.ts`
  - `src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.ts`
  - `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`
  - `src/features/today/components/today-page-client.tsx`
  - `src/app/(app)/chunks/page.tsx`
- 受影响文档：
  - `docs/audio-tts-pipeline.md`
- 用户可见影响：
  - 首次播放和后续复用逻辑保持一致
  - 长会话下浏览器缓存与预热行为更稳定
- 主要风险：
  - 裁剪策略过紧会误删刚写入的热音频，导致命中率下降
  - 去重 key 收得过粗会错过确实需要的局部预热
