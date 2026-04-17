# 音频生成、缓存与预热链路说明

## 1. 这份文档解决什么问题

项目里的音频能力并不是单一接口，而是一整条链路：

1. 服务端按文本或场景内容生成 TTS
2. 生成结果上传到 Supabase Storage，并按需返回签名 URL
3. 浏览器端对 URL、音频 Blob 和播放状态做多层缓存
4. 页面在 `today`、`scene`、`chunks` 等入口按空闲时机做预热
5. 用户真正点击播放时，再决定复用缓存、走网络还是退回浏览器 `speechSynthesis`

这份文档的目标是让维护者能快速回答下面几个问题：

- 某段音频到底是谁生成的
- 为何同一段文本第二次播放几乎不走网络
- 预热发生在什么时机，哪里会重复调度
- 清缓存、重生成、弱网兜底分别在哪一层做

## 2. 关键文件

### 服务端生成与存储

- `src/lib/shared/tts.ts`
- `src/lib/server/tts/service.ts`
- `src/lib/server/tts/storage.ts`
- `src/lib/server/tts/repo.ts`
- `src/app/api/tts/route.ts`
- `src/app/api/tts/regenerate/route.ts`

### 客户端缓存、预热与播放

- `src/lib/utils/tts-api.ts`
- `src/lib/utils/audio-warmup.ts`
- `src/lib/utils/resource-actions.ts`
- `src/hooks/use-tts-playback-state.ts`
- `src/hooks/use-tts-playback-controller.ts`

### 页面触发入口

- `src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`
- `src/lib/cache/scene-prefetch.ts`
- `src/lib/utils/scene-resource-actions.ts`
- `src/features/today/components/today-page-client.tsx`
- `src/app/(app)/chunks/page.tsx`
- `src/components/admin/tts-browser-cache-panel.tsx`

## 3. 音频 key 与资源组织

统一 key 逻辑在 `src/lib/shared/tts.ts`：

- chunk 音频：`buildChunkAudioKey(chunkText)`
  - 以清洗后的文本为主，兜底是 hash
  - 存储路径形如 `chunks/<chunkKey>.mp3`
- sentence 音频：`buildSentenceAudioKey({ sentenceId, text, speaker, mode })`
  - 会把 `sentenceId`、speaker、快慢速和文本一起算进指纹
  - 存储路径形如 `scenes/<slug>/sentences/<sentenceAudioKey>.mp3`
- scene full 音频：`buildSceneFullAudioKey(segments, sceneType)`
  - 先做 speaker 合并，再对整段内容算 hash
  - 存储路径形如 `scenes/<slug>/<sceneFullKey>.mp3`

这意味着：

- chunk 音频天然跨页面复用，只要文本归一化后相同，就会共用一个 key
- sentence 音频更稳定，避免同一句文本因为 speaker 或速度不同而混用
- scene full 音频依赖整段内容与场景类型，任何句子或 speaker 变化都会换 key

## 4. 服务端生成链路

### 4.1 单次运行时生成

用户端请求进入：

- `POST /api/tts` -> `src/app/api/tts/route.ts`
- 先 `requireCurrentProfile()`
- 再把 payload 交给 `generateTtsAudio()`

`generateTtsAudio()` 在 `src/lib/server/tts/service.ts` 中按下面顺序工作：

1. 校验 `kind/mode/text/segments` 等输入
2. 解析目标资源路径
3. 先查服务端进程内签名 URL 缓存
4. 再尝试用 `getTtsStorageSignedUrlIfExists()` 判断 Storage 中是否已有现成文件
5. 若已有文件：直接返回签名 URL，`source = "storage-hit"`
6. 若没有文件：
   - 用 `msedge-tts` 合成 Buffer
   - 尝试写一份到本地 `public/audio/...`
   - 再上传到 Supabase Storage
   - 上传成功：返回签名 URL，`source = "fresh-upload"`
   - 上传失败：退回 `data:audio/mpeg;base64,...`，`source = "inline-fallback"`

注意：

- 运行时真正依赖的是 Supabase Storage，不是本地 `public/audio`
- 本地文件写入更像兼容兜底或本地开发副产物
- 服务端签名 URL 缓存是进程内 `Map`，TTL 约 59 分钟

