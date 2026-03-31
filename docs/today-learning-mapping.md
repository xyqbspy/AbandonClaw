# Today 页面学习数据映射

## 目标

这份文档用于说明 `today` 页面展示数据、当前用户学习步骤、后端学习数据之间的对应关系，避免后续修改 `scene` 学习链路、`learning dashboard` 聚合或 `today` selectors 时再次出现语义漂移。

适用范围：

- `src/lib/server/learning/service.ts`
- `src/lib/utils/learning-api.ts`
- `src/features/today/components/today-page-selectors.ts`
- `src/features/today/components/today-page-client.tsx`
- `src/app/api/learning/dashboard/route.ts`

## 链路总览

`today` 的主要数据链路是：

1. 页面入口 [page.tsx](d:/WorkCode/AbandonClaw/src/app/(app)/today/page.tsx) 只负责鉴权和传入 `displayName`
2. 客户端页 [today-page-client.tsx](d:/WorkCode/AbandonClaw/src/features/today/components/today-page-client.tsx) 负责读取缓存、请求 `/api/learning/dashboard`、`/api/scenes`、`/api/phrases/mine`
3. 接口 [route.ts](d:/WorkCode/AbandonClaw/src/app/api/learning/dashboard/route.ts) 调用服务端 `getLearningDashboard()`
4. 服务端 [service.ts](d:/WorkCode/AbandonClaw/src/lib/server/learning/service.ts) 聚合 `overview`、`continueLearning`、`todayTasks`
5. 前端选择器 [today-page-selectors.ts](d:/WorkCode/AbandonClaw/src/features/today/components/today-page-selectors.ts) 把接口数据翻译成卡片、任务和 helper 文案

## 数据层级

`today` 页面有三层数据来源，优先级固定：

1. 服务端 dashboard 主来源
2. 本地 repeat generated state 回退层
3. 场景列表首项回退层

对应实现：

- `resolveContinueLearningState()` 负责决定 `continueLearning` 入口来自哪里
- `resolveTodayLearningSnapshot()` 负责决定“页面当前有效步骤 / 阶段 / 进度”

前端不得绕过这套顺序重新创造新的学习完成语义。

## 服务端字段到 dashboard 的映射

### `overview`

来源：

- `getLearningOverview(userId)`

主要底层输入：

- `user_scene_progress`：已完成场景数、进行中场景数
- phrase summary：已保存表达总数
- `user_daily_learning_stats`：最近学习分钟数、连续学习天数
- review summary：复习正确率

用途：

- 欢迎卡片、概览统计、已保存表达总量、回忆正确率

### `continueLearning`

来源：

- `getContinueLearningScene(userId)` 主链路
- `getRepeatPracticeContinueScene(userId)` 回炉场景练习
- `getRepeatVariantContinueScene(userId)` 回炉变体训练
- `pickMostRecentContinueScene(...)` 选最新入口

主要底层输入：

- `user_scene_progress`
- `user_scene_sessions`
- `user_scene_practice_attempts`
- `user_scene_practice_runs`
- `user_scene_variant_runs`

关键字段语义：

- `currentStep`
  - 来自最新 session 或 repeat run 映射
  - 表示当前应该回到哪一个学习阶段
- `masteryStage`
  - 来自 progress
  - 表示当前场景主掌握阶段
- `completedSentenceCount`
  - 优先取 session 聚合后的完成句数
  - 服务端会用 practice attempts 对旧数据做保守回填
- `repeatMode`
  - `practice` 表示回炉场景练习
  - `variants` 表示回炉变体训练
- `isRepeat`
  - 表示这个 continue 入口不是主场景流程，而是完成后的回炉链路

### `todayTasks`

来源：

- `getTodayLearningTasks(userId)`

主要底层输入：

- `continueScene`
- review summary
- 当日 `user_daily_learning_stats`

关键字段语义：

- `sceneTask.done`
  - 非 repeat 情况下，表示今天是否已经完成至少一个场景
  - repeat continue 时固定为 `false`，避免把回炉任务误判为“今日场景已完成”
- `sceneTask.currentStep`
  - 作为 today 页面任务和继续学习文案的第一优先级步骤来源
