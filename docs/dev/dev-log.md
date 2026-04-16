# Dev Log

### [2026-04-16] 第五阶段：学习结果反馈与最小业务级可观测性

- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
第四阶段已经把 `today` 编排和音频可靠性收口到了可上线基线，但页面里的“我刚完成了什么、下一步为什么是这个”反馈仍偏弱。同时，当前已有 `requestId` 和服务端结构化日志，客户端关键学习动作还缺最小业务级事件摘要，排查用户在哪一步掉线仍不够直接。
#### 本次改动
- 新增 `src/lib/utils/client-events.ts`，提供最小 `recordClientEvent()` / `recordClientFailureSummary()`。
- `today` continue 卡片补充结果摘要，复用 `phrasesSavedToday / savedPhraseCount / dueReviewCount` 展示当前成果与下一步。
- `today` 打开 continue 场景与 review 时，分别记录 `today_continue_clicked`、`today_review_opened`。
- review 提交成功后，复用 `submitPhraseReviewFromApi()` 的 `summary` 给出“还剩多少”或“本轮先收住”的差异化提示，并记录 `review_submitted`。
- scene 学习 session 首次完成时，toast 会附带“已沉淀多少表达 / 下一步建议”，并记录 `scene_learning_completed`。
- scene full 播放失败时，记录 `tts_scene_loop_failed`；若能定位到当前句或首句，则提供“改为逐句跟读” CTA，点击后记录 `tts_scene_loop_fallback_clicked`。
- 同步更新 `today`、`review`、`audio` 相关文档与本阶段 OpenSpec tasks。
#### 影响范围
- 影响模块：`today`、`review`、`scene detail`、`lesson audio`、`docs/feature-flows`、`docs/system-design`
- 是否影响主链路：是
- 是否影响用户可感知行为：是
- 是否需要同步文档：是
#### 测试 / 验证
- `node --import tsx --test src/lib/utils/client-events.test.ts "src/app/(app)/scene/[slug]/scene-detail-notify.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/lesson/audio/use-lesson-reader-playback.test.tsx src/features/today/components/today-sections.test.tsx`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx" "src/features/today/components/today-page-client.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 当前业务事件仍只输出到客户端 console，还没进入正式埋点链路。
- 正式 `CHANGELOG.md` 继续按仓库规则留待合并 `main` 后更新；本轮已在 `openspec/changes/improve-learning-feedback-and-observability/changelog.md` 准备草案。

### [2026-04-16] 第四阶段：today 编排解释、TTS 可靠性与最小安全头

- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
第四阶段的目标是把前三阶段已经建立的接口治理基线继续往“体验稳定”和“可上线”推进一小步，重点不再是新增平台层，而是收口 `today` 的任务解释一致性、TTS 批量重生成与 scene full 播放的稳定性，以及补上最小安全头基线。
#### 本次改动
- `today` 任务构建逻辑现在会为任务补齐稳定元数据：`priorityRank`、`shortReason`、`explanationSource`。
- `today` 页面在学习路径区块顶部新增首要任务解释，能够明确说明当前为什么先推荐 continue / repeat / review。
- `playSceneLoopAudio()` 在 scene full 失败时改为抛出受控中文提示，不再直接暴露原始错误。
- `regenerateChunkTtsAudioBatch()` 改成有界并发执行，当前并发上限为 `3`，并对失败项做结构化日志记录与最终汇总抛错。
- `next.config.ts` 新增最小安全头：`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`。
- 同步更新了音频链路文档、today 推荐文档、发布检查清单与本阶段 OpenSpec tasks。
#### 影响范围
- 影响模块：`today`、`tts`、`next.config.ts`、`docs/dev`、`docs/system-design`、`docs/feature-flows`
- 是否影响主链路：是，但属于低风险收口，不改变学习主语义
- 是否影响用户可感知行为：是，today 页面会显示更明确的推荐原因，scene full 错误提示更稳定
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/features/today/components/today-page-selectors.test.ts`
  - `node --import tsx --import ./src/test/setup-dom.ts --test src/features/today/components/today-sections.test.tsx src/features/today/components/today-page-client.test.tsx`
  - `node --import tsx --test src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/server/tts/service.test.ts src/app/api/tts/regenerate/route.test.ts`
  - `node --import tsx -e "const mod = await import('./next.config.ts'); const config = mod.default?.default ?? mod.default; console.log(typeof config.headers)"`
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 这次只补了最小安全头，没有引入 CSP，避免误伤现有前端资源加载。
- `tts` 的上游 `Connect Error: {}` 仍然是已知异常，这次只是把错误收口和日志链路补得更清楚。
- 本轮没有改动 today 的服务端推荐排序，只是把现有优先级与解释来源显式化。

### [2026-04-15] 第三阶段：真实 HTTP baseline 与上线清单

- 类型：压测 / 验证 / 文档
- 状态：进行中
#### 背景
第三阶段要求把第二阶段已有的 in-process baseline 扩展到真实 HTTP 入口，并补一份可执行的上线前检查清单。真实入口下除了业务处理本身，还会经过 middleware、Origin 校验、cookie 鉴权和限流逻辑，结果更接近实际部署。
#### 本次改动
- 通过 `preview` 启动真实 HTTP 服务，并修复了两个直接阻塞构建的历史问题：
  - `scripts/load-api-baseline.ts` 的重复 `dryRun` 字段
  - `src/lib/server/request-schemas.ts` 的类型收窄不足
  - `src/app/api/practice/generate/route.ts` 缺失的校验常量与引用
- 用 service role 创建临时已确认用户和最小测试数据，拿到真实登录 cookie。
- 新增 [docs/dev/backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)。
#### HTTP baseline 结果
- `review submit`
  - 20 req / 并发 5
  - `200 x20`
  - P50 `743.25ms`
  - P95 `6089.40ms`
  - 平均 `2102.61ms`
- `learning progress`
  - 20 req / 并发 5
  - `200 x20`
  - P50 `713.69ms`
  - P95 `10120.13ms`
  - 平均 `3165.54ms`
- `practice generate`
  - 10 req / 并发 3
  - `200 x5`, `429 x5`
  - P50 `1399.83ms`
  - P95 `3244.33ms`
  - 平均 `1798.58ms`
  - 说明：当前结果验证了共享限流在真实 HTTP 入口下会按预期触发
- `tts`
  - 10 req / 并发 2
  - `200 x9`, `500 x1`
  - P50 `861.42ms`
  - P95 `7868.17ms`
  - 平均 `2237.09ms`
  - 说明：预览日志出现一次 `Connect Error: {}`，当前先按已知异常记录
#### 额外发现
- 第一轮 baseline 使用 `Origin: http://127.0.0.1:3000` 时，所有受保护写接口都返回 `403`
- 原因不是鉴权，而是 preview 环境内部识别的允许来源是 `http://localhost:3000`
- 将 `Origin` 改为 `http://localhost:3000` 后，真实 HTTP baseline 可正常进入业务链路
#### 测试 / 验证
- `pnpm preview:up`
- `node --import tsx scripts/load-api-baseline.ts ...`
- `node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts src/lib/server/rate-limit.test.ts`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 数据库侧独立冒烟验证 `4.2` 还没完成
- `tts` 的单次 `500` 还需要后续结合上游连接稳定性再看

