# AbandonClaw 项目学习讲解文档

## 1. 文档目标

这份文档不是单纯的“文件列表”，而是给你一套可以直接拿去讲项目、带新人、做分享、做 PPT 的讲解路径。

重点聚焦三块：

- 主线：`scene`
- 核心资产层：`chunks`
- 次入口：`today`

建议你讲这个项目时，不要从“技术栈”开头，而要从“学习产品逻辑”开头，因为这个项目的真正价值不在 Next.js，而在它把英语学习拆成了三层闭环：

1. `scene` 负责提供可进入的真实语境
2. `chunks` 负责沉淀可复用的表达资产
3. `today` 负责把学习行为重新组织成每天可执行任务

一句话概括：

> 这是一个以场景学习为主线、以表达沉淀为资产、以今日任务为入口的英语学习系统。

---

## 2. 项目一句话架构

从产品视角看：

- `scenes` 页面负责给用户挑选或生成学习场景
- `scene/[slug]` 页面负责真正学习一个场景，并在过程中收集表达
- `chunks` 页面负责管理、补全、聚类、复习这些表达
- `today` 页面负责把“继续场景 + 今日复习 + 今日输出”组合成每日学习入口

从工程视角看：

- `src/app` 是路由入口层
- `src/features` 是视图模块层
- `src/lib/utils` 是前端 API 调用层
- `src/lib/server` 是服务层和数据落地层
- `supabase/sql` 是数据库演进记录

---

## 3. 先讲什么，再讲什么

如果你要给别人讲，推荐按下面顺序：

1. 先讲产品闭环，不讲代码
2. 再讲三大页面：`today -> scene -> chunks`
3. 再讲页面内部拆分规范：`page / selectors / controller / actions / components`
4. 最后讲服务层和数据库

原因很简单：

- 如果一上来就讲 `hook` 和 `service`，别人只会觉得文件很多
- 如果先讲“用户今天怎么学、学完沉淀什么、下次如何继续”，代码结构反而会变得非常自然

---

## 4. 三大模块的职责分工

### 4.1 `scene` 是主学习流程

`scene` 是项目的主舞台。

用户在这里做的事：

- 打开一个具体场景
- 阅读/跟读句子
- 查看句内 chunk
- 保存值得学的表达
- 生成场景练习
- 生成场景变体
- 查看表达地图
- 同步学习进度

可以把 `scene` 理解成：

> 用真实语境把“输入、理解、提取、练习、变体扩展”串成一条主学习链路。

核心入口文件：

- `src/app/(app)/scene/[slug]/page.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`

---

### 4.2 `chunks` 是表达资产管理层

`chunks` 不是附属页，它其实是整个系统的“知识库后台”。

用户在这里做的事：

- 搜索和筛选自己保存过的表达
- 看某个表达的翻译、例句、usage note
- 用 AI 继续补全表达信息
- 看相似表达和对照表达
- 把表达组织进 expression cluster
- 把表达加入复习

可以把 `chunks` 理解成：

> 把零散的学习痕迹整理成可复用、可扩展、可复习的表达资产。

核心入口文件：

- `src/app/(app)/chunks/page.tsx`

---

### 4.3 `today` 是任务编排入口

`today` 页很轻，但战略意义很大。

它不是生产学习内容的地方，而是重新组织学习入口的地方。

用户在这里看到的不是“所有功能”，而是“今天该做什么”：

- 继续一个未完成场景
- 做今天的复习
- 看今天的输出/表达积累

可以把 `today` 理解成：

> 把底层的学习数据重新编排成一个每日任务入口。

核心入口文件：

- `src/app/(app)/today/page.tsx`
- `src/features/today/components/today-page-client.tsx`
- `src/features/today/components/today-page-selectors.ts`

---

## 5. 这个项目最关键的设计思想

## 5.1 页面只做编排，不吞业务

项目里已经明确形成了一套页面模块约定，见：

- `src/features/page-module-pattern.md`

核心原则是：

- `page.tsx` 只负责路由、状态编排、组装组件
- 派生逻辑放 `selectors` / `logic`
- 动作判断放 `controller`
- 数据构造放 `actions`
- 复杂 UI 放独立组件

这套规范的价值非常大：

- 页面不容易失控
- 可测性更强
- 重构成本更低
- 讲项目时也更容易讲清楚

你可以把它讲成：

