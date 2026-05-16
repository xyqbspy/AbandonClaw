# Tasks

## 1. Warmup observability

- [x] 1.1 在 `scene-audio-warmup-scheduler.runTask` 完成路径上发 `warmup_task_finished`，附 status (loaded/failed/skipped) + kind + sceneSlug + priority + source + durationMs
- [x] 1.2 在 `enqueueSceneAudioWarmupTask` 内对已存在 task 的 promote / reset 路径分别发 `warmup_task_promoted` / `warmup_task_reset`
- [x] 1.3 在 `resource-actions.scheduleSceneIdleAudioWarmup.shouldPauseRound` 命中暂停时，发 `warmup_idle_round_skipped` 附原因 (page-hidden / save-data-or-2g / playback-loading / interaction-recent)
- [x] 1.4 补 unit test 验证事件被正确触发（mock recordClientEvent）

## 2. Cross-scene cancel

- [x] 2.1 `scene-audio-warmup-scheduler` 新增 `cancelWarmupsBySceneSlug(sceneSlug)`：把所有 queued 任务标记 skipped 并从 map 删除，loading 任务调对应 AbortController
- [x] 2.2 维护 `key → AbortController` 映射，task 进入 loading 时创建 controller，进入终态后清理
- [x] 2.3 `requestTtsUrl` 接 optional `signal: AbortSignal`，传给底层 `fetch`；abort 时不 cache 也不 preload
- [x] 2.4 `ensureSentenceAudio` / `ensureSceneFullAudio` 接 optional signal 透传
- [x] 2.5 `runTask` 把 controller.signal 透传给底层 ensure 调用
- [x] 2.6 `use-scene-detail-playback` cleanup 时调 `cancelWarmupsBySceneSlug(currentSlug)`
- [x] 2.7 补 unit test：cancel 后 queued 任务不再执行；cancel 后 in-flight fetch 收到 abort

## 3. 推荐 scene 背景预热

- [x] 3.1 `today-page-client` 在 sceneList 加载完成后，识别前 N 个推荐 scene（N=2 默认）
- [x] 3.2 通过 `scheduleLessonAudioWarmup`（已有 `shouldAvoidHeavyAudioWarmup` 判 saveData/2g）warm 每个 scene 第 1 句，priority=background
- [x] 3.3 用 `scheduleIdleAction` 包裹，避免与 dashboard 加载竞争
- [x] 3.4 切换账号 / unmount 时不必额外清理（scheduler 内部已有 200/120 自动 prune）
- [x] 3.5 补 unit test：Today 加载完后正确发起前 2 个推荐 scene 的 warm

> 实现说明：直接复用 `src/lib/cache/scene-prefetch.ts` 的 `scheduleScenePrefetch`，它已经具备 idle callback 触发、saveData 跳过、scene cache 检查、scheduleLessonAudioWarmup 自动调用，无需另写。

## 4. Redis signed URL 缓存

- [x] 4.1 服务端封装 `getCachedSignedUrl(key)` / `setCachedSignedUrl(key, url, ttlMs)`，支持 Redis 优先 + 内存 fallback
- [x] 4.2 把 `service.ts` 里 `signedUrlCache: Map` 替换为 helper 调用，保留 `pendingSignedUrlRequests` 进程内（短时去重不需要跨进程）
- [x] 4.3 helper 在 `UPSTASH_REDIS_REST_URL` 缺失时优雅退化到内存 Map（不报错），保持本地开发零配置
- [x] 4.4 补 unit test：Redis 可用时走 Redis，不可用时走 Map fallback

## 5. Sentence/chunk failure cooldown

- [x] 5.1 `tts-api` 把现有 `sceneFullFailureCooldowns` 泛化为通用 `audioFailureCooldowns: Map<cacheKey, { failureCount, lastFailedAt, cooldownMs }>`
- [x] 5.2 失败次数 → cooldownMs 映射：1 次 0ms（立即可重试）、2 次 5s、3 次 60s、4 次 300s（5min）、5+ 次 1800s（30min 上限）
- [x] 5.3 scene_full 沿用 45s cooldown（保留旧行为），通过 `sceneFullFailureCooldowns` 独立入口实现
- [x] 5.4 `requestTtsUrl` 在请求前 check cooldown，命中冷却时直接 throw（不发 fetch），事件 `tts_request_cooling_down`
- [x] 5.5 成功时 `clearAudioRetryFailure(key)`
- [x] 5.6 补 unit test：连失败 → cooldown 升级 / 命中冷却时不发 fetch / 成功后重置 / scene_full 不进入泛化路径
- [x] 5.7 修复 record 在 cooldown 过期时被整个删除导致 ladder 无法升级的 bug：保留 failureCount，按 `lastFailedAt` 静默 30min 后才重置

## 6. 验证收尾

- [x] 6.1 跑相关 unit test：scene-audio-warmup-scheduler (14) / tts-api (16) / today-page-client (6) / signed-url-cache (5) / tts-warmup-registry (7) / scene-loop（2）= 50/50 通过
- [x] 6.2 跑 lint，无新增 warning（仅 2 个旧 warning，不在改动文件内）
- [x] 6.3 跑 tsc --noEmit：我修改/新增的文件无新增错误（其它 pre-existing test 错误未动）
- [x] 6.4 检查改动文件 UTF-8 无乱码（`text:check-mojibake` 通过）
- [ ] 6.5 不提交，等待用户审核
