# 当前核心数据表到 MySQL / MyBatis Mapper 映射清单

## 1. 这份文档解决什么问题

这份文档回答的是数据层问题：

- 当前项目后端的核心表有哪些
- 哪些表是共享资源，哪些表是用户私有状态，哪些表是运行态
- 如果改成 `MySQL + MyBatis`，这些表应该怎么分 Mapper
- 哪些表适合先迁，哪些表应该后迁
- 哪些表天然需要事务、缓存、幂等或并发保护

它和 `api-to-java-controller-mapping.md` 配套使用：

- 那份文档解决“接口怎么落到 Java Controller / Service”
- 这份文档解决“数据怎么落到 MySQL / Mapper”

## 2. 映射原则

### 2.1 先按数据职责分层，不按 migration 文件分

当前 `supabase/sql/*.sql` 是阶段性演进记录。  
Java 重写时不要按 migration 文件拆 Mapper，而要按数据职责拆：

- 共享资源表
- 用户私有表
- 学习运行态表
- 后台 / 缓存 / 生成辅助表

### 2.2 先保留“一个领域一组 Mapper”的粒度

不要一开始拆太细。  
更适合当前阶段的粒度是：

- `SceneMapper`
- `UserSceneProgressMapper`
- `UserSceneSessionMapper`
- `PhraseMapper`
- `UserPhraseMapper`
- `ReviewLogMapper`
- `ExpressionClusterMapper`
- `PracticeSetMapper`
- `PracticeRunMapper`
- `VariantRunMapper`

而不是一开始就拆成几十个超小 Mapper。

### 2.3 先迁主链路最值钱的表

优先级建议：

1. 支撑只读接口的核心表
2. 支撑核心写接口的用户私有表
3. 支撑 practice / variant 的运行态表
4. 支撑生成、缓存、后台任务的辅助表

## 3. 当前核心表分组

基于现有 `supabase/sql/*.sql` 和数据边界审计，当前最重要的表可以先分成四组。

### 3.1 共享资源表

- `profiles`
- `scenes`
- `scene_variants`
- `phrases`

特点：

- 不完全是某个用户私有数据
- 会被多个用户共享读取
- 更接近“内容资源表”

### 3.2 用户私有状态表

- `user_scene_progress`
- `user_daily_learning_stats`
- `user_scene_sessions`
- `user_phrases`
- `phrase_review_logs`
- `user_phrase_relations`
- `user_expression_clusters`
- `user_expression_cluster_members`

特点：

- 以 `user_id` 为天然归属边界
- 当前很多权限依赖 RLS
- Java 重写后要改成应用层 ownership 校验

### 3.3 学习运行态表

- `user_scene_practice_sets`
- `user_scene_practice_runs`
- `user_scene_practice_attempts`
- `user_scene_variant_runs`

特点：

- 和练习、题集、运行过程强相关
- 读写频率高
- 更容易涉及幂等、事务、并发和恢复逻辑

### 3.4 辅助与可后迁表

- `ai_cache`
- `chunks`
- `user_chunks`
- `scene_phrase_recommendation_state`

特点：

- 有价值
- 但不是 Java 重写第一阶段最需要先拿下的表

## 4. 共享资源表映射

### 4.1 `scenes`

来源：

- `supabase/sql/20260316_init_auth_scenes_cache.sql`

当前职责：

- 场景内容主表
- 列表、详情、可见性判断的核心资源表

推荐 MySQL 表定位：

- 继续作为内容主表保留

推荐 Mapper：

- `SceneMapper`

推荐 Service 依赖：

- `SceneQueryService`
- `LearningQueryService`
- `RecommendationService`

建议先支持的查询：

- 按 slug 查详情
- 列表分页 / 列表查询
- 按多个 sceneId 批量查

特别注意：

- 当前 Postgres 里部分“是否可见”的逻辑带 RLS / policy 语义
- Java 重写后要在查询层补显式可见性判断，不能指望数据库策略兜底

