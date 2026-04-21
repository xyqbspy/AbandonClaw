# 设计说明：场景随机复习播放

## Status
approved

## Current Flow
当前入口：`scenes` 页面顶部提供“生成场景”和“导入自定义”两个操作。

当前处理链路：
- `useScenesPageData()` 拉取并缓存轻量场景列表。
- 列表项包含 `slug`、`sceneType`、`progressPercent` 等字段。
- scene full 音频播放主要发生在 scene detail / lesson reader 内部。
- `playSceneLoopAudio()` 会播放单个完整场景并设置 `audio.loop = true`。

当前回写：本功能不涉及学习进度回写。

当前回退路径：scene full 失败已有受控中文提示和冷却机制，但不自动降级为逐句串播。

## Problem
`scenes` 列表页具备筛选播放资格的轻量字段，但不具备直接播放 full scene 所需的完整 `segments`。

同时，现有 scene full 播放函数是“单场景循环”，不能直接用于“场景 A 播完自动切到场景 B”的跨场景 playlist。

## Stability Closure
### In This Round
- 用 `progressPercent >= 60` 作为唯一播放资格门槛。
- 播放前按需通过 `getSceneDetailBySlugFromApi(slug)` 获取完整 lesson，再组装 segments。
- 在 TTS 工具层增加 scene full 单次播放能力，保留现有 `playSceneLoopAudio()` 不变。
- 页面层维护 playlist 状态：随机起点、顺序推进、到尾部回绕、停止清理。
- 对失败场景做跳过，避免单个失败阻断整个队列。

### Not In This Round
- 不增加轻量后端 scene full URL 接口：当前复用详情 API 更小、更稳定；如果后续性能瓶颈明确，再单独评估。
- 不做跨页面持久播放：避免引入全局播放器状态。
- 不调整 scene full TTS 缓存 key 或存储策略。

## Decision
设计决策 1：播放队列由当前 `allScenes` 派生，过滤 `progressPercent >= 60`，保持与用户当前排序一致。

设计决策 2：点击播放时只随机起点；后续按 eligible 队列顺序推进并循环。

设计决策 3：TTS 层新增单次播放函数，而不是给 `playSceneLoopAudio()` 加复杂模式参数，避免破坏已有单场景循环语义。

设计决策 4：不新增后端接口。列表页按需拉取场景详情已经有现成 in-flight 去重，首版工作量和风险最低。

## Risks
风险 1：浏览器自动播放策略可能限制非用户手势触发的后续播放。处理：首个播放由用户点击触发，后续使用同一播放链路串接；如果失败则受控提示并停止或跳过。

风险 2：某个场景详情或 scene full 音频失败。处理：记录失败并跳过当前场景，连续失败超过队列长度后停止。

风险 3：页面卸载后音频残留。处理：页面 effect cleanup 调用停止逻辑。

延期原因：后台播放、批量预热和逐句降级都超出本轮最小可维护边界。

风险去向：记录到 `docs/system-design/audio-tts-pipeline.md`。

## Validation
验证方式：
- `scenes` 页面交互测试覆盖入口、资格过滤、无 eligible 禁用、详情拉取和播放启动。
- TTS 单测覆盖 scene full 单次播放不设置 loop。

回归范围：
- `src/app/(app)/scenes/page.interaction.test.tsx`
- `src/lib/utils/tts-api.scene-loop.test.ts`

未覆盖风险：真实浏览器长时间自动播放稳定性需要人工体验验证。

本轮已收口的不稳定点：scene full playlist 与 loop 语义分离、播放资格门槛文档化。

明确延期的不稳定点：全局后台播放器和逐句降级。
