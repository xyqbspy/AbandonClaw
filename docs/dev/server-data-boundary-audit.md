# 服务端数据边界审计

## 2026-04-15

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