### [2026-04-15] 第三阶段：数据库策略脚本验证

- 类型：验证 / 脚本 / 文档
- 状态：已完成
#### 背景
第三阶段最后一个缺口是 `4.2`：需要给数据库侧最小权限补一轮可重复执行的冒烟验证。但当前不计划直接改数据库，也没有额外的独立 SQL 执行环境，所以最稳妥的方式是补一个脚本验证当前仓库里的 `supabase/sql` 是否确实声明了审计中依赖的 RLS / policy。
#### 本次改动
- 新增 [scripts/validate-db-guardrails.ts](/d:/WorkCode/AbandonClaw/scripts/validate-db-guardrails.ts)
- 在 [package.json](/d:/WorkCode/AbandonClaw/package.json) 增加 `validate:db-guardrails`
- 脚本覆盖 11 张关键用户态表的最小策略声明检查：
  - `user_scene_progress`
  - `user_daily_learning_stats`
  - `user_scene_sessions`
  - `user_phrases`
  - `phrase_review_logs`
  - `user_phrase_relations`
  - `user_expression_clusters`
  - `user_expression_cluster_members`
  - `user_scene_practice_runs`
  - `user_scene_practice_attempts`
  - `user_scene_variant_runs`
#### 验证结果
- `pnpm run validate:db-guardrails`
- 结果：`11/11` 通过，未发现缺失的 RLS / policy 声明
- `pnpm run text:check-mojibake` 通过
#### 影响范围
- 影响模块：`scripts`、`package.json`、`docs/dev`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
#### 风险 / 未完成项
- 该脚本验证的是仓库 migration 声明，不是目标数据库实例的实时状态
- 若后续要做更强校验，仍建议在独立数据库环境里补一次真实 SQL 冒烟

### [2026-04-15] 第三阶段：数据库侧最小权限盘点

- 类型：审计 / 文档 / OpenSpec 实施
- 状态：已完成
#### 背景
第三阶段的首要任务是确认第二阶段切回用户上下文后的用户态表，数据库侧是否已有足够的 RLS / SQL 承接。如果没有，需要补 migration；如果已有，就要把现状和边界正式写清楚。
#### 本次改动
- 审计了 `supabase/sql` 下与 `learning / review / phrases / practice / variant` 相关的 migration。
- 确认 `user_scene_progress`、`user_daily_learning_stats`、`user_scene_sessions`、`user_phrases`、`phrase_review_logs`、`user_phrase_relations`、`user_expression_clusters`、`user_expression_cluster_members`、`user_scene_practice_runs`、`user_scene_practice_attempts`、`user_scene_variant_runs` 已有现存 RLS 或等效 SQL 约束承接当前用户态读写。
- 在 [docs/dev/server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md) 补充了表级策略映射、后台白名单入口和回滚说明。
#### 影响范围
- 影响模块：`supabase/sql`、`docs/dev`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 本轮以策略盘点和 migration 审计为主，暂未新增自动化测试。
#### 风险 / 未完成项
- 当前仍未验证真实数据库环境下的策略冒烟，需要留到 `4.2` 配合可用环境再执行。
- 本轮没有新增 SQL migration，因此不会引入新的数据库权限回归风险。

