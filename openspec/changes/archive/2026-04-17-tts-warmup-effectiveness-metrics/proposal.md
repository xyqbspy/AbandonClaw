# Change: tts-warmup-effectiveness-metrics

## Why

当前 TTS 音频链路已经有 block-first 预热、idle 增量预热、播放驱动提权、scene full 准备态和失败冷却，但现有 observability 只能看到 hit / miss / ready / wait / fallback，无法回答“这次命中是否真的来自预热”。

这会带来几个问题：

- 无法量化 initial / idle / playback 三种预热来源的真实收益。
- 无法判断 block-first 主链路是否被有效命中。
- 无法判断 scene full 预热是否降低 wait / fallback。
- 后续调度策略只能凭感觉调参，缺少本地验收依据。

本次变更目标是把 TTS 预热从“我感觉有效”升级为“可以在 `/admin/observability` 看到本地样本中的 warm / cold 命中差异”。

## Goals

- 为 TTS 音频预热新增运行时 warmup registry，按稳定 `ttsCacheKey` 记录资源是否被预热以及预热来源。
- 在播放事件中增加 `wasWarmed` 与 `warmupSource` 字段。
- 在 scene full 播放事件中同样标记 warm / cold，用于观察 ready / wait / fallback。
- 在 `/admin/observability` 中增加本地 TTS 预热收益 summary。
- 支持按 `initial` / `idle` / `playback` 拆分命中率或 ready 率。
- 保持本地、轻量、可回看，不引入数据库和 BI 平台。

## Non-Goals

- 不接入正式 BI / analytics 平台。
- 不跨设备同步预热记录或统计结果。
- 不写数据库，不新增服务端事件表。
- 不做复杂 dashboard 或趋势图。
- 不改变 `/api/tts` 协议。
- 不改变现有播放 API 的外部调用方式。
- 不把 `warm hit rate > cold hit rate` 作为自动测试硬断言；该关系是后续调度判断信号，受样本量和缓存状态影响。

## Scope

本次变更覆盖：

- `src/lib/utils/tts-warmup-registry.ts`
- `src/lib/utils/audio-warmup.ts`
- `src/lib/utils/resource-actions.ts`
- `src/lib/utils/scene-audio-warmup-scheduler.ts`
- `src/lib/utils/tts-api.ts`
- `src/lib/utils/client-events.ts`
- `src/components/admin/client-events-panel.tsx`
- `docs/system-design/audio-tts-pipeline.md`
- 对应单元测试 / 组件测试

本次只做 client + local summary，不触达 Supabase schema、服务端 TTS 生成协议或正式 CHANGELOG。

## Current Problem

当前事件大致能表达：

- `sentence_audio_play_hit_cache`
- `sentence_audio_play_miss_cache`
- `scene_full_play_ready`
- `scene_full_play_wait_fetch`
- `scene_full_play_cooling_down`
- `scene_full_play_fallback`

但事件无法表达：

- 该资源播放前是否曾经被预热入队。
- 预热来源是首屏 initial、空闲 idle，还是播放驱动 playback。
- block 音频 hit 是否来自 block-first 预热。
- scene full ready 是否来自提前准备，而不是用户点击时冷启动。

## Guardrails

- 预热标记必须使用与 Cache Storage 一致的稳定 TTS cache key。
- warmup registry 必须有 TTL，避免长期污染后续判断。
- 重复预热同一资源时，`playback` 提权可以覆盖较低优先级来源。
- summary 只基于当前浏览器最近本地事件，不代表全量用户数据。
- 事件字段必须向后兼容，老记录没有 `wasWarmed` 时按 cold / unknown 安全处理。
- 实现完成后必须同步更新 `docs/system-design/audio-tts-pipeline.md` 和开发日志。
