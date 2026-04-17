## Why

block-first 改造后，scene detail 页的 block 播放命中已经更稳定，剩余最明显的体验断点转移到 scene full：用户点击完整场景音频时仍可能从零生成并失败，且短时间重复点击会反复触发相同失败。

当前 observability 只看到 `Failed to generate tts audio.` / `scene_full_play_fallback`，不足以判断失败发生在 provider、timeout、segment 拼装、storage 上传、signed url 还是空音频结果，也缺少同一 scene full 的失败冷却。

## What Changes

- 细分 scene full 内部失败原因，至少覆盖：
  - `provider_error`
  - `timeout`
  - `segment_assembly_failed`
  - `storage_upload_failed`
  - `signed_url_failed`
  - `empty_audio_result`
  - `unknown`
- 为同一个 scene full 增加短时失败冷却：
  - 连续失败后 30-60 秒内不再立刻重新触发生成。
  - 冷却期间直接走受控提示和 block / 逐段跟读承接。
- 细化 scene full 准备态：
  - `cold`
  - `pending`
  - `ready`
  - `failed_recently`
  - `cooling_down`
- 扩展最小 observability：
  - 区分冷 miss、等待拉取、失败后冷却、fallback。
  - 失败事件带 `failureReason`、`cooldownMs`、`sceneFullKey` 或等价稳定 key。
- 优化 full 失败后的 block 承接体验：
  - 保留当前 block / 当前句上下文。
  - CTA 文案明确“继续从当前 block/逐段跟读”。
  - 不自动重构为整段串播。

## Capabilities

### New Capabilities
- `scene-full-audio-reliability`: scene full 音频失败诊断、冷却、准备态与 fallback 承接规则。

### Modified Capabilities
- `audio-playback-orchestration`: scene detail 的完整场景音频播放与预热状态需要区分 ready / cold / pending / failed_recently / cooling_down。
- `api-operational-guardrails`: 最小业务事件需要包含 scene full 失败原因与冷却状态，便于回看。

## Impact

- 前端播放链路：
  - `src/lib/utils/tts-api.ts`
  - `src/features/lesson/audio/use-lesson-reader-playback.ts`
  - `src/hooks/use-tts-playback-controller.ts`
- 前端预热 / 调度链路：
  - `src/lib/utils/scene-audio-warmup-scheduler.ts`
  - `src/lib/utils/audio-warmup.ts`
- 服务端 TTS 链路：
  - `src/lib/server/tts/service.ts`
  - `src/lib/server/tts/storage.ts`
  - `/api/tts` handler 相关测试
- 最小 observability：
  - `src/lib/utils/client-events.ts`
  - admin client events 回看面板
- 测试：
  - `src/lib/utils/tts-api.scene-loop.test.ts`
  - `src/lib/server/tts/service.test.ts`
  - `src/features/lesson/audio/use-lesson-reader-playback.test.tsx`
  - client events / cache 相关测试
- 文档：
  - `docs/system-design/audio-tts-pipeline.md`
  - `docs/dev/dev-log.md`
