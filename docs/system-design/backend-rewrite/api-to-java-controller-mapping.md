# 当前 API 到 Java Controller 映射清单

## 1. 这份文档解决什么问题

这份文档不是讲“为什么要重写”，而是回答更落地的问题：

- 当前项目有哪些后端 API
- 如果改成 Java 后端，这些 API 应该先落到哪些 Controller / Service
- 哪些接口适合先迁，哪些接口应该后迁
- 哪些接口天然需要幂等、限流、缓存或并发保护

这份文档默认目标是：

- 单体 Spring Boot 应用
- Maven 管理依赖
- MyBatis 负责数据访问
- Redis 负责限流、幂等、热点缓存和短期状态协调

## 2. 映射原则

先定三条规则，避免一开始拆得过碎。

### 2.1 先按业务域拆 Controller，不按页面拆

Java 后端建议优先按业务域建 Controller：

- `LearningController`
- `SceneController`
- `PracticeController`
- `ReviewController`
- `PhraseController`
- `ExpressionClusterController`
- `TtsController`
- `AdminController`

不要照着前端页面名拆成：

- TodayController
- ChunksPageController
- SceneDetailPageController

页面是前端视角，Java 后端更应该按领域能力来拆。

### 2.2 先做模块化单体，不做微服务

当前项目虽然业务域不少，但还不到一上来拆微服务的时机。  
建议先做：

- 一个 Spring Boot 应用
- 多个业务模块包
- 清晰的 Controller / Service / Mapper 分层

### 2.3 迁移顺序按风险走，不按数量走

优先级建议是：

1. 只读接口
2. 普通写接口
3. 带幂等的写接口
4. 高成本生成接口
5. TTS / AI / 后台任务接口

## 3. 当前 API 总览

当前仓库已有这些主要 API 分组：

- `auth`
- `me`
- `learning`
- `review`
- `phrases`
- `expression-clusters`
- `expression-map`
- `practice`
- `scene`
- `scenes`
- `recommendations`
- `tts`
- `admin`
- `chunks`
- `explain-selection`

从 Java 重写视角看，最值得优先映射的是主链路相关组：

- `learning`
- `review`
- `phrases`
- `expression-clusters`
- `scene / scenes`
- `practice`
- `recommendations`
- `tts`

## 4. 推荐的 Java 模块与 Controller 划分

### 4.1 `auth` / `me`

当前接口：

- `/api/auth/logout`
- `/api/me`

推荐落点：

- `AuthController`
- `UserController`

推荐 Service：

- `AuthService`
- `UserProfileService`

说明：

- 这部分先别做太重，先满足登录态识别、当前用户信息读取、退出登录即可。
- 如果前端短期还沿用现有认证方案，Java 端先做“识别登录用户”比“重写整套登录系统”更优先。

### 4.2 `learning`

当前接口：

- `/api/learning/continue`
- `/api/learning/dashboard`
- `/api/learning/progress`
- `/api/learning/scenes/[slug]/start`
- `/api/learning/scenes/[slug]/progress`
- `/api/learning/scenes/[slug]/pause`
- `/api/learning/scenes/[slug]/complete`
- `/api/learning/scenes/[slug]/training`
- `/api/learning/scenes/[slug]/practice/*`
- `/api/learning/scenes/[slug]/variants/*`

推荐落点：

- `LearningController`
- `LearningSceneController`

推荐 Service：

- `LearningQueryService`
- `LearningProgressService`
- `SceneLearningService`
- `SceneVariantRunService`

说明：

- `dashboard / continue / progress` 更偏聚合查询
- `start / progress / pause / complete` 更偏学习状态写回
- `variants/*` 虽然挂在 learning 下，但语义上更接近 scene learning runtime

迁移优先级：

1. `dashboard`
2. `continue`
3. `progress`
4. `start / pause / progress / complete`
5. `variants/run / complete / view`

特别注意：

- `progress`、`start`、`complete` 天然需要幂等保护
- 这里是主链路，不要一开始就混入生成逻辑

### 4.3 `review`

当前接口：

- `/api/review/due`
- `/api/review/submit`
- `/api/review/summary`

推荐落点：

- `ReviewController`

推荐 Service：

- `ReviewQueryService`
- `ReviewSubmitService`

说明：

- `due` 和 `summary` 很适合先迁
- `submit` 是练 Java 后端事务、幂等、写后聚合的好入口

迁移优先级：

1. `summary`
2. `due`
3. `submit`

特别注意：

- `submit` 必须带幂等
- `submit` 后通常还会牵涉统计、状态推进、复习信号回写

### 4.4 `phrases`

