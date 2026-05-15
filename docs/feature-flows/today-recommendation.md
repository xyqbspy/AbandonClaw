# Today Recommendation

## 1. 目标

这份文档用于说明 `today` 页面展示数据、推荐动作、当前学习步骤与后端学习聚合之间的对应关系，避免后续修改 `scene` 学习链路、`learning dashboard` 聚合或 `today` selectors 时再次出现语义漂移。

适用范围：

- [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/today/page.tsx)
- [today-page-client.tsx](/d:/WorkCode/AbandonClaw/src/features/today/components/today-page-client.tsx)
- [today-page-selectors.ts](/d:/WorkCode/AbandonClaw/src/features/today/components/today-page-selectors.ts)
- [route.ts](/d:/WorkCode/AbandonClaw/src/app/api/learning/dashboard/route.ts)
- [service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/learning/service.ts)

## 2. 入口

- `src/app/(app)/today/page.tsx`
- `src/features/today/components/today-page-client.tsx`
- `/api/learning/dashboard`

## 3. 主链路

`today` 的主要推荐链路是：

1. 页面入口只负责鉴权和基础壳层
2. 客户端页读取缓存并请求 `/api/learning/dashboard`
3. 服务端 `getLearningDashboard()` 聚合 `overview`、`continueLearning`、`todayTasks`
4. 前端选择器把聚合结果翻译成主 CTA、任务和说明文案

## 4. 关键状态/回写节点

`today` 页有三层数据来源，优先级固定：

1. 服务端 dashboard 主来源
2. 本地 repeat generated state 回退层
3. 场景列表首项回退层

对应实现：

- `resolveContinueLearningState()` 决定 continue 入口来自哪里
- `resolveTodayLearningSnapshot()` 决定当前有效步骤 / 阶段 / 进度

前端不得绕过这套顺序重新创造新的学习完成语义。

### 4.1 推荐所依赖的核心字段

#### `continueLearning`

来源：

- `getContinueLearningScene(userId)`
- `getRepeatPracticeContinueScene(userId)`
- `getRepeatVariantContinueScene(userId)`
- `pickMostRecentContinueScene(...)`

关键语义：

- `currentStep`
  - 当前应该恢复到哪一个学习阶段
- `masteryStage`
  - 当前场景主掌握阶段
- `completedSentenceCount`
  - 当前已稳定完成的句子数量
- `repeatMode`
  - `practice` 或 `variants`
- `isRepeat`
  - 是否属于完成后的回炉链路

#### `todayTasks`

来源：

- `getTodayLearningTasks(userId)`

关键语义：

- `sceneTask.done`
  - 非 repeat 场景下表示今天是否已完成至少一个场景
- `sceneTask.currentStep`
  - today 推荐与 continue 文案的第一优先级步骤来源
- `sceneTask.progressPercent`
  - today 页面主进度显示优先值
- `outputTask`
  - 是否已经沉淀表达
- `reviewTask`
  - 是否已完成一轮回忆，或当前是否仍有待复习项

#### `overview`

来源：

- `getLearningOverview(userId)`

用途：

- 欢迎卡片和概览摘要
- 回忆正确率、已保存表达等统计

### 4.2 前端推荐规则

#### 继续学习入口

优先级：

1. `dashboard.continueLearning`
2. 本地 repeat practice / repeat variant
3. 场景列表第一项

注意：

- 前端只能决定“从哪里兜底拿入口”
- 不能重写服务端的 continue 语义

#### 当前有效步骤 / 进度

步骤优先级：

1. `todayTasks.sceneTask.currentStep`
2. `continueLearning.currentStep`
3. `todayTasks.sceneTask.masteryStage`
4. `continueLearning.masteryStage`

进度优先级：

1. `todayTasks.sceneTask.progressPercent`
2. `continueLearning.progressPercent`

这组规则用于：

- continue card 步骤文案
- helper 文案
- continue scene 预热
- 顶部进度条

#### 任务解锁

规则：

- `sceneTask` 是主入口任务
- `outputTask` 只有在主场景任务完成，或当前是 repeat continue 时才解锁
- `reviewTask` 只有在场景链路已推进后才可用
- repeat continue 不得把场景任务直接标记为已完成

#### Starter recommendation

服务端 `starterRecommendation` 是 `/today` 新用户首要入口的稳定来源：

- 已有 `continueLearning` 时，continue 永远优先。
- starter path 只消费 `sourceType = builtin` 且 `isStarter = true` 的场景。
- 排序优先 `starterOrder`，缺失时回退 `sortOrder`，再看 level、featured 和创建时间。
- 如果某个 starter 已开始但 dashboard 暂时没有 `continueLearning`，优先接回这个未完成 starter。
- starter 全完成后，才降级推荐 `daily_life`、`time_plan`、`social` 中的 builtin daily path。
- 没有可用候选时返回 empty recommendation，页面只能展示安全空态，不得自行写死 slug。