### [2026-04-15] 收口 phrases 剩余后台权限入口

- 类型：修复 / 接口治理 / 文档
- 状态：已完成
#### 背景
第二阶段收紧到后面，`phrases` 模块只剩共享 `phrases` 表和 AI enrich 还在业务 service 里直接创建 `service role` client。虽然权限范围已经很小，但边界还不够显式，不利于后续继续审计和收口。
#### 本次改动
- 新增 `src/lib/server/phrases/admin-repo.ts`，集中承接共享 `phrases` 表与 AI enrich 相关的后台白名单读写。
- `src/lib/server/phrases/service.ts` 改为只调用受限仓储入口，不再直接创建 `service role` client。
- 清理 `src/lib/server/review/service.ts` 中残留的无用 admin import。
#### 影响范围
- 影响模块：`phrases`、`review`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 待本轮最小测试与导入级 smoke check 一并验证
#### 风险 / 未完成项
- 共享 `phrases` 表与 AI enrich 仍保留后台权限，只是已显式隔离到白名单 repo
- 多实例共享限流、统一参数校验和最小压测仍待后续任务完成

### [2026-04-15] 收口高风险写接口的请求 schema 入口

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
第二阶段的 `3.2` 要求把高风险写接口的参数校验从零散 route 逻辑收口到统一入口。当前 `review submit`、`learning progress/complete`、`phrases save/save-all` 已经有校验，但实现分散，`phrases` 里还存在重复 normalize 逻辑。
#### 本次改动
- 新增 `src/lib/server/request-schemas.ts`，集中承接高风险写接口的请求解析与 normalize 逻辑。
- `review submit`、`learning progress`、`learning complete` 现在统一通过 schema helper 生成规范 payload。
- `phrases save`、`phrases save-all` 复用同一套请求 normalize 规则，避免两处维护相同字段默认值和裁剪逻辑。
#### 影响范围
- 影响模块：`review`、`learning`、`phrases`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/lib/server/idempotency.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/phrases/save/route.ts`
  - `src/app/api/phrases/save-all/route.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 当前只收口了 `review / learning / phrases` 的一批高风险写接口，高成本生成接口还未并入统一 schema 入口。
- 这一步保持旧规则不变，没有顺带收紧字段限制或补新错误码。

### [2026-04-15] 继续收口高成本生成接口的请求 schema

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
在 `review / learning / phrases` 的高风险写接口完成统一 schema 入口后，高成本生成接口里仍有一批分散校验逻辑，主要集中在 `explain-selection`、`scenes/generate`、`scenes/import`。
#### 本次改动
- 扩展 `src/lib/server/request-schemas.ts`，新增高成本生成接口的请求解析与 normalize helper。
- [src/app/api/explain-selection/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/explain-selection/route.ts) 改为复用统一 schema 入口。
- [src/app/api/scenes/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/scenes/generate/route.ts) 改为复用统一 schema 入口。
- [src/app/api/scenes/import/handlers.ts](/d:/WorkCode/AbandonClaw/src/app/api/scenes/import/handlers.ts) 改为复用统一 schema 入口。
#### 影响范围
- 影响模块：`explain-selection`、`scenes/generate`、`scenes/import`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/app/api/explain-selection/route.test.ts src/app/api/scenes/import/handlers.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/explain-selection/route.ts`
  - `src/app/api/scenes/generate/route.ts`
  - `src/app/api/scenes/import/handlers.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- `practice/generate` 仍保留独立的重量级校验与 payload 体积检查，尚未并入统一 schema 入口。
- 这一步仍然保持旧规则不变，没有追加更严格的字段限制。

### [2026-04-15] 收口 practice generate 的请求 schema 入口

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
高成本生成接口里最后一个还保留独立请求校验的入口是 `practice/generate`。这条链路有自己的 scene 体积限制和 `exerciseCount` 规范化逻辑，如果不一起收口，`3.2` 仍然不算闭环。
#### 本次改动
- 扩展 `src/lib/server/request-schemas.ts`，新增 `practice/generate` 的请求解析、scene 体积限制和 `exerciseCount` 规范化逻辑。
- [src/app/api/practice/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/practice/generate/route.ts) 的 handler 改为复用统一 schema 入口。
- 保留模型 fallback 和响应校验逻辑不变，没有改练习题生成语义。
#### 影响范围
- 影响模块：`practice/generate`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/app/api/practice/generate/route.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/practice/generate/route.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- `practice/generate` 文件里原有的本地校验 helper 还残留在文件中，但 handler 已经不再使用；后续可以单独做一轮死代码清理。
- 这一步仍然保持旧规则不变，没有追加更严格的字段限制。