> 这个项目不是按技术切文件，而是按页面职责切文件。

---

## 5.2 “场景驱动学习”而不是“单词驱动学习”

这个项目的学习起点不是单个词，而是一个完整语境。

表现为：

- 场景可以是 dialogue 或 monologue
- 场景里有 section / block / sentence / chunks
- 用户不是先背词，而是先进入语境
- chunk 和 phrase 的沉淀是在阅读场景过程中发生的

这比传统词库式系统更接近真实使用流程。

---

## 5.3 “表达资产化”而不是“只读不存”

很多学习产品只让用户看完就结束了，这个项目不是。

它有明确的资产沉淀思路：

- 从 scene 里提表达
- 保存到 phrase / chunks 体系
- 给表达补全翻译、例句、semantic focus、typical scenario
- 建立 similar / contrast 关系
- 组织到 expression clusters
- 再进入 review 和 today

也就是说，`scene` 是流量入口，`chunks` 是资产仓库。

---

## 5.4 “学习进度”是服务端闭环，不只是本地 UI 状态

项目对学习进度非常认真，不是前端点一下按钮就算学过。

在 `scene` 里：

- 进入页面会 `start`
- 停留和切换视图会 `progress`
- 完成练习或变体会 `complete`
- 离开页面会 `pause`

对应 API：

- `/api/learning/scenes/[slug]/start`
- `/api/learning/scenes/[slug]/progress`
- `/api/learning/scenes/[slug]/complete`
- `/api/learning/scenes/[slug]/pause`

这意味着：

> UI 只是学习行为的触发器，真正的学习状态由服务端维护。

---

## 6. `scene` 主线怎么讲

这是整个项目最值得重点讲的一部分。

## 6.1 页面入口很薄

入口文件：

- `src/app/(app)/scene/[slug]/page.tsx`

它只做三件事：

1. 鉴权
2. 按 slug 读取 scene
3. 把结果交给客户端页

这说明服务端页只负责首屏数据和访问控制，不承载复杂交互。

---

## 6.2 真正的页面核心是 `scene-detail-page.tsx`

文件：

- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`

这个文件是 `scene` 的总编排器，负责把多个子系统组合起来：

- 数据加载：`useSceneDetailData`
- 路由视图状态：`useSceneDetailRouteState`
- 学习进度同步：`useSceneLearningSync`
- 交互动作：`useSceneDetailActions`
- 音频和 chunk 细节：`useSceneDetailPlayback`

它不是自己做所有事情，而是把这些系统拼成一个完整学习页面。

你可以把这页讲成：

> 它本质上是场景学习控制台，不是普通详情页。

---

## 6.3 `scene` 页面内部其实有 5 种视图模式

来源文件：

- `src/app/(app)/scene/[slug]/scene-detail-page-logic.ts`

定义的 `SceneViewMode`：

- `scene`
- `practice`
- `variants`
- `variant-study`
- `expression-map`

这很重要，因为这个页面不是一个“详情页”，而是一个“多视图学习工作台”。

对应含义：

- `scene`：基础阅读与表达提取
- `practice`：场景练习
- `variants`：场景变体列表
- `variant-study`：进入某个变体继续学
- `expression-map`：看表达之间的关系图

---

## 6.4 路由状态被显式设计过

文件：

- `src/app/(app)/scene/[slug]/use-scene-detail-route-state.ts`
- `src/app/(app)/scene/[slug]/scene-detail-page-logic.ts`

做法是：

- 通过 query 参数里的 `view`、`variant` 控制视图
- 页面状态和 URL 同步
- 切换视图时直接 `router.push`

这个设计的优点：

- 刷新不丢状态
- 链接可分享
- 回退行为更自然
- 页面内部多视图仍保持路由语义

---

## 6.5 数据加载不是“裸 fetch”，而是带缓存与预取编排

核心文件：

- `src/app/(app)/scene/[slug]/use-scene-detail-data.ts`
- `src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.ts`
- `src/app/(app)/scene/[slug]/scene-detail-load-logic.ts`
- `src/lib/cache/scene-cache.ts`
- `src/lib/cache/scene-prefetch.ts`

这个链路非常值得讲。

完整流程大致是：

1. 先清理过期缓存
2. 先尝试读本地 scene cache
3. 如果缓存命中，先展示缓存
4. 再从 `/api/scenes/[slug]` 拉网络数据
5. 网络成功后写回缓存
6. 再预取相邻或最近相关场景

这说明作者对移动端/弱网体验是有意识的。

这类设计可以概括为：

> cache first + network refresh + related prefetch

---

## 6.6 `scene` 页面会自动同步“我是否已经保存过这些表达”

文件：

- `src/app/(app)/scene/[slug]/use-scene-detail-data.ts`
- `src/app/(app)/scene/[slug]/scene-detail-logic.ts`
- `src/lib/utils/phrases-api.ts`

流程是：

1. 先从 lesson 中收集所有 chunk text
2. 调用 `getSavedNormalizedPhraseTextsFromApi`
3. 得到一个 `savedPhraseTextSet`
4. UI 就能知道哪些表达已经收藏过

这一步很关键，因为它把“内容展示”与“个人学习资产状态”结合起来了。

---

## 6.7 `scene` 的生成能力分成三类

文件：

- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`