当前接口：

- `/api/phrases/mine`
- `/api/phrases/relations`
- `/api/phrases/summary`
- `/api/phrases/save`
- `/api/phrases/save-all`
- `/api/phrases/manual-assist`
- `/api/phrases/similar/generate`
- `/api/phrases/similar/enrich`
- `/api/phrases/similar/enrich-all`
- `/api/phrases/[userPhraseId]`

推荐落点：

- `PhraseController`

推荐 Service：

- `PhraseQueryService`
- `PhraseSaveService`
- `PhraseRelationService`
- `PhraseEnrichmentService`

说明：

- `mine / summary / relations` 适合先做
- `save / save-all` 是很好的写接口训练样板
- `manual-assist / similar/* / enrich*` 更靠近生成与 AI，建议后迁

迁移优先级：

1. `mine`
2. `summary`
3. `relations`
4. `save`
5. `save-all`
6. `[userPhraseId]` 删除或详情类接口
7. `manual-assist / similar/*`

特别注意：

- `save / save-all` 必须幂等
- `similar/generate`、`enrich` 天然需要限流和缓存

### 4.5 `expression-clusters`

当前接口：

- `/api/expression-clusters/ensure`
- `/api/expression-clusters/merge`
- `/api/expression-clusters/move`
- `/api/expression-clusters/[clusterId]/main`
- `/api/expression-clusters/[clusterId]/members/[userPhraseId]/detach`

推荐落点：

- `ExpressionClusterController`

推荐 Service：

- `ExpressionClusterQueryService`
- `ExpressionClusterMutationService`

说明：

- 这组接口读起来像普通 CRUD，其实不完全是
- 它们背后是用户表达分组、主表达切换、成员移动、合并等带规则的写操作

迁移优先级：

1. `ensure`
2. `main`
3. `detach`
4. `move`
5. `merge`

特别注意：

- `merge / move / detach / main` 都要认真处理事务边界
- 这些接口虽然不一定要 Redis，但必须先把数据库一致性收稳

### 4.6 `expression-map`

当前接口：

- `/api/expression-map/generate`

推荐落点：

- `ExpressionMapController`

推荐 Service：

- `ExpressionMapGenerationService`

说明：

- 这是典型“高成本生成接口”
- 不适合第一阶段就做

特别注意：

- 需要限流
- 需要结果缓存
- 需要生成去重

### 4.7 `scene` / `scenes`

当前接口：

- `/api/scenes`
- `/api/scenes/generate`
- `/api/scenes/import`
- `/api/scenes/[slug]`
- `/api/scenes/[slug]/variants`
- `/api/scene/parse`
- `/api/scene/mutate`

推荐落点：

- `SceneController`
- `SceneAdminController` 或并入 `AdminController`

推荐 Service：

- `SceneQueryService`
- `SceneMutationService`
- `SceneGenerationService`
- `SceneImportService`

说明：

- `scenes` 列表与详情是普通查询接口，适合先迁
- `generate / import / parse / mutate` 更偏内容生成与后台维护，建议后迁

迁移优先级：

1. `/scenes`
2. `/scenes/[slug]`
3. `/scenes/[slug]/variants`
4. `/scene/parse`
5. `/scene/mutate`
6. `/scenes/import`
7. `/scenes/generate`

特别注意：

- `generate` 和 `import` 都不该第一阶段就做
- `generate` 需要限流、缓存、并发去重

### 4.8 `practice`

当前接口：

- `/api/practice/generate`
- `/api/learning/scenes/[slug]/practice/run`
- `/api/learning/scenes/[slug]/practice/attempt`
- `/api/learning/scenes/[slug]/practice/complete`
- `/api/learning/scenes/[slug]/practice/mode-complete`
- `/api/learning/scenes/[slug]/practice/set`

推荐落点：

- `PracticeController`

推荐 Service：

- `PracticeSetService`
- `PracticeRunService`
- `PracticeAttemptService`
- `PracticeGenerationService`

说明：

- 这组接口很适合拆成“题集本体”和“运行态”两部分
- 这也是 Java 重写里最有学习价值，但不适合最早开做的一组

迁移优先级：

1. `practice/set`
2. `practice/run`
3. `practice/attempt`
4. `practice/complete`
5. `practice/mode-complete`
6. `/api/practice/generate`

特别注意：

- `generate` 必须限流
- `set / run / attempt` 之间要有清晰 ownership 校验
- 这里很适合练 Redis 去重和热点保护

### 4.9 `recommendations`

当前接口：

- `/api/recommendations/scenes/[slug]/phrases`

推荐落点：