### 4.2 `scene_variants`

来源：

- `supabase/sql/20260316_init_auth_scenes_cache.sql`

当前职责：

- 场景变体资源
- scene detail / variants 视图依赖它

推荐 Mapper：

- `SceneVariantMapper`

是否第一阶段必做：

- 不是第一优先级
- 但在 scene 学习链路推进后会很快用到

### 4.3 `phrases`

来源：

- `supabase/sql/20260317_phrase_favorites_mvp.sql`

当前职责：

- 共享表达资源池
- `user_phrases` 通过 `phrase_id` 关联到它

推荐 Mapper：

- `PhraseMapper`

说明：

- 这是共享表，不是用户私有表
- 当前仍有一部分后台白名单 / service role 逻辑依赖它

特别注意：

- Java 重写后，这张表要明确区分“共享资源写入”和“用户私有收藏写入”
- 不要把 `phrases` 和 `user_phrases` 混成一张表

## 5. 用户私有主链路表映射

### 5.1 `user_scene_progress`

来源：

- `supabase/sql/20260316_init_auth_scenes_cache.sql`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`
- `supabase/sql/20260324_phase16_scene_training_station_mvp.sql`
- `supabase/sql/20260331_phase19_sentence_completion_tracking.sql`

当前职责：

- 用户对某个 scene 的主进度
- today / continue / progress / complete 等主链路查询和写回都依赖它

推荐 Mapper：

- `UserSceneProgressMapper`

推荐 Service 依赖：

- `LearningQueryService`
- `LearningProgressService`
- `SceneLearningService`

建议先支持的操作：

- 按 `user_id + scene_id` 查单条进度
- upsert 进度
- 查 continue learning 候选
- 查 today / overview 聚合依赖字段

特别注意：

- 这是 Java 重写里最关键的表之一
- 当前文档已经提到：`learning progress` 的累积字段还缺更强的数据库级版本保护
- 如果迁到 MySQL，建议尽早补：
  - 乐观锁字段，或
  - 明确版本号 / 更新时间比较策略

### 5.2 `user_daily_learning_stats`

来源：

- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`

当前职责：

- 每日学习统计聚合

推荐 Mapper：

- `UserDailyLearningStatsMapper`

说明：

- 它很适合作为独立 Mapper
- 但通常不会单独成为一个大 Service
- 更适合作为 `LearningProgressService` / `ReviewSubmitService` / `PhraseSaveService` 的统计写入依赖

### 5.3 `user_scene_sessions`

来源：

- `supabase/sql/20260324_phase16_scene_training_station_mvp.sql`
- `supabase/sql/20260331_phase19_sentence_completion_tracking.sql`

当前职责：

- 用户当前学习会话
- 支撑恢复、当前步骤、会话进行中状态

推荐 Mapper：

- `UserSceneSessionMapper`

说明：

- 这张表很适合放在学习域
- 不建议和 `user_scene_progress` 合并

区别：

- `progress` 更偏长期结果
- `session` 更偏当前会话状态

### 5.4 `user_phrases`

来源：

- `supabase/sql/20260317_phrase_favorites_mvp.sql`
- 后续多个 phase 持续补字段

当前职责：

- 用户保存的表达主表
- review、chunks、relations、cluster、summary 都大量依赖它

推荐 Mapper：

- `UserPhraseMapper`

推荐 Service 依赖：

- `PhraseQueryService`
- `PhraseSaveService`
- `ReviewQueryService`
- `ReviewSubmitService`
- `ExpressionClusterService`

建议先支持的操作：

- mine 列表
- 按 `user_id + phrase_id` 查
- 保存 / 批量保存
- 删除
- review 状态读取与更新

特别注意：

- 这是另一张主链路核心表
- 当前字段已经承载：
  - 来源类型
  - review 状态
  - AI enrich 状态
  - 例句 / 补充信息
- Java 重写时不要急着做字段瘦身，先保证语义对齐