三类能力分别是：

1. 生成练习 `generateScenePracticeSet`
2. 生成变体 `generateSceneVariantSet`
3. 生成表达地图 `ensureSceneExpressionMapData`

它们分别调用：

- `/api/practice/generate`
- `/api/scenes/[slug]/variants`
- `/api/expression-map/generate`

这里的设计非常清晰：

- `scene` 自己不直接写生成细节
- 由 generation logic 统一封装
- UI 只关心“生成中 / 成功 / 失败 / 打开哪个视图”

---

## 6.8 学习进度同步是 `scene` 的核心工程亮点

文件：

- `src/app/(app)/scene/[slug]/use-scene-learning-sync.ts`
- `src/app/(app)/scene/[slug]/scene-detail-learning-logic.ts`
- `src/lib/utils/learning-api.ts`
- `src/lib/server/learning/service.ts`

可以按“进入、停留、退出”来讲：

### 进入时

- `startSceneLearningFromApi`

### 页面停留时

- 定时或延迟触发 `updateSceneLearningProgressFromApi`
- 用 `studySecondsDelta` 增量上报学习时长

### 离开时

- 触发 `pauseSceneLearningFromApi`

### 完成练习或变体时

- 触发 `completeSceneLearningFromApi`

服务端还做了几件对业务非常重要的事：

- progress 百分比单调递增，防止回退
- completed 后不轻易退回 in_progress
- 每日统计写入 `user_daily_learning_stats`

你在分享时可以重点强调：

> 这个项目不是只记“看过没”，而是有开始、推进、暂停、完成的完整状态机。

---

## 6.9 `scene` 最终在产品上的价值

`scene` 这一层完成了三件大事：

1. 给用户真实输入语境
2. 给系统提供表达提取入口
3. 给学习系统提供可统计的进度主线

所以它是整个项目的“主流程层”。

---

## 7. `chunks` 资产层怎么讲

`chunks` 是代码量明显更重的一页，因为它承载的是“表达资产运营”。

## 7.1 页面定位

入口文件：

- `src/app/(app)/chunks/page.tsx`

这页可以看成“表达工作台”，不只是列表页。

它同时承担：

- 表达列表浏览
- 搜索过滤
- 手动录入 expression / sentence
- AI 辅助补全
- detail sheet
- expression map
- expression cluster 管理
- TTS 播放
- review 入口

所以它复杂是合理的，不是无序复杂。

---

## 7.2 `chunks` 的第一条主线是“列表加载”

文件：

- `src/app/(app)/chunks/use-chunks-list-data.ts`
- `src/app/(app)/chunks/chunks-page-load-logic.ts`

这条线做了什么：

1. 把查询条件构造成请求参数
2. 尝试走 phrase list cache
3. 再请求 `/api/phrases/mine`
4. 网络成功后回填缓存
5. 失败时根据是否有缓存决定是否清空列表

这和 `scene` 一样，也不是简单 fetch，而是有清晰的 cache fallback 策略。

---

## 7.3 `chunks` 的第二条主线是“路由即过滤器”

文件：

- `src/app/(app)/chunks/chunks-page-logic.ts`
- `src/app/(app)/chunks/use-chunks-route-state.ts`

这里把这些状态放进 URL：

- `query`
- `review`
- `content`
- `cluster`

好处是：

- 搜索状态可保留
- cluster 过滤可分享
- 返回页面时上下文不丢

这一点说明作者对“重型工作台页面”的交互稳定性考虑得比较成熟。