### [2026-04-15] 将高成本接口限流升级为共享存储优先

- 类型：修复 / 接口治理 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段的 `3.1` 要求高成本接口在多实例部署下也保持一致限流。此前的 `rate-limit.ts` 只使用进程内 `Map`，在多实例环境里会被实例切换绕过。
#### 本次改动
- 重写 `src/lib/server/rate-limit.ts`，保持 `enforceRateLimit` 名称和入参不变，但底层升级为：
  - 优先使用 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 提供的共享存储
  - 共享存储异常时自动回退到进程内内存限流
- 新增 [src/lib/server/rate-limit.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/rate-limit.test.ts)，覆盖内存模式、共享模式和共享失败 fallback。
- 相关高成本路由改为 `await enforceRateLimit(...)`，不改变业务错误契约。
- 更新 [.env.example](/d:/WorkCode/AbandonClaw/.env.example) 说明共享限流环境变量。
#### 影响范围
- 影响模块：`rate-limit`、`tts`、`practice/generate`、`explain-selection`、`scenes/import`、`scenes/generate`
- 是否影响主链路：是，但只影响超限判定与多实例一致性
- 是否影响用户可感知行为：是，多实例下的限流会更稳定
- 是否需要同步文档：是
#### 测试 / 验证
- 待本轮最小测试与路由回归一并验证
#### 风险 / 未完成项
- 当前共享后端只接了 Upstash REST 约定，没有再抽象更多 provider。
- 共享后端失败时会退回本地内存限流，保证可用性优先，但这意味着极端故障下会退回单实例行为。

### [2026-04-15] 补最小压测脚本与执行入口

- 类型：工具 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段的 `4.2` 需要把“最小压测脚本 + 结果记录”补齐。当前仓库没有现成的 load script，也没有统一的执行入口。
#### 本次改动
- 新增 [scripts/load-api-baseline.ts](/d:/WorkCode/AbandonClaw/scripts/load-api-baseline.ts)，提供零依赖的最小压测脚本，支持：
  - `base-url / path / method`
  - `requests / concurrency`
  - `body-file`
  - `cookie / origin`
  - `idempotency-key-prefix`
  - `dry-run`
- 新增 [scripts/load-handler-baseline.ts](/d:/WorkCode/AbandonClaw/scripts/load-handler-baseline.ts)，提供当前环境可执行的 in-process handler baseline，直接压：
  - `review-submit`
  - `learning-progress`
  - `practice-generate`
- 新增 [scripts/load-samples/practice-generate.sample.json](/d:/WorkCode/AbandonClaw/scripts/load-samples/practice-generate.sample.json) 作为最小样例 payload。
- 在 [package.json](/d:/WorkCode/AbandonClaw/package.json) 增加 `load:api-baseline` 和 `load:handler-baseline` 脚本入口。
#### 测试 / 验证
- 已运行：
  - `node --import tsx scripts/load-api-baseline.ts --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json --requests=6 --concurrency=2`
- 已运行：
  - `node --import tsx scripts/load-handler-baseline.ts --requests=30 --concurrency=5`
- in-process baseline 结果：
  - `review-submit`：30 req / 并发 5，状态全 `200`，P50 `0.38ms`，P95 `10.04ms`，平均 `2.1ms`
  - `learning-progress`：30 req / 并发 5，状态全 `200`，P50 `0.44ms`，P95 `0.65ms`，平均 `0.47ms`
  - `practice-generate`：30 req / 并发 5，状态全 `200`，P50 `0.64ms`，P95 `2.18ms`，平均 `0.9ms`
- 已运行：
  - `node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts`
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 还没有在真实可访问的本地/预览服务上拿到 HTTP 层基线。
- 当前记录的是 in-process handler baseline，更适合做代码回归对比，不等价于完整网络链路压测。

### [2026-04-15] 第二阶段先补关键写接口幂等与数据边界盘点