### 5.5 `phrase_review_logs`

来源：

- `supabase/sql/20260317_phase6_review_loop_mvp.sql`
- `supabase/sql/20260331_phase20_review_practice_signals.sql`

当前职责：

- 复习日志
- review 历史记录
- 递进式练习信号

推荐 Mapper：

- `PhraseReviewLogMapper`

推荐 Service 依赖：

- `ReviewQueryService`
- `ReviewSubmitService`

特别注意：

- `review/submit` 的事务通常至少会动：
  - `user_phrases`
  - `phrase_review_logs`
  - `user_daily_learning_stats`
- 所以这张表是 Java 练事务的重点表

### 5.6 `user_phrase_relations`

来源：

- `supabase/sql/20260321_phase13_user_phrase_relations.sql`

当前职责：

- 用户表达之间的关系边

推荐 Mapper：

- `UserPhraseRelationMapper`

说明：

- 这是典型业务关系表
- 适合和 `user_phrases` 配合使用
- 但不是第一阶段必须先迁的表

## 6. Expression Cluster 表映射

### 6.1 `user_expression_clusters`

来源：

- `supabase/sql/20260321_phase14_expression_clusters.sql`

当前职责：

- 用户表达聚类主表
- 记录 cluster 主表达等信息

推荐 Mapper：

- `UserExpressionClusterMapper`

### 6.2 `user_expression_cluster_members`

来源：

- `supabase/sql/20260321_phase14_expression_clusters.sql`

当前职责：

- cluster 成员表
- 和 cluster 主表一起支撑 merge / move / detach / set main

推荐 Mapper：

- `UserExpressionClusterMemberMapper`

特别注意：

- 这两张表经常一起动
- Java 重写时可以保留两个 Mapper
- 但 Service 上建议收敛成一个：
  - `ExpressionClusterMutationService`

事务建议：

- `merge / move / detach / set main` 必须走事务

## 7. Practice / Variant 运行态表映射

### 7.1 `user_scene_practice_sets`

来源：

- `supabase/sql/20260421_phase21_scene_practice_sets.sql`

当前职责：

- 用户题集本体
- 当前 practice 内容权威快照

推荐 Mapper：

- `UserScenePracticeSetMapper`

说明：

- 这张表非常关键
- 当前文档已经明确：题目本体应以服务端 set 为权威，本地缓存只是秒开和降级

Java 重写建议：

- 先把它当成独立资源表
- 不要和 `run / attempt` 混成一张大表

### 7.2 `user_scene_practice_runs`

来源：

- `supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql`

当前职责：

- 用户一次 practice run 的运行主记录

推荐 Mapper：

- `UserScenePracticeRunMapper`

### 7.3 `user_scene_practice_attempts`

来源：

- `supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql`

当前职责：

- run 下的每次答题 attempt

推荐 Mapper：

- `UserScenePracticeAttemptMapper`

说明：

- `set -> run -> attempt` 三张表建议明确分层
- 这组表最适合练：
  - ownership 校验
  - 事务
  - attempt 顺序号生成
  - 并发保护

### 7.4 `user_scene_variant_runs`

来源：

- `supabase/sql/20260325_phase18_scene_variant_runs_mvp.sql`

当前职责：

- scene variant 学习运行态

推荐 Mapper：

- `UserSceneVariantRunMapper`

说明：

- 这张表可以和 practice run 平行理解
- 不建议和 practice run 共用同一张运行态表

## 8. 辅助与可后迁表映射

### 8.1 `scene_phrase_recommendation_state`

来源：

- `supabase/sql/20260317_phase7_recommendation_exposure_mvp.sql`

推荐 Mapper：

- `ScenePhraseRecommendationStateMapper`

说明：

- 对推荐链路有价值
- 但不是 Java 重写第一阶段必迁表

### 8.2 `chunks` / `user_chunks`

来源：

- `supabase/sql/20260317_phase5_user_chunks_scene_generation_mvp.sql`