---

## 7.4 `chunks` 的第三条主线是“表达详情视图”

相关文件：

- `src/features/chunks/components/focus-detail-sheet.tsx`
- `src/features/chunks/components/focus-detail-selectors.ts`
- `src/features/chunks/components/focus-detail-labels.ts`
- `src/app/(app)/chunks/chunks-focus-detail-logic.ts`

它不是简单弹层，而是围绕一个焦点表达展开：

- 当前表达信息
- 同类表达
- 对照表达
- AI 候选表达
- 可执行动作

这就使得 `chunks` 不只是“仓库”，而是“围绕一个表达做扩展学习”的操作中心。

---

## 7.5 `chunks` 的第四条主线是“表达聚类”

相关文件：

- `src/lib/server/expression-clusters/service.ts`
- `src/app/api/expression-clusters/handlers.ts`
- `src/features/chunks/expression-clusters/ui-logic.ts`

这是这个项目里很有辨识度的一层设计。

核心思想：

- 一个表达簇有主表达 `main`
- 其他是变体 `variant`
- 支持 ensure / merge / move / detach / set main

这意味着系统不是把表达当平铺列表，而是把它们组织成“语义小组”。

你可以这样解释：

> `chunks` 层已经不只是记忆卡片，而是在建立表达之间的结构关系。

---

## 7.6 `chunks` 的第五条主线是“手动录入 + AI 补全”

相关文件：

- `src/app/(app)/chunks/use-manual-expression-composer.ts`
- `src/app/(app)/chunks/use-manual-sentence-composer.ts`
- `src/lib/utils/phrases-api.ts`
- `/api/phrases/manual-assist`
- `/api/phrases/similar/generate`
- `/api/phrases/similar/enrich`

用户可以：

- 只录一个表达
- 或者录一句完整句子

系统会继续帮他补：

- translation
- usage note
- examples
- semantic focus
- typical scenario
- similar / contrast candidates

这条线很重要，因为它把“场景内沉淀”扩展成了“场景外主动积累”。

也就是说，即使今天不学 scene，用户仍然能往系统里持续沉淀表达。

---

## 7.7 `chunks` 和 `scene` 的关系

这是讲项目时一定要讲透的部分。

两者关系不是并列功能，而是上下游关系：

- `scene` 负责暴露真实表达
- `chunks` 负责沉淀和组织真实表达

更具体地说：

1. 用户在 `scene` 中看到某个 chunk
2. 通过保存动作写入 phrase 系统
3. 这些数据在 `chunks` 中可见
4. `chunks` 再对这些表达做 AI 补全、聚类、复习管理
5. 部分统计再反馈到 `today`

所以：

> `scene` 是输入主线，`chunks` 是资产后处理层。

---

## 8. `today` 入口层怎么讲

`today` 很适合在分享里作为“产品闭环”的收束页来讲。

## 8.1 页面本身很薄

入口：

- `src/app/(app)/today/page.tsx`

它只负责：

- 鉴权
- 获取 displayName
- 把用户名字交给 `TodayPageClient`

这和 `scene` 一样，都符合“server page 很薄”的项目风格。

---

## 8.2 真正的逻辑在客户端和 selector 里

文件：

- `src/features/today/components/today-page-client.tsx`
- `src/features/today/components/today-page-selectors.ts`

`TodayPageClient` 负责：

- 拉 dashboard
- 拉 scene list
- 使用缓存
- 组装视图

`today-page-selectors.ts` 负责：

- 决定 continue learning 卡片显示什么
- 生成 daily tasks
- 选推荐场景

这个拆法很标准：

- 数据拉取在 client
- 纯派生逻辑在 selectors

---

## 8.3 `today` 的数据来自服务端学习聚合

相关文件：

- `/api/learning/dashboard`
- `src/lib/server/learning/service.ts`

服务端最终返回三块：

1. `overview`
2. `continueLearning`
3. `todayTasks`

这三块分别回答三个问题：

- 我最近学得怎么样
- 我应该从哪个场景继续
- 我今天至少该做什么

这正是一个“日入口页”最应该回答的问题。

---

## 8.4 `today` 不是新系统，而是聚合层

这一点必须强调。

`today` 本身几乎不生产新业务逻辑，它做的是聚合：

- 从 learning progress 拿进度
- 从 review summary 拿复习信息
- 从 phrase summary 拿表达沉淀
- 从 scene list 拿推荐内容