- 类型：修复 / 接口治理 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段原本同时包含数据边界收紧、关键写接口一致性和共享限流升级，但共享限流缺少现成基础设施，数据库边界收紧又会直接触及主链路和 RLS。为了先降低真实线上风险，这一轮优先落了关键写接口幂等去重、`service role` 使用盘点和 `phrases` 写接口来源校验补齐。
#### 本次改动
- 新增 `src/lib/server/idempotency.ts`，提供统一的服务端幂等 key 构造、header 读取和进程内去重 helper。
- `review submit` 现在会对相同幂等 key 或相同请求指纹做短窗口去重，避免 review 结果和 summary 连续写两次。
- `learning start/pause/progress/complete` 现在会对同一场景、同一请求指纹做短窗口去重，降低重复点击和网络重试带来的重复推进。
- `phrases save`、`phrases save-all` 接口补上了来源校验，并接入相同的服务端去重能力。
- `phrases save-all` 开始复用统一对象数组校验 helper，减少局部手写校验。
- 新增 [server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md)，记录 `scene / learning / review / phrases` 当前 `service role` 使用点、暂定白名单和后续迁移优先级。
- 补充把 `scene` 仓储里的用户态读取切到 `createSupabaseServerClient`，优先收紧 `listVisibleScenes*` 和 `listUserSceneProgressBySceneIds` 这批由 RLS 可直接承接的查询。
- 继续把 `review / phrases` 的第一批纯用户态读取切到 `createSupabaseServerClient`，包括 review summary、due review、短语 mine 列表、关系查询和 cluster 只读查询。
- 再继续把 `learning` 的第一批用户态读取切到 `createSupabaseServerClient`，覆盖 progress/session 前置读取、continue/today/overview/list 聚合和 repeat run 续接读取。
- 进一步把 `learning` 的自有写表 helper 切到 `createSupabaseServerClient`，包括 `upsertDailyStats`、`upsertProgress`、`upsertSession`。
- 继续把 `review / phrases` 的用户自有写表切到 `createSupabaseServerClient`，包括 `submitPhraseReview`、`user_phrases` 写入、`user_phrase_relations`、expression cluster/member、daily stats 和 scene progress 镜像计数。
- 再继续把 `practice / variant` 运行态读写 helper 切到 `createSupabaseServerClient`，包括 practice run、attempt、repeat continue 和 variant run 相关用户表。
- 继续把 `expression-clusters` 服务层切到 `createSupabaseServerClient`，让 cluster/member 的用户自有读写与移动/合并链路统一走用户上下文。
#### 影响范围
- `src/lib/server/idempotency.ts`
- `src/app/api/review/handlers.ts`
- `src/app/api/learning/scenes/[slug]/*`
- `src/app/api/phrases/save/route.ts`
- `src/app/api/phrases/save-all/route.ts`
- `src/lib/server/validation.ts`
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/lib/server/idempotency.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 额外导入验证：
  - `src/app/api/phrases/save/route.ts`
  - `src/app/api/phrases/save-all/route.ts`
  - `src/app/api/learning/scenes/[slug]/progress/route.ts`
  - `src/app/api/learning/scenes/[slug]/complete/route.ts`
  - `src/lib/server/scene/repository.ts`
  - `src/lib/server/scene/service.ts`
  - `src/lib/server/review/service.ts`
  - `src/lib/server/phrases/service.ts`
  - `src/lib/server/learning/service.ts`
#### 风险 / 未完成项
- 当前幂等去重仍是进程内存级，无法覆盖多实例部署。
- 本轮已完成 `scene / review / phrases / expression-clusters / learning / practice / variant` 主要用户自有读写迁移；共享 `phrases` 表和 AI enrich 仍未完全迁移。
- 共享限流升级和最小压测脚本仍待后续继续完成。

### [2026-04-14] 落地后端接口治理第一阶段基线

- 类型：修复 / 维护规范 / 测试
- 状态：已完成

#### 背景
当前后端接口层虽然已经有基础鉴权、部分参数校验和上游超时控制，但接口治理能力仍然分散在各个 route 和 handler 里：
- 缺少统一 `requestId`，接口报错后很难把 middleware、route 和 service 串起来排查。
- 高成本接口缺少统一限流基线，容易被短时间重复请求放大成本。
- 受保护写接口缺少统一同源来源校验，cookie 鉴权下仍存在基础跨站调用风险。
- 未知内部错误虽然大多会走 fallback 文案，但响应结构没有统一追踪标识，日志也主要依赖散点 `console`。

这次实现按 OpenSpec `govern-backend-api-guardrails` change 落地第一阶段基线，只改入口治理，不改学习/复习/场景的业务语义。

#### 本次改动
- 新增 `src/lib/server/request-context.ts`，统一生成、读取和透传 `x-request-id`。
- 新增 `src/lib/server/logger.ts`，约束接口错误日志至少输出 `requestId`、路径、方法和错误上下文。
- 新增 `src/lib/server/request-guard.ts`，提供最小同源来源校验 helper。
- 新增 `src/lib/server/rate-limit.ts`，提供进程内窗口限流 helper。
- 扩展 `src/lib/server/errors.ts`，新增 `RateLimitError`。
- 扩展 `src/lib/server/api-error.ts`，让显式应用错误与未知内部错误都返回 `requestId`，并同步写回响应头。
- 改造 `middleware.ts`，为受保护请求补充 `x-request-id` 透传。
- 为第一批高风险接口接入入口治理：
  - `tts`
  - `tts/regenerate`
  - `scenes/import`
  - `scenes/generate`
  - `practice/generate`
  - `explain-selection`
- 为第一批核心写接口接入同源来源校验：
  - `review/submit`
  - `learning/scenes/[slug]/start`
  - `learning/scenes/[slug]/pause`
  - `learning/scenes/[slug]/progress`
  - `learning/scenes/[slug]/complete`
- 补充并更新了 middleware、api-error、限流、来源校验及关键 route 的自动化测试。