### 4.2 本地 `public/audio` 产物边界

运行时点击新音频时，如果 Storage 里还没有对应对象，`generateTtsAudio()` 会先合成音频 Buffer，并尝试把同一份 Buffer 写到本地 `public/audio/...`。

这类文件的定位是：

- 本地开发/兼容产物，不是主缓存层
- 不参与浏览器 Cache Storage 命中判断
- 不作为运行时优先读取来源
- 不影响服务端 Storage 是否命中
- 批量预热 `warmLessonTtsAudio()` 不会同步写本地 `public/audio`

实际播放返回优先级仍是：

1. Supabase Storage 已有对象 -> 返回签名 URL
2. Storage 没有对象 -> 合成并上传 Storage -> 返回签名 URL
3. Storage 上传失败但已有 Buffer -> 返回 `data:audio/mpeg;base64,...`

因此：

- 新点击播放后写入的未跟踪 `public/audio/...` 文件，通常可以删除
- 删除这类本地文件不会清掉 Supabase Storage 中的主音频缓存
- 删除后，如果 Storage 仍有对象，下一次播放仍会走 Storage 签名 URL
- 如果 Storage 也没有对象，下一次播放会重新生成，并可能再次写出本地文件
- 已经进入 git 的历史/样例音频不要随手批量删除；如果要清理，应按 Cleanup / Removal 任务说明删除依据和影响范围

当前统一口径：`public/audio` 不是生产主缓存。它可以辅助本地查看生成结果，但不要把它当成 TTS 缓存是否完整的判断依据。

### 4.3 批量预热生成

场景导入后或服务端主动预热走：

- `warmLessonTtsAudio()` in `src/lib/server/tts/storage.ts`

它会批量生成三类资源：

- sentence 音频
- chunk 音频
- scene full 音频

特点：

- 先看 Storage 里是否已有文件，没有才生成
- 默认并发数 `3`
- 直接上传到 Storage，不走浏览器端缓存
- 不负责页面播放，只负责“把文件提前备好”

当前服务端主动触发点里，最关键的是导入场景后：

- `src/lib/server/scene/service.ts`
  - 导入成功后会调用 `warmLessonTtsAudio(lesson, { includeSceneFull: true, concurrency: 3 })`

## 5. 客户端缓存链路

客户端核心都在 `src/lib/utils/tts-api.ts`。

### 5.1 当前实际有四层缓存与播放复用

#### 第一层：内存 URL 缓存

- `ttsUrlCache: Map<string, { url, expiresAt }>`
- TTL 45 分钟
- 用来避免同页会话里重复请求 `/api/tts`
- 默认上限：180 条，超限后按最旧条目优先裁剪

#### 第二层：浏览器 Cache Storage

- cache name: `tts-audio-v2`
- 存的不是 JSON，而是音频 Blob
- key 形式：
  - `chunk:<chunkKey>`
  - `sentence:<sceneSlug>:<sentenceAudioKey>`
  - `scene:<sceneSlug>:<sceneFullKey>`
- 默认上限：
  - 最多 120 条
  - 总大小最多 24 MB
- 新条目写入后若超限，会按最旧缓存优先裁剪，但不会直接清空全部缓存

命中后会把 Blob 变成 `blob:` URL，再塞回内存缓存。

#### 第三层：预加载状态集合

- `preloadedAudioUrls: Set<string>`
- 作用是避免对同一个 URL 反复创建新的 `Audio().load()`
- 默认上限：180 条

#### 第四层：Blob URL 复用表

- `persistentAudioObjectUrls: Map<cacheKey, blobUrl>`
- 作用是复用 Cache Storage 命中后创建出的 `blob:` URL，避免同一个条目反复 `createObjectURL`
- 默认上限：120 条，超限后会优先释放较旧的 object URL

### 5.2 请求顺序

`requestTtsUrl()` 的顺序是：

1. 先读浏览器持久缓存 `readPersistentAudioUrl()`
2. 再读内存 URL 缓存 `getCachedTtsUrl()`
3. 再看是否已有同 key 的 in-flight 请求
4. 最后才 `fetch("/api/tts")`