所以它不是底层层，而是“对底层学习数据的重新编排”。

这是它架构上最合理的定位。

---

## 9. 整个学习闭环怎么串起来讲

这是分享时最重要的一页。

你可以直接按下面这条链讲：

1. 用户进入 `today`
2. `today` 告诉他今天继续哪个 scene、还有多少 review、今天积累了多少表达
3. 用户点击进入某个 `scene`
4. `scene` 中发生阅读、跟读、看 chunk、保存表达、做练习、看变体
5. 保存下来的表达进入 `chunks`
6. `chunks` 对表达继续做补全、聚类、复习组织
7. 学习时长、完成状态、表达沉淀数写回服务端
8. `today` 第二天再把这些结果重组为新的日任务入口

这就是闭环：

> Today 分发任务 -> Scene 完成主学习 -> Chunks 沉淀资产 -> Learning service 汇总数据 -> Today 再次编排入口

---

## 10. 关键后端服务怎么讲

## 10.1 Scene Service

文件：

- `src/lib/server/scene/service.ts`

职责：

- seed scenes 初始化
- scene list 查询
- scene detail 查询
- imported scene 创建
- imported scene 删除
- scene row 与 lesson 互转
- 场景 TTS 预热

它相当于 `scene` 领域服务。

---

## 10.2 Learning Service

文件：

- `src/lib/server/learning/service.ts`

职责：

- 开始学习
- 更新进度
- 完成学习
- 暂停学习
- continue learning 聚合
- today tasks 聚合
- overview 聚合

它相当于学习状态机和看板聚合器。

---

## 10.3 Expression Clusters Service

文件：

- `src/lib/server/expression-clusters/service.ts`

职责：

- 给表达建 cluster
- 设置 main expression
- merge cluster
- detach member
- move member

它相当于表达关系结构服务。

---

## 10.4 Chunks Service

文件：

- `src/lib/server/chunks/service.ts`

职责：

- 跟踪用户 chunk 交互
- 维护 user_chunks
- 计算 candidate chunks
- 提供 scene mutation 参考 chunk

它相当于 chunk 行为埋点和候选池服务。

---

## 11. 数据与缓存策略怎么讲

这个项目有一个很明显的工程倾向：尽量在前端做轻缓存，在后端做稳定聚合。

前端缓存相关文件：

- `src/lib/cache/scene-cache.ts`
- `src/lib/cache/scene-list-cache.ts`
- `src/lib/cache/phrase-list-cache.ts`
- `src/lib/cache/learning-dashboard-cache.ts`
- `src/lib/cache/review-page-cache.ts`

`review` 页的来源契约、原场景跳转和降级规则，可配合阅读：

- `docs/system-design/review-source-mapping.md`
- `docs/system-design/review-practice-signals.md`
- `docs/domain-rules/review-scheduling-rules.md`

可总结成三句话：

1. 列表页优先缓存命中，降低首屏等待
2. 详情页支持 cache fallback + network refresh
3. dashboard 也允许本地缓存兜底，保证入口页响应

这对学习型产品很重要，因为用户访问是高频碎片化的。

---

## 12. 数据库演进怎么讲

可以不用细讲每个 SQL，但要讲“项目是阶段推进的”。

关键 SQL 演进目录：