- `RecommendationController`

推荐 Service：

- `SceneRecommendationService`

说明：

- 这组接口通常偏读，适合较早迁移
- 但如果内部依赖生成或复杂聚合，就先保持简单实现

### 4.10 `tts`

当前接口：

- `/api/tts`
- `/api/tts/regenerate`

推荐落点：

- `TtsController`

推荐 Service：

- `TtsQueryService`
- `TtsGenerationService`
- `TtsRegenerationService`

说明：

- TTS 不是单接口，而是一条链路
- 包括文本输入、资源定位、生成、存储、缓存、失败兜底

迁移优先级：

1. `/tts` 读取 / 获取
2. `/tts/regenerate`

特别注意：

- 这组接口一定要后迁
- 它天然依赖缓存、外部服务、超时和失败治理

### 4.11 `admin`

当前接口：

- `/api/admin/status`
- `/api/admin/seed-scenes`
- `/api/admin/phrases/enrich-batch`

推荐落点：

- `AdminController`

推荐 Service：

- `AdminStatusService`
- `SceneSeedService`
- `PhraseAdminService`

说明：

- admin 不应该优先于主链路
- 这部分更适合在主链路稳定后补

## 5. 第一阶段推荐先迁哪些接口

如果你现在是“从零开始学 Java 后端”，第一阶段我建议只做这些：

### 第一批：纯读接口

- `GET /api/review/summary`
- `GET /api/learning/dashboard`
- `GET /api/learning/continue`
- `GET /api/phrases/mine`
- `GET /api/phrases/summary`
- `GET /api/scenes`
- `GET /api/scenes/[slug]`

目标：

- 先跑通 Spring Boot + Controller + Service + MyBatis 的标准链路

### 第二批：低风险写接口

- `POST /api/phrases/save`
- `POST /api/phrases/save-all`
- `POST /api/review/submit`

目标：

- 练参数校验、事务、幂等、错误处理

### 第三批：主链路状态写回

- `POST /api/learning/scenes/[slug]/start`
- `POST /api/learning/scenes/[slug]/progress`
- `POST /api/learning/scenes/[slug]/pause`
- `POST /api/learning/scenes/[slug]/complete`

目标：

- 练学习状态机、写后聚合、统计回写

### 第四批：高成本生成与运行态

- `practice/*`
- `expression-map/generate`
- `phrases/similar/*`
- `scenes/generate`
- `tts/*`

目标：

- 最后再练缓存、限流、并发与外部依赖治理

## 6. Java 包结构建议

建议用下面这种结构起步：

```text
com.abandonclaw.backend
  auth
  user
  learning
  scene
  practice
  review
  phrase
  expression
  recommendation
  tts
  admin
  common
```

每个业务域下最少有：

```text
controller
service
mapper
model
dto
```

不要一开始就把 query / command / facade / domain service 拆得太细。

## 7. 哪些接口要优先上 Redis

不是所有接口都值得先上 Redis。  
优先顺序建议如下：

### 第一优先级

- `review/submit`
- `phrases/save`
- `phrases/save-all`
- `learning/scenes/[slug]/progress`
- `learning/scenes/[slug]/complete`

用途：

- 分布式幂等
- 写接口去重

### 第二优先级

- `practice/generate`
- `expression-map/generate`
- `phrases/similar/generate`
- `tts/regenerate`
- `scenes/generate`

用途：

- 限流
- 热点请求去重
- 生成任务锁
- 短期结果缓存

### 第三优先级

- `dashboard`
- `review/summary`
- `phrases/summary`
- `recommendations/*`

用途：

- 热点读缓存

## 8. 当前最适合你的开工顺序

如果你明天就要开 Java 项目，我建议直接按这条线走：

1. 建 Spring Boot + Maven + MyBatis + Redis 工程
2. 先实现 `ReviewController`
3. 先打通 `GET /review/summary`
4. 再实现 `PhraseController`
5. 再打通 `GET /phrases/mine`
6. 再实现 `POST /phrases/save`
7. 再补 Redis 幂等
8. 然后再去碰 `LearningController`

这样节奏最稳，也最容易有成就感。

## 9. 最后结论

这份映射清单的核心目的只有一个：

- 让你不要面对“整个项目后端”发懵
- 而是能把它拆成一组可逐步实现的 Java Controller / Service 任务

建议你接下来就按这个专题继续补：

1. API -> Java Controller 映射
2. 数据表 -> MySQL Mapper 映射
3. Redis 使用点清单
4. 第一阶段开发任务拆分

这样后面你就不是“想学 Java 重写”，而是已经有一套能开工的蓝图了。