首次从 `/api/tts` 拿到 URL 后，还会异步做两件事：

- `preloadAudioUrl(url)` 预加载
- `persistAudioToBrowserCache(cacheKey, data.url)` 把远端音频抓下来落到 Cache Storage

所以一次成功播放后，后续通常会变成：

- 先命中浏览器 Blob 缓存
- 不再依赖短期签名 URL 是否过期

### 5.3 缓存清理

目前提供了显式清理能力：

- 定向清理：`clearBrowserTtsCacheEntries(cacheKeys)`
- 全量清理：`clearAllBrowserTtsCache()`
- 管理界面：`src/components/admin/tts-browser-cache-panel.tsx`

chunk 音频重生成前也会主动清：

- `regenerateChunkAudioBatch()`
  - 先 `stopTtsPlayback()`
  - 清掉对应 chunk 的浏览器缓存
  - 再调 `/api/tts/regenerate`
  - 最后立即重新 `prefetchChunkAudio()`

新增的自动治理规则：

- 每次新音频成功持久化到浏览器 Cache Storage 后，都会检查条目数与总大小是否超限
- 若超限，系统会按最旧条目优先裁剪
- 裁剪失败只记日志，不阻塞当前音频请求、预取或播放

## 6. 客户端播放链路

### 6.1 播放状态

全局播放状态也集中在 `tts-api.ts`：

- `playbackState`
- `subscribeTtsPlaybackState()`
- `getTtsPlaybackState()`

`useTtsPlaybackState()` 只是一个薄订阅 hook。页面侧现在统一通过 `useTtsPlaybackController()` 消费这套状态，把“再次点按停止、loop 清理、错误兜底和常见 active/loading 判断”收敛在公共层，而不是让 `lesson`、`scene detail`、`chunks` 各自维护一套近似状态机。

状态字段能表达：

- 当前在播 sentence / chunk / scene 哪一种
- 是 `loading` 还是 `playing`
- 当前文本、句子 ID、chunkKey、sceneSlug
- 是否处于 loop 模式

### 6.2 页面公共编排层

`src/hooks/use-tts-playback-controller.ts` 当前负责：

- 统一 chunk / sentence / scene loop 的播放切换语义
- 统一“再次点按当前目标则停止”的行为
- 统一 loop 状态的前置清理与收尾恢复
- 统一向页面暴露 `speakingText`、`loadingText` 和常见状态判断 helper

页面目前的接入点：