### 4.3 页面展示块与字段来源

#### 继续学习卡片

来源：

- 标题、副标题：`continueLearning.title` / `subtitle`
- 步骤：`resolveTodayLearningSnapshot()` + `getContinueLearningStepLabel()`
- helper 文案：`getContinueLearningHelperText()`
- href：`getContinueLearningHref()`
- 进度：`effectiveProgressPercent`

#### 今日任务区

来源：

- `buildTodayTasks({ dashboard, continueLearning, labels })`

显示重点：

- `sceneTask` 解释当前该先做什么
- `outputTask`、`reviewTask` 决定下游任务锁定状态

#### 表达沉淀区与回忆摘要区

来源：

- `todayTasks.outputTask.phrasesSavedToday`
- `continueLearning.savedPhraseCount`
- `todayTasks.reviewTask.dueReviewCount`
- `overview.reviewAccuracy`

## 5. 失败与降级

- dashboard 缺失时，前端只能按约定退回本地 repeat 或场景列表兜底
- 不允许页面自己解释底层 review 原始事件
- repeat continue 不得误判为“今日场景已完成”

## 6. 改动时一起检查

以下变更发生时，必须同步更新本文档与相关测试：

- `currentStep`、`masteryStage`、`completedSentenceCount` 语义变化
- continue 聚合优先级变化
- repeat practice / variants 入口变化
- `sceneTask.done`、`outputTask.done`、`reviewTask.done` 的判定变化
- continue card、today task 文案和锁定逻辑变化

## 7. 建议回归

- [today-page-selectors.test.ts](/d:/WorkCode/AbandonClaw/src/features/today/components/today-page-selectors.test.ts)
- [today-page-client.test.tsx](/d:/WorkCode/AbandonClaw/src/features/today/components/today-page-client.test.tsx)
- [service.logic.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/learning/service.logic.test.ts)

至少覆盖：

- dashboard continue 优先于本地 fallback
- 本地 repeat continue 能在 dashboard 缺失时接住入口
- `sceneTask` 步骤优先于 `continueLearning` 步骤
- repeat continue 不误判今日场景已完成
- output / review 在 repeat continue 场景下不被重新锁住
## 8. 第四阶段补充

### 8.1 首要任务解释的稳定来源

- `buildTodayTasks(...)` 现在会给每个任务补齐 `priorityRank`、`shortReason` 和 `explanationSource`。
- `explanationSource` 当前只允许这些稳定来源：
  - `scene-task`
  - `review-summary`
  - `output-summary`
  - `repeat-continue`
  - `continue-learning`
  - `static-fallback`
- 前端显示层只消费这套稳定元数据，不再自行拼接一套新的首要任务解释语义。

### 8.2 首要任务解释的展示约定

- `today-page-client.tsx` 会先从 `buildTodayTasks(...)` 的结果里解析首要任务解释。
- `today-learning-path-section.tsx` 会把首要任务标题和原因显示在学习路径区块顶部。
- 当前约定是：
  - scene 优先级最高
  - output 次之
  - review 最后
- repeat continue 和普通 continue 会展示不同原因文案，避免把回炉训练误说成新场景推进。

### 8.3 这次改动需要保护的行为

- `todayTasks.sceneTask.currentStep` 仍然优先于 `continueLearning.currentStep`
- dashboard continue 仍然优先于本地 repeat fallback
- repeat continue 不得被误判为“今日场景已完成”
- 页面展示的首要任务解释必须和任务排序结果一致，不能出现“排序是 A，解释却在说 B”

### 8.4 本轮建议回归

- `node --import tsx --test "src/features/today/components/today-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/today/components/today-sections.test.tsx" "src/features/today/components/today-page-client.test.tsx"`

## 9. 第五阶段补充

### 9.1 continue 卡片的结果摘要约定

- `today-page-client.tsx` 现在会在 continue 卡片里额外展示一条结果摘要。
- 这条摘要只允许复用现有稳定字段：
  - `todayTasks.outputTask.phrasesSavedToday`
  - `continueLearning.savedPhraseCount`
  - `todayTasks.reviewTask.dueReviewCount`
- 页面层不引入新的“学习成果”聚合字段，只做最小展示拼接。

### 9.2 continue 动作的最小业务事件

- 用户从 continue 卡片进入场景时，会记录 `today_continue_clicked`
- 用户从 today 打开 review 时，会记录 `today_review_opened`
- 这层事件只做最小结构化输出，当前不引入新的埋点平台或服务端上报链路