- `supabase/sql/20260316_init_auth_scenes_cache.sql`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`
- `supabase/sql/20260317_phase5_user_chunks_scene_generation_mvp.sql`
- `supabase/sql/20260317_phase6_review_loop_mvp.sql`
- `supabase/sql/20260321_phase13_user_phrase_relations.sql`
- `supabase/sql/20260321_phase14_expression_clusters.sql`

从命名就能看出发展节奏：

- 先建 auth / scenes / cache 基础
- 再补 learning loop
- 再补 user chunks / review
- 再补 phrase relations / expression clusters

这说明项目不是一次性大设计，而是沿着学习闭环逐步加深。

---

## 13. 给别人讲 PPT 时的推荐页结构

你可以直接按下面 10 页讲：

### 第 1 页：项目定位

- 一个英语学习系统
- 不是词库导向，而是场景导向
- 核心是 scene、chunks、today 三层闭环

### 第 2 页：用户学习闭环

- Today 进入
- Scene 学习
- Chunks 沉淀
- Learning Service 聚合
- 回流 Today

### 第 3 页：为什么 `scene` 是主线

- 场景是学习的真实语境
- 支持练习、变体、表达地图
- 同步完整学习进度

### 第 4 页：为什么 `chunks` 是资产层

- 保存表达不是终点
- 还要补全、聚类、复习、对比
- 最终形成个人表达库

### 第 5 页：为什么 `today` 是入口层

- 不生产内容
- 重组学习数据
- 给出今天最小可执行任务

### 第 6 页：页面拆分规范

- page 只做编排
- selector 负责派生
- controller 负责判断
- action 负责构造
- component 负责展示

### 第 7 页：前端数据流

- 页面 -> utils api -> app api -> lib/server service -> Supabase

### 第 8 页：学习进度同步

- start / progress / complete / pause
- studySecondsDelta
- daily stats

### 第 9 页：表达结构化

- phrase
- similar / contrast
- expression cluster

### 第 10 页：项目亮点与下一步

- 闭环完整
- 页面职责清晰
- 学习数据有沉淀
- 后续可继续加强推荐、复习、个性化生成

---

## 14. 推荐的源码阅读路径

如果你要带新人读代码，推荐不要随机点文件，按下面顺序读：

### 第一轮：先理解产品闭环

1. `README.md`
2. `src/features/page-module-pattern.md`
3. `src/app/(app)/today/page.tsx`
4. `src/features/today/components/today-page-client.tsx`
5. `src/features/today/components/today-page-selectors.ts`
6. `docs/feature-flows/today-recommendation.md`

### 第二轮：读主线 `scene`

1. `src/app/(app)/scene/[slug]/page.tsx`
2. `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
3. `src/app/(app)/scene/[slug]/use-scene-detail-data.ts`
4. `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
5. `src/app/(app)/scene/[slug]/use-scene-learning-sync.ts`
6. `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
7. `src/features/scene/components/*`

### 第三轮：读资产层 `chunks`

1. `src/app/(app)/chunks/page.tsx`
2. `src/app/(app)/chunks/use-chunks-list-data.ts`
3. `src/app/(app)/chunks/chunks-page-logic.ts`
4. `src/features/chunks/components/*`
5. `src/features/chunks/expression-clusters/ui-logic.ts`
6. `src/lib/server/expression-clusters/service.ts`
7. `docs/system-design/chunks-data-mapping.md`

### 第四轮：读后端聚合

1. `src/lib/server/scene/service.ts`
2. `src/lib/server/learning/service.ts`
3. `src/lib/server/chunks/service.ts`
4. `src/lib/utils/scenes-api.ts`
5. `src/lib/utils/phrases-api.ts`

这样读，理解成本最低。

---

## 15. 可以直接复述给别人的总结版本

如果你只剩 1 分钟介绍项目，可以直接这样说：

> 这个项目是一个场景驱动的英语学习系统。`scene` 是主学习流程，负责把真实语境、练习、变体和表达提取串起来；`chunks` 是表达资产层，负责把保存下来的表达做补全、聚类和复习组织；`today` 是日任务入口，把学习进度、复习任务和表达沉淀重新编排成每天可执行的学习清单。工程上，页面采用 page/selectors/controller/components 的拆分方式，学习状态通过服务端的 start/progress/complete/pause 闭环维护，整体已经形成比较完整的学习产品骨架。

---

## 16. 当前项目最值得强调的优点

- 主业务主线清楚，不是功能堆砌
- `scene -> chunks -> today` 的角色边界明确
- 页面模块拆分有统一规范
- 有比较完整的学习状态同步
- 表达不是平铺存储，而是有关系和 cluster 结构
- 缓存、预取、服务端聚合都已经形成体系

---

## 17. 当前项目最值得继续优化的方向

- `chunks/page.tsx` 仍然偏重，后续可以继续拆薄
- `today` 当前更像聚合页，后续可以加入更强的推荐策略
- `scene` 的 progress 估算目前是规则驱动，后续可以更细粒度
- expression map / variant / practice 未来可以进一步做成更强的学习闭环

---

## 18. 最后一句结论

这不是一个“做了几个页面”的项目，而是一个已经初步跑通了学习闭环的数据型产品。

如果你要带别人理解它，最好的讲法不是“这里有很多 hook”，而是：

> 它已经把每日入口、场景学习、表达沉淀、进度同步和后端聚合串成了一条完整链路。
