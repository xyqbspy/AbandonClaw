# 服务端数据边界审计

## 2026-04-15

### 第三阶段补充：数据库侧最小权限盘点

- 已切到 `createSupabaseServerClient` 的关键用户态表，数据库侧最小权限并不是空白，现有 `supabase/sql` 已经覆盖了本轮需要承接的主要 RLS。
- 本轮审计结论是：`1.1` 和 `1.2` 不需要新增 migration，现阶段以补齐“现有策略映射、白名单入口、回滚说明”为主。

### 已确认有 RLS / SQL 承接的关键用户态表

- `user_scene_progress`
  - SQL: `supabase/sql/20260316_init_auth_scenes_cache.sql`
  - 补充字段约束：
    - `supabase/sql/20260316_phase3_learning_loop_mvp.sql`
    - `supabase/sql/20260324_phase16_scene_training_station_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_daily_learning_stats`
  - SQL: `supabase/sql/20260316_phase3_learning_loop_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_scene_sessions`
  - SQL: `supabase/sql/20260324_phase16_scene_training_station_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_phrases`
  - SQL: `supabase/sql/20260317_phrase_favorites_mvp.sql`
  - 补充字段约束：
    - `supabase/sql/20260317_phase6_review_loop_mvp.sql`
    - `supabase/sql/20260318_phase9_manual_expression_source_fields.sql`
    - `supabase/sql/20260318_phase10_learning_item_type.sql`
    - `supabase/sql/20260319_phase11_ai_expression_enrichment_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `phrase_review_logs`
  - SQL: `supabase/sql/20260317_phase6_review_loop_mvp.sql`
  - 补充字段约束：`supabase/sql/20260331_phase20_review_practice_signals.sql`
  - 结论：当前服务层只依赖 `select/insert own`，现有策略与使用方式一致。
- `user_phrase_relations`
  - SQL: `supabase/sql/20260321_phase13_user_phrase_relations.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_expression_clusters`
  - SQL: `supabase/sql/20260321_phase14_expression_clusters.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_expression_cluster_members`
  - SQL: `supabase/sql/20260321_phase14_expression_clusters.sql`
  - 结论：通过 cluster ownership 间接约束成员表，已覆盖 `select/insert/update/delete own`。
- `user_scene_practice_runs`
  - SQL: `supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。
- `user_scene_practice_attempts`
  - SQL: `supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql`
  - 结论：已具备 `select/insert/delete own` 策略；当前服务只做插入与读取，不依赖更新。
- `user_scene_variant_runs`
  - SQL: `supabase/sql/20260325_phase18_scene_variant_runs_mvp.sql`
  - 结论：已具备 `select/insert/update/delete own` 策略。

### 第三阶段结论

- 现有数据库侧最小权限已经能承接第二阶段切回用户上下文的主要用户态读写。
- 本轮不新增新的 RLS migration，避免在缺少数据库回归环境时误改生产边界。
- 当前数据库侧剩余缺口主要不是“没有 RLS”，而是“需要把白名单入口、例外路径和回滚方式写清楚”。

### 后台白名单入口与回滚说明

- 继续保留 `service role` 的入口：
  - 共享 `phrases` 表的创建/查重/更新
  - AI enrich 对 `phrases / user_phrases` 的后台补全
  - 种子场景同步、导入清理、TTS 预热与跨用户后台任务
- 边界要求：
  - 这些入口必须集中在显式后台 repo 或后台任务调用路径中，不回流到普通用户态 service helper。
  - 用户态接口继续优先走 `createSupabaseServerClient` + 现有 RLS。
- 回滚方式：
  - 若后续发现数据库策略与服务层边界不一致，优先回退服务层调用到白名单后台入口，再单独修复 SQL。
  - 不在未验证环境里临时收紧共享 `phrases` 表和 AI enrich 的数据库策略。

### 本轮补充

- `phrases` 模块剩余必须保留后台权限的入口，已集中到 [src/lib/server/phrases/admin-repo.ts](/d:/WorkCode/AbandonClaw/src/lib/server/phrases/admin-repo.ts)
- [src/lib/server/phrases/service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/phrases/service.ts) 不再直接创建 `service role` client
- 当前白名单只覆盖两类场景：
  - 共享 `phrases` 表的查询/创建/更新
  - AI enrich 对 `phrases` / `user_phrases` 的后台更新

### 审计范围

- `src/lib/server/scene/*`
- `src/lib/server/learning/*`
- `src/lib/server/review/*`
- `src/lib/server/phrases/*`

### 当前 `service role` 使用概况

- `scene`
  - [src/lib/server/scene/repository.ts](/d:/WorkCode/AbandonClaw/src/lib/server/scene/repository.ts)
  - 当前用途：场景可见性查询、用户进度聚合、导入与种子场景维护
  - 判断：`listVisibleScenes*` 和 `listUserSceneProgressBySceneIds` 属于用户态查询，已在 2026-04-15 切到 `createSupabaseServerClient` + RLS；种子同步、导入写入与清理继续保留后台白名单
- `learning`
  - [src/lib/server/learning/service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/learning/service.ts)
  - 当前用途：学习进度、session、today/progress 聚合、practice/variant 续接
  - 判断：主链路读写几乎都是用户态；其中 progress/session 前置读取、continue/today/overview/list 聚合、repeat run 续接读取、`upsertDailyStats` / `upsertProgress` / `upsertSession`，以及 practice/variant 运行态读写 helper 已在 2026-04-15 切到 `createSupabaseServerClient`
