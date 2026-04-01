## Context

当前前端播放链路已经具备一套共享的底层能力：`src/lib/utils/tts-api.ts` 负责句子、chunk、scene loop 播放与停止，`src/hooks/use-tts-playback-state.ts` 负责订阅全局播放状态，按钮 UI 也已有公共组件。但页面级编排仍明显分散：

- `src/features/lesson/components/lesson-reader.tsx` 同时处理句子播放、chunk 播放、循环播放、再次点击停止、错误提示与局部 active/loading 判断。
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts` 复制了相似的停止、循环、错误兜底和 chunk/sentence 识别逻辑。
- `src/app/(app)/chunks/page.tsx` 也有独立的播放/停止状态判断。

这些页面都在各自消费同一套底层 TTS API，却重复维护一层近似的页面播放状态机。结果是：

- 行为一致性依赖人工同步，容易在某个入口遗漏“再次点击停止”“loading 态也视为激活”“循环结束后状态回收”等细节。
- 页面文件越来越厚，不符合当前项目“页面只做编排、复杂动作下沉”的约定。
- 后续要继续调整播放体验时，测试和回归范围被迫按页面散开。

## Goals / Non-Goals

**Goals:**

- 提供一层公共的前端播放编排控制器，统一处理常见的 TTS 点按行为。
- 让 `lesson`、`scene detail`、`chunks` 入口以同一种方式声明“播放什么、如何判断当前项、出错如何提示”。
- 保持现有 `tts-api`、缓存、预热和按钮组件可复用，不引入新的重型状态管理。
- 为公共播放控制器补充纯逻辑或 hook 级测试，并为关键页面保留必要回归测试。

**Non-Goals:**

- 不改服务端 TTS 生成、存储和接口返回结构。
- 不重写 `speechSynthesis` fallback 机制。
- 不统一仓库内所有音频能力；`use-single-audio-player` 等非 TTS 播放器不在本次收敛范围。
- 不改动现有预热策略的业务触发时机，只保证重构后不破坏既有 key 与缓存契约。

## Decisions

### 1. 新增“公共播放编排层”，而不是继续把逻辑塞回 `tts-api`

决策：新增一个轻量的公共 controller/hook，位于前端公共层，负责把 `useTtsPlaybackState()` 与 `playChunkAudio` / `playSentenceAudio` / `playSceneLoopAudio` / `stopTtsPlayback` / `setTtsLooping` 组装成可复用的页面动作。

原因：

- `tts-api` 更适合保留为底层能力层；如果把“再次点按停止”“错误 toast”“页面特定 active 判断”继续塞进去，会让底层 API 混入页面语义。
- controller/hook 更适合复用 React 状态与页面文案，也便于测试“输入某个 payload 时应该触发什么动作”。

备选方案：

- 方案 A：每个页面继续各自维护逻辑，只做小修。
  结果：重复代码继续累积，后续难以保证一致性。
- 方案 B：把所有播放判断都并入 `tts-api`。
  结果：底层模块承担过多 UI 语义，边界变差。

### 2. 公共层只收敛“通用动作语义”，页面特化 payload 仍由页面提供

决策：公共层统一处理这些语义：

- 当前项是否处于 playing / loading / looping
- 再次点击时是停止还是重播
- 播放前统一 `stopTtsPlayback` 与 loop 状态清理
- 统一错误兜底回调

页面仍负责：

- 提供 chunk/sentence/scene loop 的具体 payload
- 是否要在成功播放前后附带业务副作用
- 页面自己的文案、埋点与局部 UI 状态

原因：

- `lesson`、`scene detail`、`chunks` 的播放目标不同，但动作语义高度一致。
- 保留 payload 组装在页面侧，可以避免为少量差异堆出复杂配置对象。

备选方案：

- 方案 A：做一个大而全的 hook，把 payload 组装、toast 文案、埋点、副作用全部吸进去。
  结果：抽象过度，页面特化场景会重新绕开公共层。

### 3. 先统一 TTS 播放编排，不把普通 HTMLAudio/Speech hook 一次性并入

决策：本次只覆盖以 `tts-api` 为底层的 TTS 播放链路，不强行吞并 `use-single-audio-player` 与 `use-speech`。

原因：

- 当前用户提到的问题聚焦在 TTS 这条链路。
- 其他音频能力用途不同，直接并入会扩大范围，增加提案和回归成本。

备选方案：

- 方案 A：一次把所有音频播放能力抽成统一总线。
  结果：改动面过大，不利于快速收敛当前重复逻辑。

### 4. 重构不得改变既有 TTS 预热与缓存 key 契约

决策：页面迁移到公共控制器后，原有通过 `buildChunkAudioKey`、`scheduleLessonAudioWarmup`、`scheduleChunkAudioWarmup` 形成的 key 规则必须保持一致；公共层可以复用这些 helper，但不得私自生成另一套等价 key。

原因：

- 前一条 `govern-tts-cache` 刚刚把 lesson 级预热 key 收敛完成。
- 如果播放重构又引入另一套 key 规则，会让缓存命中和调度去重重新分裂。

## Risks / Trade-offs

- [公共层抽象过度] → 只收敛共同行为，不收页面业务副作用；优先暴露小而明确的输入接口。
- [迁移过程中页面回归] → 为 controller/hook 补纯逻辑测试，并保留 `lesson`、`scene detail`、`chunks` 的关键交互回归。
- [loop 状态与停止行为耦合] → 把 loop 开关与 stop 清理作为统一前置/收尾步骤，避免页面各自忘记恢复。
- [缓存/预热 key 被意外改坏] → 在公共层直接复用现有 key helper，并用 spec 明确不得分裂 key 语义。
