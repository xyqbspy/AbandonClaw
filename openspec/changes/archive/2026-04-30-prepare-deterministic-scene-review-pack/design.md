# 设计说明：固定顺序预准备 scenes review pack

## Status
draft

## Current Flow
当前 scenes 复习播放会从合格场景中随机选择起点，点击后按该起点加载少量场景详情并组装 review pack。pack 播放成功后使用单个 loop 音频；失败后回退逐场景队列。

## Problem
- 随机起点会让页面难以提前准备“点击后马上要播”的 pack。
- 点击后才组包时，首次播放仍可能等待 scene detail 或 `/api/tts`。
- 用户目标是后台连续播放，不是必须随机。

## Stability Closure
### In This Round
- 改为固定顺序 pack，保证后台准备和点击播放使用同一 payload。
- 页面加载出合格场景后自动预准备单个有上限 pack。
- UI 文案改成循环播放，避免“随机”语义继续漂移。

### Not In This Round
- 不做完整离线、Media Session、Service Worker 或服务端专用 pack API。
- 不扩大浏览器 TTS 缓存容量策略。

## Decision
固定顺序来源为当前 scenes 列表中的合格场景顺序。pack 候选数量沿用上限 8，避免一次性生成过长音频。

实现结构：
1. 抽出 `buildReviewPackPayload(queue)`，负责缓存优先加载详情、跳过失败候选、组装 segments 和记录第一个可播场景。
2. `prepareReviewPack(queue)` 在页面有合格场景时后台调用 `prefetchSceneFullAudio()`，使用固定 `sceneSlug = scene-random-review-pack` 与同一 segments。
3. 点击播放时不再随机起点，而是播放同一个 deterministic pack；如果预准备未完成，复用 in-flight detail 与 TTS 请求。
4. pack 失败时从列表第一个合格场景开始逐场景回退。

## Risks
- 风险 1：自动预准备会增加后台 TTS 负载。
- 缓解：只准备一个 pack，候选场景最多 8 个；失败静默，不阻断页面。
- 风险 2：固定顺序少了随机感。
- 缓解：用户已明确随机不是必须，后台连续播放优先级更高。
- 风险 3：浏览器仍可能限制锁屏后启动新音频。
- 缓解：本轮目标是让点击后的连续播放尽量落在单个原生音频资源上，不承诺突破浏览器策略。

## Validation
验证方式：
- scenes 交互测试覆盖固定顺序播放、预准备 pack、缓存命中和失败回退。
- scene loop TTS 测试确认底层 loop 行为不回归。
- OpenSpec 校验、维护检查和格式检查。

未覆盖风险：
- 不做真实移动端锁屏系统级验证。