#### 影响范围
- 影响模块：服务端接口入口治理、统一错误响应、请求级追踪
- 影响页面/接口：AI 生成、TTS、释义、学习进度、复习提交
- 是否影响主链路：是
- 是否影响用户可感知行为：是
现在超限请求、跨站来源请求和未知内部错误的接口响应会更早、更稳定地收口
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：
  - `node --import tsx --test middleware.test.ts src/lib/server/api-error.test.ts src/lib/server/request-guard.test.ts src/lib/server/rate-limit.test.ts src/app/api/tts/regenerate/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/practice/generate/route.test.ts src/app/api/scenes/import/handlers.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 导入验证：
  - `src/app/api/scenes/generate/route.ts`
  - `src/app/api/tts/route.ts`
  - `src/app/api/learning/scenes/[slug]/complete/route.ts`
- 未验证部分：
  - 未跑全量单测 / 交互测试
  - 未做多实例环境下的限流验证

#### 风险 / 未完成项
- 当前限流仍是进程内窗口限流，只适合第一阶段基线，不覆盖多实例一致性。
- 同源来源校验当前采用最小策略，对 `Origin` 缺失请求默认放行，优先避免误伤现有调用链。
- 这轮没有处理 `service role` 收紧、数据库权限边界和写接口幂等保护。
- 这轮没有把所有受保护写接口和所有高成本接口一次性全覆盖，仍保留残余风险。

#### 后续计划
- 第二阶段继续处理用户态接口的数据访问边界，减少对 `service role` 的直接依赖。
- 为关键写链路补幂等 / 并发保护。
- 如有真实流量压力，再把限流从进程内方案升级到共享存储方案。

本文档用于记录开发过程中的实际改动、重构说明、验证情况、影响范围与后续待办。
它不是正式发布用 CHANGELOG，也不要求只记录用户可感知变化。

---

## 使用原则

适合记录：
- 重构
- 删除旧功能
- 调整实现方式
- 补测试
- 修复局部问题
- 开发中间态决策
- 尚未发布但已经落地的行为调整
- 验证情况和已知风险

不适合记录：
- 与项目无关的临时实验
- 纯废话式过程描述
- 与代码改动无关的泛泛讨论

---

## 记录格式

每条记录建议包含：

- 日期
- 标题
- 类型
- 背景
- 本次改动
- 影响范围
- 测试 / 验证
- 风险 / 未完成项
- 后续计划

---

## 日志条目模板

### [YYYY-MM-DD] <标题>

- 类型：重构 / 修复 / 删除 / 测试 / 文档 / 行为调整
- 状态：进行中 / 已完成 / 待验证

#### 背景
说明为什么要做这次改动：
- 当前问题是什么
- 是历史包袱、功能缺陷、实现不合理，还是产品方向变化

#### 本次改动
- 改动 1
- 改动 2
- 改动 3

#### 影响范围
- 影响模块：
- 影响页面：
- 是否影响主链路：是 / 否
- 是否影响用户可感知行为：是 / 否
- 是否需要同步文档：是 / 否

#### 测试 / 验证
- 已运行测试：
- 手动验证路径：
- 未验证部分：

#### 风险 / 未完成项
- 风险 1
- 风险 2
- 尚未处理项 1
- 尚未处理项 2

#### 后续计划
- 下一步任务 1
- 下一步任务 2

---

## 示例

### [2026-04-08] 收敛 Today 推荐逻辑并移除旧入口

- 类型：重构
- 状态：已完成

#### 背景
旧的 Today 页面同时存在多个入口，推荐逻辑分散，AI 在后续开发中容易误判主入口，用户也缺乏清晰的下一步指引。

#### 本次改动
- 收敛 Today 主 CTA 的判断逻辑
- 删除重复的次级入口
- 将“继续当前训练”作为未完成 session 的优先动作

#### 影响范围
- 影响模块：Today、Session
- 影响页面：Today 首页
- 是否影响主链路：是
- 是否影响用户可感知行为：是
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：today 相关单测、推荐逻辑测试
- 手动验证路径：
  - 存在未完成 session 时进入 Today
  - review 积压时进入 Today
- 未验证部分：与变体训练联动的推荐优先级

#### 风险 / 未完成项
- review 与 scene 并存时的边界优先级仍需进一步明确
- 当前文案仍偏系统化，后续需要收敛

#### 后续计划
- 更新 feature-map 中 Today 模块说明
- 补一条 Today 推荐优先级的验收清单

---

## 维护建议

- 每次完成一轮真实改动后追加一条记录
- 重大重构优先记录“为什么改”和“主链路是否变化”
- 删除功能时一定记录删除依据
- 若行为变化已稳定且准备发布，再从这里提炼正式 CHANGELOG

---

### [2026-04-08] 收敛 docs 目录职责边界并迁移错层文档

- 类型：文档
- 状态：已完成

#### 背景
`docs/` 顶层 taxonomy 已经固定为 `feature-map / feature-flows / domain-rules / system-design / dev / meta`，但实际文档里仍有少量“规则层混入实现映射”的情况。继续放任不收口，会让后续 AI 和人工维护时很难判断文档应该补在哪一层。

#### 本次改动
- 新增 `docs/domain-rules/README.md`，固定规则层边界和核心术语
- 新增 `docs/system-design/README.md`，固定实现层边界
- 迁移并改名：
  - `docs/domain-rules/progress-overview.md -> docs/system-design/learning-overview-mapping.md`
  - `docs/domain-rules/review-practice-rules.md -> docs/system-design/review-practice-signals.md`
- 更新 `docs/README.md`、维护手册、项目学习指南和相关交叉引用
- 收敛 `learning-evidence.md` 中缺少落点的规范提示，改为明确指向 OpenSpec 主规范

#### 影响范围
- 影响模块：文档 taxonomy、阅读入口、维护入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：全局检索旧路径残留、复核新目录索引
- 手动验证路径：
  - 检查 `docs/domain-rules` 与 `docs/system-design` 当前文件列表
  - 检查 `docs/README.md` 阅读顺序是否覆盖实现层入口
- 未验证部分：docs 内其余历史绝对路径链接未做全量清扫

#### 风险 / 未完成项
- 仓库外部资料或历史聊天仍可能引用旧路径
- docs 内仍有部分旧式绝对路径和个别不可点击链接，后续可再统一一轮

#### 后续计划
- 后续新增规则文档优先落到 `domain-rules`，避免再写字段映射类文档
- 之后如再整理 docs，可单独做一轮链接格式统一

---

### [2026-04-08] 补齐 meta 目录入口并区分讲解文档职责

- 类型：文档
- 状态：已完成

#### 背景
`docs/meta/` 里已经有学习讲解文档、树状图、思维导图和导入大纲，但缺少目录级说明。后续维护时容易出现“同主题多份文档但不知道谁是主入口、谁只是展示变体”的问题。

#### 本次改动
- 新增 `docs/meta/README.md`
- 明确 `project-learning-guide.md`、`project-tree-map.md`、`project-mindmap.md`、`project-mindmap-outline.md` 的用途分工
- 在 `docs/README.md` 的 `meta` 示例里补上目录入口

#### 影响范围
- 影响模块：文档认知入口、分享材料维护入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：手动复核 `meta` 目录当前文件与 README 对应关系
- 手动验证路径：
  - 从 `docs/README.md` 进入 `meta/README.md`
  - 复核 `meta/README.md` 中各文件职责是否互补而不冲突
- 未验证部分：无

#### 风险 / 未完成项
- `project-tree-map.md` 与 `project-mindmap.md` 仍然存在内容上的天然重叠，后续若只更新其一，仍可能慢慢漂移

#### 后续计划
- 后续若继续精简 `meta`，优先保留 `project-learning-guide.md` 和 `project-tree-map.md` 作为主入口

---

### [2026-04-08] 统一 docs 目录 README 模板并收口核心正文结构

- 类型：文档
- 状态：已完成

#### 背景
`docs/` 顶层 taxonomy、目录入口和错层文档迁移完成后，剩下的问题不再是“文档放哪里”，而是“同类文档怎么写更一致”。如果目录 README 和核心正文没有统一模板，后续新增文档时仍会慢慢重新发散。

#### 本次改动
- 为 `feature-map / feature-flows / domain-rules / system-design / dev / meta` 六个目录 README 补齐建议正文模板
- 收口 `domain-rules` 核心正文：
  - `learning-evidence.md`
  - `review-scheduling-rules.md`
- 收口 `system-design` 对应正文：
  - `learning-overview-mapping.md`
  - `review-practice-signals.md`
- 收口 `feature-flows` 核心正文：
  - `today-recommendation.md`
  - `review-writeback.md`
  - `scene-training-flow.md`
  - `session-resume.md`

#### 影响范围
- 影响模块：文档模板、一致性、阅读体验
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：文档结构人工复核、全局检索主要旧标题和坏链格式
- 手动验证路径：
  - 复核 6 个目录 README 是否都包含目录说明与建议正文模板
  - 复核 `domain-rules / system-design / feature-flows` 核心正文是否已基本对齐模板
- 未验证部分：未对所有历史 `system-design` 文档逐篇做模板化收口

#### 风险 / 未完成项
- `scene-practice-generation.md`、`review-source-mapping.md`、`review-progressive-practice.md` 等历史 `system-design` 文档仍保留旧标题口径，但不影响当前阅读
- `scene-entry.md` 的章节风格比其它 `feature-flows` 更细，后续如需要可以再做一轮轻量统一

#### 后续计划
- 如果继续整理，优先收 `system-design` 中仍使用旧标题体系的几份专项文档
- 当前阶段可以先停止大范围文档改写，后续按需增量维护

---

### [2026-04-08] 新增项目产品说明总览文档

- 类型：文档
- 状态：已完成

#### 背景
仓库里已经有讲解文档、脑图、树状图和模块/链路文档，但缺少一份专门面向“产品定位、用户价值和整体闭环”的总览产品书。现有内容更适合内部讲解，不够适合直接拿来做产品说明。

#### 本次改动
- 新增 `docs/meta/product-overview.md`
- 从产品定位、目标用户、核心问题、产品结构、学习闭环、主要页面、关键能力和演进方向几个角度整理当前项目总览
- 在 `docs/meta/README.md` 中挂接产品总览入口

#### 影响范围
- 影响模块：文档认知层、产品说明入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：手动复核文档入口与内容结构
- 手动验证路径：
  - 从 `docs/meta/README.md` 进入 `product-overview.md`
  - 复核产品总览与 `project-learning-guide.md` 的职责区分
- 未验证部分：无

#### 风险 / 未完成项
- 后续如果产品定位或主闭环发生明显变化，需要同步更新该文档

#### 后续计划
- 后续如需要对外介绍项目，可在此基础上继续压缩成一页版介绍或 PPT 提纲

---

### [2026-04-08] 补齐 scenes、progress 与 chunks 详情专项维护文档

- 类型：文档
- 状态：已完成

#### 背景
仓库原本已经有 `today`、`review`、`scene practice`、`chunks data`、`audio tts` 等专项维护文档，但 `scenes` 列表页、`progress` 聚合页，以及 `chunks` 的 focus detail / expression map 仍缺独立说明。后续继续改这些区域时，只能翻代码和测试，不利于快速判断链路边界。

#### 本次改动
- 新增 `docs/feature-flows/scene-entry.md`
- 新增 `docs/system-design/learning-overview-mapping.md`
- 新增 `docs/system-design/chunks-focus-detail-map.md`
- 在 `docs/dev/project-maintenance-playbook.md` 挂接对应入口

#### 影响范围
- 影响模块：Scenes、Progress、Chunks
- 影响页面：`/scenes`、`/progress`、`/chunks`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：已复核文档索引与维护入口
- 未验证部分：无

#### 风险 / 未完成项
- 新文档目前是首版，后续若对应链路继续演进，需要继续维护
- 仍有部分旧文档命名体系未完全收口到新目录分层

#### 后续计划
- 后续文档新增优先收敛到 `feature-map / feature-flows / system-design / dev / meta`
- 继续减少“同一逻辑分散在多个说明文件”的情况

---

### [2026-04-08] 固定 feature-map 与 feature-flows 目录结构

- 类型：文档
- 状态：已完成

#### 背景
仓库开始引入 `docs/feature-map/`、`docs/feature-flows/`、`docs/dev/dev-log.md`、`docs/dev/testing-policy.md` 这一套新文档体系，但 `feature-map` 与 `feature-flows` 当时只有 README，缺少稳定子文档。若不先固定结构，后续文档会继续散落，模块地图和链路说明也会混写。

#### 本次改动
- 固定 `docs/feature-map/` 目录并补齐：
  - `today.md`
  - `scene.md`
  - `session.md`
  - `expression-item.md`
  - `review.md`
- 固定 `docs/feature-flows/` 目录并补齐：
  - `today-recommendation.md`
  - `scene-training-flow.md`
  - `session-resume.md`
  - `review-writeback.md`
- 更新两个 README 的索引和边界说明
- 在 `docs/dev/testing-policy.md`、`docs/dev/project-maintenance-playbook.md` 补入口

---

### [2026-04-08] 重构 docs taxonomy 并统一目录归类

- 类型：文档
- 状态：已完成

#### 背景
随着专项文档持续增加，原先的 `docs/` 顶层已经同时混放模块说明、链路说明、规则、系统设计、开发规范和项目认知文档。继续沿用旧结构会让维护入口越来越分散，也会让后续 AI 和人工维护时难以判断文档应该落在哪一层。

#### 本次改动
- 按 `feature-map / feature-flows / domain-rules / system-design / dev / meta` 六层 taxonomy 重构 `docs/`
- 迁移并重命名原有专项文档，例如：
  - `scenes-entry-flow.md -> feature-flows/scene-entry.md`
  - `progress-overview-mapping.md -> system-design/learning-overview-mapping.md`
  - `scene-practice-generation.md -> system-design/scene-practice-generation.md`
- 更新 `docs/README.md`、目录索引、维护手册和项目学习指南中的文档引用

#### 影响范围
- 影响模块：文档体系、维护入口、项目认知入口
- 影响页面：无直接页面影响
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：
  - 全局检索旧路径残留
  - 复核 `docs/README.md` 与 `docs/feature-flows/README.md` 索引
- 未验证部分：无

#### 风险 / 未完成项
- 部分历史聊天或外部资料仍可能引用旧路径，不在仓库本次迁移范围内
- 后续新增文档若不遵守 taxonomy，仍可能重新出现散落问题

#### 后续计划
- 后续新增文档统一先判断属于模块、链路、规则、系统设计、开发规范还是 meta
- 若 taxonomy 再扩展，优先先更新 `docs/README.md` 与维护规则

#### 影响范围
- 影响模块：文档体系、维护入口
- 影响页面：无直接页面影响
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：复核目录结构与 README 索引
- 未验证部分：无

#### 风险 / 未完成项
- 部分旧文档仍然使用旧命名习惯，后续还需要继续迁移或收口
- 新目录结构虽然固定了，但不同类别文档的边界仍需在后续改动中持续执行

#### 后续计划
- 后续主链路文档优先落到 `feature-flows/`
- 后续模块职责说明优先落到 `feature-map/`
