# 变更提案：强化 scenes review pack 准备态与弱网策略

## Status
draft

## Why
scenes 列表已经通过 `scene review pack` 把多个已学场景合并成单个可循环音频，后台播放稳定性比逐场景切换更好。但当前仍有三个缺口：

- 用户看不到 review pack 是正在准备、已准备好、被弱网跳过，还是准备失败。
- 页面加载后会自动准备 pack，但没有复用 `resource-actions` 中已有弱网 / 省流量口径。
- review pack 准备、失败和回退缺少本地事件，维护者难以判断后台循环播放是否真的命中缓存、是否经常回退。

这次变更的目标是让“能后台播放”这条链路更可解释、更节制，也更容易排查，而不是引入新的播放器架构。

## What Changes
- scenes 循环复习使用每日稳定顺序：同一天内顺序稳定，便于复用同一个 pack；跨天可自然换一批听感。
- 页面自动准备 review pack 前检查弱网 / 省流量；弱网下不做自动重资源准备，但用户点击后仍会尝试准备并播放。
- hook 暴露 review pack 准备状态，按钮 title 展示“准备中 / 已准备好 / 弱网下点击再准备 / 准备失败可重试”等状态。
- 使用现有 `client-events` 本地事件记录准备开始、准备完成、准备跳过、准备失败、播放开始与回退。
- 继续保留 review pack 失败后的逐场景回退。

## Stability Closure
### In This Round
- 收口 review pack 自动准备缺少弱网控制的问题。
- 收口 review pack 运行态不可见的问题。
- 收口 review pack 缺少本地回看事件的问题。
- 收口“固定顺序”过于静态的问题，改成每日稳定顺序，在缓存命中和听感变化之间取最小平衡。

### Not In This Round
- 不做 Media Session。
- 不做完整离线 / PWA / Service Worker。
- 不新增服务端专用 review pack API。
- 不改变 `/api/tts` 协议或浏览器 Cache Storage 容量策略。
- 不做跨设备或服务端 BI 埋点。

### Risk Tracking
- 延后原因：这些能力会扩大平台能力边界，涉及系统媒体控制、离线生命周期或服务端音频生成策略，应单独评估。
- 风险记录位置：本 change、`openspec/specs/audio-playback-orchestration/spec.md`、`docs/system-design/audio-tts-pipeline.md` 和 `docs/dev/dev-log.md`。

## Scope
### In Scope
- `src/app/(app)/scenes` 循环复习 hook 与按钮状态。
- `src/lib/utils/resource-actions.ts` 弱网判断复用。
- `src/lib/utils/client-events.ts` 本地事件名。
- scenes interaction 测试。
- audio playback stable spec 与音频 pipeline 文档。

### Out of Scope
- scene detail 单场景播放。
- today 推荐、review 写回、scene 完成判定。
- 服务端 TTS 生成协议。
- 管理端新增专门页面。

## Impact
影响的规范：audio-playback-orchestration。
影响的模块：scenes 列表、客户端事件、音频预热弱网策略、音频文档。
是否涉及 API 变更：否。
是否涉及用户可感知变化：是，循环播放按钮 title 会展示准备状态，弱网下自动准备会延后到点击时。
是否影响缓存策略：是，自动准备在弱网 / 省流量下会跳过；点击仍可准备。
风险点：弱网用户首次点击可能等待更久；每日稳定顺序可能改变测试对固定顺序的断言。
