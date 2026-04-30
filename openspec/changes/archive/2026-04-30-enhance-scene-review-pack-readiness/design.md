# 设计说明：强化 scenes review pack 准备态与弱网策略

## Status
draft

## Current Flow
当前 scenes 列表会从完成度达到阈值的场景中取固定候选，后台准备一个 `scene-random-review-pack`，点击后优先播放同一个 loop 音频。pack 准备失败时不阻塞页面，点击播放失败后会回退逐场景队列。

## Problem
- 自动准备没有展示状态，用户只能点击后才感知是否需要等待。
- 自动准备没有复用已有弱网 / 省流量判断，可能在不适合的时候准备较重音频。
- pack 准备、失败与回退缺少本地事件，无法从 `/admin/observability` 判断真实链路表现。
- 完全固定顺序虽然利于缓存，但长期听感不够自然。

## Stability Closure
### In This Round
- 提供 review pack 准备状态：`idle / preparing / ready / skipped / failed`。
- 导出并复用统一弱网判断；自动准备弱网跳过，点击播放不跳过。
- 新增本地事件，覆盖准备、播放和回退。
- 按日期对合格场景做稳定排序，同一天内缓存可复用，跨天顺序自然变化。

### Not In This Round
- 不接入 Media Session 或锁屏控制。
- 不改 TTS 服务端协议。
- 不做完整离线缓存清单。
- 不新增管理端可视化组件，仅复用本地事件列表。

## Decision
### 每日稳定顺序
新增轻量 deterministic hash：

- seed 使用本地日期 `YYYY-MM-DD`。
- 每个候选按 `seed + slug + id` 计算稳定分数后排序。
- 同一天同一组场景顺序稳定，review pack key 与 segments 保持一致。
- 跨天重新排序，避免永远听同一开头。

### 准备状态
hook 内维护 `reviewPackPrepareStatus`：

- `idle`：没有候选或尚未准备。
- `preparing`：自动准备或点击触发准备中。
- `ready`：pack payload 和 TTS 预取已完成。
- `skipped`：弱网 / 省流量下跳过自动准备。
- `failed`：准备失败或没有可播放 segments。

按钮保留 icon-only 视觉，不新增正文；通过 `title` 暴露状态，避免破坏现有布局。

### 弱网策略
把 `resource-actions.ts` 中的弱网判断导出为 `shouldAvoidHeavyAudioWarmup()`：

- `saveData = true` 返回 true。
- `effectiveType = slow-2g / 2g` 返回 true。
- scene detail 原有 scene full 预热继续复用该判断。
- scenes review pack 只在自动准备时跳过；用户点击播放视为明确意图，不跳过。

### 本地事件
新增 `client-events` 事件名：

- `scene_review_pack_prepare_started`
- `scene_review_pack_prepare_ready`
- `scene_review_pack_prepare_skipped`
- `scene_review_pack_prepare_failed`
- `scene_review_pack_play_started`
- `scene_review_pack_fallback_to_queue`

payload 保持轻量：候选数量、可播放片段数、队列 key、原因和是否自动准备。

## Risks
- 风险 1：弱网用户不自动准备，首次点击等待更明显。
- 缓解：按钮 title 会提示“点击后再准备”，且点击仍按现有 pack -> 回退路径执行。
- 风险 2：每日排序导致测试不能再依赖固定 slug 顺序。
- 缓解：测试改为验证候选集合、pack 预取和回退行为，不绑定具体第一项；必要处使用当前导出的行为断言。
- 风险 3：事件名增加后 admin summary 不会自动汇总。
- 缓解：本轮目标是本地列表可回看，不做新 summary。

## Validation
- 更新 scenes interaction 测试，覆盖准备态、弱网跳过、事件记录和回退。
- 运行 `node --import tsx --test "src/app/(app)/scenes/page.interaction.test.tsx"`。
- 运行 `node --import tsx --test "src/lib/utils/tts-api.scene-loop.test.ts"`。
- 运行 `pnpm exec openspec validate --all --strict`。
- 运行 `git diff --check`。