推荐 Mapper：

- `ChunkMapper`
- `UserChunkMapper`

说明：

- 这块可以后迁
- 因为当前你更需要先学主学习链路、复习链路、practice 链路

### 8.3 `ai_cache`

来源：

- `supabase/sql/20260316_init_auth_scenes_cache.sql`

推荐 Mapper：

- `AiCacheMapper`

说明：

- 这是典型“存在，但不要早做”的表
- Java 第一阶段不需要先把它收进来

## 9. 推荐的 MyBatis Mapper 分组

如果你现在就要建 Java 包，我建议先按下面这组起步：

### 第一批必须有

- `SceneMapper`
- `UserSceneProgressMapper`
- `UserSceneSessionMapper`
- `PhraseMapper`
- `UserPhraseMapper`
- `PhraseReviewLogMapper`
- `UserDailyLearningStatsMapper`

这批足够支持：

- scenes 列表 / 详情
- learning dashboard / continue
- phrases mine / summary / save
- review summary / due / submit

### 第二批再补

- `UserPhraseRelationMapper`
- `UserExpressionClusterMapper`
- `UserExpressionClusterMemberMapper`

### 第三批再补

- `UserScenePracticeSetMapper`
- `UserScenePracticeRunMapper`
- `UserScenePracticeAttemptMapper`
- `UserSceneVariantRunMapper`

### 第四批最后补

- `SceneVariantMapper`
- `ScenePhraseRecommendationStateMapper`
- `ChunkMapper`
- `UserChunkMapper`
- `AiCacheMapper`

## 10. 哪些表的写操作优先要事务

### 第一优先级

- `user_phrases`
- `phrase_review_logs`
- `user_daily_learning_stats`
- `user_scene_progress`
- `user_scene_sessions`

典型场景：

- 保存表达
- 提交复习
- 推进学习进度
- 更新 continue / overview 聚合

### 第二优先级

- `user_expression_clusters`
- `user_expression_cluster_members`
- `user_phrase_relations`

典型场景：

- merge
- move
- detach
- set main

### 第三优先级

- `user_scene_practice_sets`
- `user_scene_practice_runs`
- `user_scene_practice_attempts`
- `user_scene_variant_runs`

典型场景：

- 保存题集
- 启动 run
- 写入 attempt
- 完成模式或整轮练习

## 11. 哪些表优先需要 Redis 配合

Redis 不是替代 MySQL，而是配合 MySQL。

### 优先配合幂等

- `user_phrases`
- `phrase_review_logs`
- `user_scene_progress`
- `user_scene_sessions`

因为这些表对应的接口都有重复提交风险。

### 优先配合热点生成保护

- `user_scene_practice_sets`
- `ai_cache`
- 以及围绕 `phrases similar / expression-map / scenes generate / tts` 的生成结果

因为这些链路更容易碰到：

- 重复生成
- 热点请求
- 上游成本高

## 12. 当前最适合你的数据层开工顺序

如果你现在就开始写 Java + MyBatis，我建议顺序是：

1. 先建 `SceneMapper`
2. 再建 `UserSceneProgressMapper`
3. 再建 `UserPhraseMapper`
4. 再建 `PhraseMapper`
5. 再建 `PhraseReviewLogMapper`
6. 再建 `UserDailyLearningStatsMapper`
7. 然后再进 `PracticeSet / Run / Attempt`

这个顺序的好处是：

- 先把主学习链路和 review 跑起来
- 再去碰更复杂的运行态

## 13. 最后结论

对你现在这个阶段，最重要的不是一次性把所有表迁完，而是：

1. 先认清哪些是共享资源表
2. 先认清哪些是用户私有状态表
3. 先把最关键的 Mapper 建起来
4. 先让主链路读写在 Java 端跑通
5. 最后再处理生成、缓存、后台任务和辅助表

这样你的 Java 重写才会是“按业务价值推进”，而不是“按表数量推进”。