- `src/features/lesson/components/lesson-reader.tsx`
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`
- `src/app/(app)/chunks/page.tsx`

当前前端展示约定也同步收口成统一规则：

- 播放按钮默认只显示 icon，不再在按钮正文里直接渲染“朗读 / 播放 / 循环播放”文字
- 状态语义继续保留在 `aria-label`
- 句子正文层可以保留句子下方的翻译按钮
- 一旦进入句子详情面板或 sheet，中文翻译直接展示，不再额外点开“翻译”
- 句子详情里的主播放按钮固定放在句子右侧，与下方其他播放入口保持一致位置语言

页面仍保留自身职责：

- 组装 sentence / chunk / scene loop 的业务 payload
- 触发页面特有的预热、埋点和 UI 副作用
- 决定错误提示文案

这样做的边界是：

- `tts-api.ts` 继续负责底层生成、播放和全局状态
- `use-tts-playback-controller.ts` 负责页面常见编排
- 页面组件只保留本页业务语义，不再手写完整播放状态机

### 6.3 实际播放策略

#### sentence / chunk

- `playSentenceAudio()`
- `playChunkAudio()`

流程是：

1. 先把状态置为 `loading`
2. 走 `ensure*Audio()` 拿 URL
3. URL 拿到后切成 `playing`
4. 用单例 `playbackAudio` 播放
5. 若音频失败，退回浏览器 `speechSynthesis`
6. 若 `speechSynthesis` 也失败，则抛中文错误

#### scene full loop

- `playSceneLoopAudio()`

流程类似，但有几个明显差异：

- 强制 `isLooping = true`
- 直接让 `HTMLAudioElement.loop = true`
- 当前没有 `speechSynthesis` 兜底
- 更依赖完整 scene full 音频成功生成

### 6.3 停止播放

- `stopTtsPlayback()`

它会：

- 终止当前 `Audio`
- 清掉 `onended/onerror`
- 取消 `speechSynthesis`
- 重置全局播放状态

这也是重生成和页面切换前常见的收口点。

## 7. 预热与预加载触发点

### 7.1 scene 详情页加载完成

`src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.ts`

- 网络 lesson 回来后，调 `scheduleLessonAudioWarmup()`
- 默认预热：
  - 前 2 句 sentence
  - 第一批 chunk
  - `includeSceneFull: true`

### 7.2 scene 详情页内部播放交互

`src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`

- 页面挂载后 120ms，再调一次 `scheduleLessonAudioWarmup()`
- 打开 variant chunk 详情时：
  - 预热该句 sentence
  - 预热当前 chunk

### 7.3 scene 预取

`src/lib/cache/scene-prefetch.ts`

- 预取相关场景详情成功后，会顺手预热该场景的 1 句 sentence + 2 个 chunk
- 不包含 scene full

### 7.4 today 继续学习卡片

`src/features/today/components/today-page-client.tsx`
`src/lib/utils/scene-resource-actions.ts`

- `warmupContinueLearningScene()` 会在 idle 时拉取 lesson
- 然后调 `scheduleLessonAudioWarmup()`
- 主要用于继续学习前的轻量热身

### 7.5 chunks 页

`src/app/(app)/chunks/page.tsx`

- 列表加载后 120ms，对前 6 条表达做 chunk 预热
- 每条最多预热：
  - 表达文本本身
  - 第一条例句或来源句

此外，详情里点击“重新生成音频”会：

- 收集当前表达详情可读文本
- 调 `regenerateChunkAudioBatch()`
- 清浏览器缓存并重新预取

### 7.6 弱网控制

`src/lib/utils/resource-actions.ts`

- `scheduleLessonAudioWarmup()` 在 `includeSceneFull = true` 时，会先判断弱网
- 如果 `navigator.connection.saveData = true` 或 `effectiveType` 是 `2g/slow-2g`
- 就不会预热 scene full 音频

这条规则目前只作用于“整段场景预热”，不会阻止 sentence/chunk 轻量预热。

### 7.7 lesson / chunk 预热 key 统一规则

`src/lib/utils/resource-actions.ts` 现在提供了共享 key builder：

- `buildLessonAudioWarmupKey()`
- `buildChunkAudioWarmupKey()`

当前策略是：

- lesson 级等价预热默认共用同一 key
- 只有确实需要保留局部交互粒度时，才显式传自定义 key

这意味着：

- `scene detail` 首次进入
- `scene detail playback` 的页面级预热
- `scene prefetch`
- `today continue learning`

这些 lesson 级轻量预热现在会按统一 key 去重，不再因为入口不同就各自重复热一次。

## 8. 当前链路的实际优点

- 服务端和客户端都做了“先命中已有资源，再生成”的收口，不会每次都重新合成
- chunk / sentence / scene full 三类 key 分层比较清晰，复用边界明确
- 浏览器端把远端音频转存到 Cache Storage 后，能绕过签名 URL 时效问题
- 现在浏览器端缓存已经有明确上限，不再只靠 admin 手动清理
- 页面侧大多用 idle 调度做预热，避免主交互一上来就抢资源
- sentence / chunk 播放失败时有 `speechSynthesis` 兜底，用户不至于完全没声音
- 管理端已经具备浏览器 TTS 缓存查看与清理面板，排障成本可控

## 9. 已收口项与剩余关注点

这一节记录曾经的主要风险，以及当前仍需要继续观察的点。历史问题如果已经在后续阶段落地，会明确标为已收口。

### 已收口

#### 1. scene full 播放失败承接

曾经的问题：

- sentence / chunk 可以回退到 `speechSynthesis`
- `playSceneLoopAudio()` 曾经没有同等级 fallback

当前状态：

- 已有受控中文提示，不直接暴露上游错误
- 已记录 `scene_full_play_fallback` / `tts_scene_loop_failed`
- 已补 scene full 失败原因、准备态回看与 45 秒短时冷却
- 产品承接优先回到 block-first 路径；不自动引入逐句串播状态机

仍需注意：

- scene full 目前仍不做自动串播降级，这是刻意保留的最小方案
- 后续如果要做自动串播，应作为新的行为变更单独评估

#### 2. `regenerateChunkTtsAudioBatch()` 串行重生成

曾经的问题：

- 管理端批量重生成上限已经限制为 12
- 服务端曾经一条一条顺序删、顺序生、顺序传

当前状态：

- 已改成有界并发
- 当前并发上限固定为 `3`
- 失败项会记录结构化日志，并在任务结束后统一汇总

### 仍需关注

#### 1. 继续观察预热触发点是否还有非等价重复

现状：

- scene 详情加载后会热一次
- scene 播放 hook 里又会热一次
- scene prefetch、today continue、chunks 也会各自热

目前 lesson 级等价预热已经统一 key，但仍可能存在“lesson 级预热”和“局部交互预热”叠加命中的情况。

建议：

- 统一 lesson 音频预热 key 的命名策略
- 区分“页面首次进入预热”和“交互局部预热”

#### 2. 是否继续保留服务端“本地 public 写盘”

现状：

- 运行时生成时会尝试写 `public/audio/...`
- 但真正长期复用的是 Storage 签名 URL
- 服务端批量预热并不会同步写本地文件

这说明本地写盘不是主缓存层，只是附带兼容。当前已经明确它是本地开发/兼容产物。

建议：

- 如果线上已经完全依赖 Storage，可以考虑把这层职责缩小，减少维护心智负担

#### 3. Storage “是否存在”判断仍依赖创建签名 URL

现状：

- `getTtsStorageSignedUrlIfExists()` 本质是尝试创建 signed URL，再根据报错判断是否存在

建议：

- 如果未来这条链路压力变大，可以评估改成更直接的对象元信息查询
- 当前规模下先不一定需要动

## 10. 维护建议

以后只要动下面任何一类改动，建议同步回看这份文档：

- 音频 key 规则变化
- `/api/tts` 或 `/api/tts/regenerate` 的输入/权限变化
- scene/chunks/today 的预热策略变化
- 浏览器 Cache Storage 结构变化
- 播放状态与 fallback 逻辑变化

最低回归建议：

- `node --import tsx --test "src/lib/utils/tts-api.test.ts" "src/lib/utils/audio-warmup.test.ts" "src/app/api/tts/regenerate/route.test.ts"`

如果改到场景预取或 scene 详情加载，再加：

- `node --import tsx --test "src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.test.ts" "src/lib/cache/scene-prefetch.test.ts"`
## 11. 第四阶段补充

### 11.1 scene full 失败后的受控提示

- `playSceneLoopAudio()` 现在不再把上游原始错误直接透给页面。
- 当完整场景音频不可用时，会统一抛出“完整场景音频暂时不可用，你可以先逐句跟读或稍后重试。”
- 这次没有把 scene full 退化成逐句串播，只先做了最小可维护方案：稳定提示 + 保留逐句播放入口。

### 11.2 批量重生成的并发边界

- `regenerateChunkTtsAudioBatch()` 已从串行执行改成有界并发。
- 当前并发上限固定为 `3`，目的是缩短批量重生成耗时，同时避免把上游 TTS 和存储写入瞬间打满。
- 每个失败项都会记录结构化日志，日志里带 `chunkKey` 与错误上下文，方便按 `requestId` 或模块名追踪。

### 11.3 批量失败的汇总约定

- 批量任务不会在首个失败时立刻中断剩余项。
- 本轮可执行项会继续跑完，最后统一汇总失败数并抛出摘要错误。
- 摘要错误至少包含失败数量和首个失败的 `chunkKey`，便于管理端快速定位。

### 11.4 本轮建议回归

- `node --import tsx --test "src/lib/utils/tts-api.test.ts" "src/lib/utils/tts-api.scene-loop.test.ts" "src/lib/server/tts/service.test.ts" "src/app/api/tts/regenerate/route.test.ts"`

## 12. 第五阶段补充

### 12.1 scene full 失败后的替代 CTA

- `use-lesson-reader-playback.ts` 现在在 scene full 播放失败时，不只弹错误提示。
- 若当前能定位到激活句或首句，会额外给出“改为逐句跟读”的 CTA。
- 点击 CTA 后会直接走现有 `toggleSentencePlayback(...)`，不额外引入新的串播状态机。

### 12.2 最小失败摘要

- scene full 失败时，会记录 `tts_scene_loop_failed`
- 摘要至少包含：
  - `sceneSlug`
  - `activeSentenceId`
  - `fallbackSentenceId`
  - `message`
- 用户点击替代 CTA 时，还会记录 `tts_scene_loop_fallback_clicked`

### 12.3 这一轮刻意没做的事

- 没把 scene full 自动降级为逐句串播
- 没引入新的音频错误上报服务
- 没改变 `tts-api.ts` 的底层生成/缓存策略

当前仍然保持最小可维护方案：受控错误 + 显式替代入口。

## 13. scene block-first 音频预热补充

### 13.1 主消费单元

scene detail 页的主播放单元已经从“单句 sentence”调整为“可播放 block”：

- dialogue 气泡的朗读按钮会播放整个 block。
- block 音频仍复用现有 `sentence` TTS kind，不新增 `/api/tts` 协议。
- block 的 `sentenceId` 统一使用 `block-${block.id}`。
- block 的朗读文本来自 `block.tts`，没有时拼接 block 内句子的 `tts / audioText / text`。

### 13.2 预热优先级

- 首屏预热优先入队前几个 block。
- idle 增量预热小批量补齐后续 block。
- 用户播放某个 block 后，提权后续 block。
- scene full 继续后台准备，但不得压制当前点击播放。
- sentence 音频保留为明确单句消费、chunk detail 或 fallback CTA 的按需资源。

### 13.3 observability 说明

由于 block 音频复用现有 sentence TTS 通道，`sentence_audio_play_hit_cache` / `sentence_audio_play_miss_cache` 事件中可能出现 `sentenceId = block-*`。这代表当前播放的是 block 级音频，不是独立 sentence。

为避免兼容层污染业务语义，事件 payload 必须同时带 `audioUnit`：

- `audioUnit = block`：scene detail 的 block 音频，当前只是复用 sentence TTS kind。
- `audioUnit = sentence`：真实单句音频，通常来自明确单句消费、fallback 或其他按需入口。

浏览器 TTS 缓存面板也会把 `sentence:...:sentence-block-*` 展示为 `block` 类型，避免调试时误以为系统仍在主预热真实 sentence。

当前统一口径：

- scene detail Primary：block。
- scene detail Secondary：scene full。
- scene detail Fallback：sentence。
- chunk / phrase 工作台 Primary：chunk / phrase audio。

## 14. scene full 失败诊断与冷却补充

scene full 现在不再只记录泛化的 `Failed to generate tts audio.`。失败链路会尽量归一到稳定原因：

- `provider_error`
- `timeout`
- `segment_assembly_failed`
- `storage_upload_failed`
- `signed_url_failed`
- `empty_audio_result`
- `cooling_down`
- `unknown`

前端 `playSceneLoopAudio()` 会用 scene full 稳定 cache key 维护短时失败冷却。默认冷却窗口是 45 秒；同一个 scene full 最近失败后，冷却期内再次点击不会重新触发生成，而是直接记录 `scene_full_play_cooling_down`，并走受控 fallback 提示。

scene full 播放回看事件现在会携带更明确的状态：

- `scene_full_play_ready`：资源已 ready。
- `scene_full_play_wait_fetch`：资源处于 `cold` 或 `pending`。
- `scene_full_play_cooling_down`：最近失败，当前不再重复请求。
- `scene_full_play_fallback`：进入 fallback，payload 包含 `failureReason`、`sceneFullKey`、`readiness` 和 `cooldownMs`。

产品承接上，scene full 失败后优先回到 block-first 路径：如果能定位当前 block，CTA 会继续当前段落；不能定位时才回退到 active sentence 或首句。
