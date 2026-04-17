# Tasks

## 1. Failure reason model
- [x] 1.1 定义 scene full failure reason 类型与归一化 helper
- [x] 1.2 在服务端 scene full 生成链路补充关键失败原因上下文
- [x] 1.3 在前端 `playSceneLoopAudio()` fallback 事件中写入 `failureReason`

## 2. Cooldown
- [x] 2.1 为 scene full 增加按稳定 key 记录的失败冷却状态
- [x] 2.2 冷却窗口内阻止同 scene full 立即重新生成
- [x] 2.3 成功 ready / 播放后清理对应冷却状态
- [x] 2.4 测试 reset 覆盖冷却状态清理

## 3. Readiness and observability
- [x] 3.1 将 scene full readiness 细分为 `ready` / `cold` / `pending` / `failed_recently` / `cooling_down`
- [x] 3.2 补充 `scene_full_play_cooling_down` 或等价事件
- [x] 3.3 更新 `scene_full_play_ready` / `wait_fetch` / `fallback` payload
- [x] 3.4 更新 admin client events 回看测试

## 4. Block fallback UX
- [x] 4.1 full 失败后优先定位当前 block，无法定位再退到 active sentence / 首句
- [x] 4.2 优化 toast / CTA 文案为“继续从当前 block / 逐段跟读”
- [x] 4.3 CTA 继续复用现有 block 或 sentence 播放链路，不新增串播状态机

## 5. Tests and docs
- [x] 5.1 补充 `tts-api.scene-loop.test.ts` 覆盖 failure reason、冷却、冷却过期、成功清理
- [x] 5.2 补充服务端 TTS service 测试覆盖 scene full 失败原因
- [x] 5.3 补充 lesson reader fallback CTA 测试
- [x] 5.4 更新 `docs/system-design/audio-tts-pipeline.md` 与 `docs/dev/dev-log.md`
- [x] 5.5 运行最小回归与 OpenSpec 校验

## Suggested Verification

- `node --import tsx --test src/lib/utils/tts-api.scene-loop.test.ts src/lib/utils/tts-api.test.ts src/lib/utils/client-events.test.ts`
- `node --import tsx --test src/lib/server/tts/service.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/lesson/audio/use-lesson-reader-playback.test.tsx`
- `node_modules\\.bin\\openspec.CMD change validate "scene-full-failure-diagnostics-and-cooldown" --strict --no-interactive`
- `pnpm run text:check-mojibake`
