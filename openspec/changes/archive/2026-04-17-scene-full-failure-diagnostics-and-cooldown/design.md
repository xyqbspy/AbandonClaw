# Design: scene full failure diagnostics and cooldown

## Current Behavior

- `playSceneLoopAudio()` 在播放 scene full 前通过 `getTtsAudioReadiness()` 判断 cache / pending / miss，并记录 `scene_full_play_ready` 或 `scene_full_play_wait_fetch`。
- `ensureSceneFullAudio()` 复用通用 `requestTtsUrl()`，失败时最终对页面抛出受控中文提示。
- `scene_full_play_fallback` 和 `tts_scene_loop_failed` 目前只记录泛化 message，无法区分 provider、timeout、storage、signed url、空音频等原因。
- 同一个 scene full 短时间失败后，用户再次点击仍会立即重新请求，容易造成重复撞墙、上游压力和日志刷屏。
- full 失败后已有“改为逐句跟读” CTA，但产品语义仍偏 sentence；block-first 后应优先承接到当前 block / 逐段跟读。

## Decision

本次不修改 `/api/tts` 的请求协议，不改变 scene full 的外部播放 API。只在现有链路上补三层能力：

1. 失败原因归一化
   - 服务端在 scene full 生成关键步骤补充结构化错误上下文。
   - 前端把 `/api/tts` 返回或抛出的错误归一化为稳定 `failureReason`。
   - UI 仍展示受控中文文案，不直接暴露内部错误。

2. 同 scene full 失败冷却
   - 以 scene full cache key 作为冷却 key。
   - 最近失败且未过期时，`playSceneLoopAudio()` 不再触发 `ensureSceneFullAudio()`。
   - 冷却默认 45 秒，保留常量可调。
   - 冷却只作用于 scene full，不影响 block / sentence / chunk。

3. 准备态与 fallback 承接
   - 增加 `resolveSceneFullReadiness()` 或等价 helper，将状态归一为：
     - `ready`
     - `pending`
     - `cold`
     - `failed_recently`
     - `cooling_down`
   - `scene_full_play_wait_fetch` payload 增加 readiness 细分。
   - 冷却命中时记录 `scene_full_play_cooling_down` 或等价事件。
   - full 失败后 CTA 文案与 payload 以 block 承接为主，sentence 只作为内部 fallback 定位。

## Failure Reason Model

建议类型：

```ts
type SceneFullFailureReason =
  | "provider_error"
  | "timeout"
  | "segment_assembly_failed"
  | "storage_upload_failed"
  | "signed_url_failed"
  | "empty_audio_result"
  | "cooling_down"
  | "unknown";
```

归因建议：

- `segment_assembly_failed`：segments 为空、合并后为空、缺少可读文本。
- `timeout`：上游请求或合成过程超时。
- `provider_error`：TTS provider 返回错误、连接错误或非 timeout 的生成失败。
- `empty_audio_result`：provider 返回成功但 buffer/blob 为空。
- `storage_upload_failed`：上传 storage 失败，但如果仍能 inline fallback 成功，不应直接判定播放失败。
- `signed_url_failed`：已存在对象但签名 URL 获取失败，或上传后无法拿到可播放 URL。
- `cooling_down`：命中本地失败冷却，未发起新生成。
- `unknown`：无法稳定归类的错误。

## Cooldown Rule

- 冷却 key：`buildSceneFullTtsCacheKey(params)` 或同等稳定 key。
- 冷却触发：scene full 播放/生成失败，且未成功进入 ready。
- 冷却窗口：默认 `45_000ms`，集中常量管理，测试可重置。
- 冷却命中：
  - 不调用 `ensureSceneFullAudio()`。
  - 记录冷却事件。
  - 抛出同样受控中文提示，页面继续显示 block / 逐段跟读 CTA。
- 冷却清理：
  - 成功播放或明确 ready 后清理对应 key 的失败冷却。
  - 测试 reset 清理所有冷却状态。

## Observability

保留现有事件名，最小新增字段或事件：

- `scene_full_play_ready`
  - `readiness: "ready"`
  - `sceneFullKey`
- `scene_full_play_wait_fetch`
  - `readiness: "cold" | "pending"`
  - `sceneFullKey`
- `scene_full_play_cooling_down`
  - `readiness: "cooling_down"`
  - `failureReason: "cooling_down"`
  - `cooldownMs`
  - `sceneFullKey`
- `scene_full_play_fallback`
  - `failureReason`
  - `readiness`
  - `sceneFullKey`
  - `segmentCount`
- `tts_scene_loop_failed`
  - `failureReason`
  - `fallbackBlockId`
  - `fallbackSentenceId`

## Fallback UX

- full 失败后不自动切换播放模式，避免引入新的串播状态机。
- toast / CTA 文案从“逐句跟读”向“逐段跟读 / 当前 block”靠拢。
- 若当前 block 可定位，CTA 使用当前 block；否则退到 active sentence 或首句。
- CTA 点击仍可复用现有 block/sentence 播放能力，不新增全局播放器。

## Rollback

如果冷却误伤正常重试，可关闭冷却判断，仅保留 failure reason 与 observability 字段。外部播放 API 和 `/api/tts` 请求协议不变，回滚范围应局限于 `tts-api.ts` 与页面 fallback 文案。