- `sceneTask.masteryStage`
  - 当没有 `currentStep` 时，作为阶段解释来源
- `sceneTask.progressPercent`
  - 作为 today 页面主进度显示优先值
- `sceneTask.completedSentenceCount`
  - 用于解释用户是否已经从句子练习推进到更高阶段
- `outputTask`
  - 表示今天是否已经沉淀表达
- `reviewTask`
  - 表示今天是否已经完成一轮回忆，或当前是否有待复习项

## 前端派生规则

### 继续学习入口

实现：

- `resolveContinueLearningState()`

优先级：

1. `dashboard.continueLearning`
2. 本地已生成的 repeat practice / repeat variant 状态
3. 场景列表第一项

注意：

- 前端只能决定“从哪里兜底拿入口”，不能重写服务端的完成语义
- 本地 repeat 只在服务端 continue 为空时兜底

### 当前有效步骤 / 进度

实现：

- `resolveTodayLearningSnapshot()`

优先级：

1. `todayTasks.sceneTask.currentStep`
2. `continueLearning.currentStep`
3. `todayTasks.sceneTask.masteryStage`
4. `continueLearning.masteryStage`

进度优先级：

1. `todayTasks.sceneTask.progressPercent`
2. `continueLearning.progressPercent`

这个规则用于：

- continue card 步骤文案
- continue helper 文案
- continue scene 预热时机
- 页面顶部继续学习进度条

### 任务链路

实现：

- `buildTodayTasks()`

规则：

- `sceneTask` 是入口任务
- `outputTask` 只有在主场景任务完成，或当前是 repeat continue 时才解锁
- `reviewTask` 只有在场景链路已推进后才可用；若表达沉淀尚未完成，显示为 `available`
- repeat continue 不得把场景任务直接标记为已完成

## 页面展示块与字段来源

### 继续学习卡片

来源：

- 标题、副标题：`continueLearning.title` / `subtitle`
- 步骤：`resolveTodayLearningSnapshot()` + `getContinueLearningStepLabel()`
- helper 文案：`getContinueLearningHelperText()`
- href：`getContinueLearningHref()`
- 进度：`resolveTodayLearningSnapshot().effectiveProgressPercent`

### 今日任务区

来源：

- `buildTodayTasks({ dashboard, continueLearning, labels })`

显示重点：

- 使用 `todayTasks.sceneTask` 解释当前该先做什么
- 使用 `todayTasks.outputTask` 和 `todayTasks.reviewTask` 决定下游任务锁定状态
- repeat continue 时允许 output / review 不重新被锁回去

### 表达沉淀区

来源：

- `todayTasks.outputTask.phrasesSavedToday`
- `continueLearning.savedPhraseCount`
- `todayTasks.reviewTask.dueReviewCount`
- 最近表达缓存 / 网络结果

### 回忆摘要区

来源：

- `overview.reviewAccuracy`
- `todayTasks.reviewTask.dueReviewCount`

## 维护边界

下面这些变更发生时，必须同步更新本文件、OpenSpec spec delta 和相关测试：

- `currentStep`、`masteryStage`、`completedSentenceCount` 的语义变化
- `continueLearning` 的聚合优先级变化
- repeat practice / variants 入口变化
- `todayTasks.sceneTask.done`、`outputTask.done`、`reviewTask.done` 的判定变化
- continue card、today task 文案和锁定逻辑变化

## 推荐回归测试

- [today-page-selectors.test.ts](d:/WorkCode/AbandonClaw/src/features/today/components/today-page-selectors.test.ts)
- [today-page-client.test.tsx](d:/WorkCode/AbandonClaw/src/features/today/components/today-page-client.test.tsx)
- [service.logic.test.ts](d:/WorkCode/AbandonClaw/src/lib/server/learning/service.logic.test.ts)

至少覆盖这些场景：

- dashboard continue 优先于本地 fallback
- 本地 repeat continue 能在 dashboard 缺失时接住入口
- sceneTask 步骤优先于 continueLearning 步骤
- repeat continue 不误判今日场景已完成
- output / review 在 repeat continue 场景下不被重新锁住