- `review`
  - [src/lib/server/review/service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/review/service.ts)
  - 当前用途：due review 查询、review submit、summary 聚合、scene practice review 聚合
  - 判断：除少量共享资源读取外基本都属于用户态；`getDueReviewItems`、`getDueScenePracticeReviewItems`、`getUserPhraseReviewBuckets`、`getReviewSummary` 与相关 signal/cluster 读取已在 2026-04-15 切到 `createSupabaseServerClient`，`submitPhraseReview` 与 `addDailyReviewCompleted` 也已切到用户上下文
- `phrases`
  - [src/lib/server/phrases/service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/phrases/service.ts)
  - 当前用途：短语保存、批量保存、relation/cluster、AI enrich、mine 列表
  - 判断：保存、列表、关系查询属于用户态；其中 `listUserSavedPhrases`、`listUserSavedPhraseTextsByNormalized`、`listUserPhraseRelationsBatch`、`getUserPhraseSummary`、expression cluster 只读查询，以及 `user_phrases / user_phrase_relations / user_expression_clusters / user_expression_cluster_members / user_daily_learning_stats / user_scene_progress` 的用户自有写入都已切换；共享 `phrases` 表与 AI enrich 仍保留后台白名单

### 暂定白名单

- 后台任务与运维：
  - 种子场景同步
  - 导入场景删除
  - TTS 预热与资源清理
  - 跨用户聚合或后台脚本
- 暂不立即迁移：
  - 依赖后台聚合的 AI enrich
  - 复杂 cluster 维护链路

### 本轮已落地的最小保护

- `review submit`、`learning start/pause/progress/complete`、`phrases save/save-all` 已接入服务端幂等去重
- `phrases save`、`phrases save-all` 已补受保护写接口来源校验
- `save-all` 开始复用统一对象数组校验 helper
- `scene` 用户态读取已不再依赖 `service role`
  - `listVisibleScenesByUserId`
  - `getVisibleSceneBySlug`
  - `getVisibleSceneById`
  - `listVisibleScenesBySlugs`
  - `listUserSceneProgressBySceneIds`
- `review` 用户态读取第一批已不再依赖 `service role`
  - `getDueReviewItems`
  - `getDueScenePracticeReviewItems`
  - `getUserPhraseReviewBuckets`
  - `getReviewSummary`
  - `loadLatestReviewSignalsByUserPhraseId`
  - `loadClusterIdByUserPhraseId`
- `phrases` 用户态读取第一批已不再依赖 `service role`
  - `listUserSavedPhrases`
  - `listUserSavedPhraseTextsByNormalized`
  - `listUserPhraseRelationsBatch`
  - `getUserPhraseSummary`
  - `loadExpressionClusterContextMap`
  - `findExpressionClusterById`
  - `findExpressionClusterForPhrase`
- `review` 用户态自有写表也已不再依赖 `service role`
  - `submitPhraseReview`
  - `addDailyReviewCompleted`
- `phrases` 用户态自有写表也已不再依赖 `service role`
  - `savePhraseForUser` 中的 `user_phrases` 写入
  - `deleteUserPhraseForUser`
  - `upsertUserPhraseRelation`
  - `createExpressionCluster`
  - `assignPhraseToExpressionCluster`
  - `mergeExpressionClusters`
  - `writeClusterMembershipState`
  - `addDailyPhraseSaved`
  - `incrementSceneSavedPhraseCount`
  - `getOwnedUserPhraseForDelete`
- `expression-clusters` 服务层用户自有表也已不再依赖 `service role`
  - `ensureExpressionClusterForPhrase`
  - `setExpressionClusterMain`
  - `mergeExpressionClusters`
  - `detachExpressionClusterMember`
  - `moveExpressionClusterMember`
  - 以及对应的 cluster/member/ownership helper
- `learning` 用户态读取第一批已不再依赖 `service role`
  - `getProgressByUserAndScene`
  - `getLatestSessionByUserAndScene`
  - `countCompletedSentencesByUserAndScene`
  - `getLatestRepeatPracticeRun`
  - `getLatestRepeatVariantRun`
  - `getContinueLearningScene`
  - `getTodayLearningTasks`
  - `getLearningOverview`
  - `listLearningProgress`
  - `getRepeatPracticeContinueScene`
  - `getRepeatVariantContinueScene`
- `learning` 用户态核心自有写表也已不再依赖 `service role`
  - `upsertDailyStats`
  - `upsertProgress`
  - `upsertSession`
- `practice / variant` 用户态运行态表也已不再依赖 `service role`
  - `getLatestActiveRunBySet`
  - `getLatestRunBySet`
  - `hasCompletedSentenceAttempt`
  - `getLatestRepeatPracticeRun`
  - `upsertPracticeRun`
  - `getNextAttemptIndex`
  - `insertPracticeAttempt`
  - `getAttemptSummaryByRun`
  - `getLatestActiveRunBySet`（variant）
  - `getLatestRunBySet`（variant）
  - `upsertVariantRun`

### 剩余风险

- 当前幂等去重仍是进程内存级，只能降低重复点击和短时重试，不能覆盖多实例
- 数据库边界已完成 `scene / review / phrases / expression-clusters / learning / practice / variant` 的主要用户自有读写收紧；当前仍依赖 `service role` 的重点已收缩到共享 `phrases` 表和 AI enrich
- `learning progress` 的累计增量字段还没有数据库级版本保护
