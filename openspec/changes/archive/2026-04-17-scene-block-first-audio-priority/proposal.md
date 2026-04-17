# Change: scene-block-first-audio-priority

## Why

当前 scene detail 页的音频预热与提权主要围绕 sentence 维度展开，但用户在页面中的真实主消费单元是 block 和 scene full，而不是单独 sentence。

这导致系统可能提前预热了 `sentence-s1` 之类的资源，但用户实际点击 block 播放时，仍需要即时请求 `block-*` 音频，造成预热与真实体验不对齐。

## Goals

- 将 scene detail 页的主预热单位从 sentence 调整为 block。
- 将 scene full 维持为高优先级资源。
- sentence 降级为 fallback / 按需资源，而不是默认主预热对象。
- 让预热命中更贴近用户真实点击行为。

## Non-Goals

- 不重构所有页面的音频模型。
- 不修改 chunk 页音频策略。
- 不在这次变更中建设完整 BI 平台。
- 不改服务端 TTS 协议。

## Scope

本次仅调整 scene detail 页：

- 首屏预热策略。
- idle 预热策略。
- playback bump 策略。
- block / full / sentence 的优先级关系。

## Risks

- block 音频通常比单句更长，单个生成耗时和缓存体积会增加。
- 如果 scene full 与多个 block 同时预热，可能挤占当前播放请求。
- 旧的 observability 事件名仍叫 `sentence_audio_*`，但 payload 里可能出现 `block-*` id，需要在文档中说明这是复用现有 TTS kind 的兼容策略。

## Guardrails

- 不修改 `/api/tts` payload kind。
- 不改变现有播放 API 外部调用方式。
- 当前点击播放仍高于后台预热。
- scene full 不得压制当前 block 播放。
- sentence 仅在明确单句消费或 fallback 场景按需参与。
