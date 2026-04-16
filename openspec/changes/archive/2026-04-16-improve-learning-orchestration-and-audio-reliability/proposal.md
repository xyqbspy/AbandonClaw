## Why

前三阶段已经补齐了接口治理、数据边界和上线准备，项目现在的主要短板不再是“能不能跑起来”，而是“today 是否足够会编排任务”“音频链路是否足够稳定”“上线前的安全收口是否足够可控”。如果继续只做零散补丁，最容易出现推荐解释不一致、TTS 失败体验割裂，以及发布配置遗漏的问题。

现在需要一个新的 change，把 `today` 编排增强、TTS 可靠性收口和最小生产化安全头明确成可审阅、可拆分实施的方案，避免在主学习链路上继续分散改动。

## What Changes

- 强化 `today` 的任务排序与解释规则，明确 continue learning、review 与其他任务的优先级和展示语义。
- 补齐 TTS 音频链路的失败降级、批量重生成并发边界和异常记录要求，提升 scene full 与管理端场景下的可靠性。
- 增加最小生产化安全收口，包括基线安全头、发布前校验项和剩余后台白名单入口的显式记录。
- 为上述改动补齐最小测试与维护文档，确保推荐链路、音频链路和发布收口可持续维护。

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `today-learning-contract`: 增加 today 任务优先级、解释文案来源和任务编排一致性的要求。
- `audio-playback-orchestration`: 增加 scene full 播放失败降级、批量音频重生成边界和预热可靠性要求。
- `api-operational-guardrails`: 增加最小生产化安全头和上游音频异常记录要求。
- `project-maintenance`: 增加针对 today 编排、TTS 可靠性与安全头配置的发布前检查要求。

## Impact

- 受影响代码：
  - `src/app/(app)/today/*`
  - `src/features/today/*`
  - `src/lib/server/learning/*`
  - `src/lib/utils/tts-api.ts`
  - `src/lib/server/tts/*`
  - `src/components/admin/tts-browser-cache-panel.tsx`
  - `next.config.ts`
  - `scripts/load-api-baseline.ts`
- 受影响系统：
  - Today 任务编排与展示解释
  - TTS 生成、预热、播放与重生成链路
  - 发布前配置校验与安全头
- 受影响文档与测试：
  - `docs/system-design/audio-tts-pipeline.md`
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/dev/dev-log.md`
  - today / tts / baseline 相关单测与回归测试
