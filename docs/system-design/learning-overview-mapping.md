# Learning Overview Mapping

## 1. 目标

这份文档说明 `progress` 页展示的学习概览字段来自哪里、失败时如何降级，以及后续调整卡片内容时要一起检查哪些服务端聚合逻辑。

## 2. 对应入口/实现位置

对应入口：

- [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/progress/page.tsx)
- [service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/learning/service.ts)

## 3. 关键结构或字段来源

### 3.1 页面职责

`progress/page.tsx` 本身很薄，只做三件事：

1. `requireCurrentProfile()` 确认当前用户
2. 调 `getLearningOverview(user.id)`
3. 把聚合结果映射成卡片和摘要文案

它不自己读原始表，也不自己计算任何统计。

### 3.2 `LearningOverview` 字段来源

服务端结构定义在 [service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/learning/service.ts) 的 `LearningOverview`：

- `streakDays`
  - 来自 `user_daily_learning_stats`
  - 读取最近 60 天 `study_seconds > 0` 的日期
  - 由 `calculateStreakDays()` 连续回推计算
- `completedScenesCount`
  - 来自 `user_scene_progress`
  - 统计 `status = completed`
- `inProgressScenesCount`
  - 来自 `user_scene_progress`
  - 统计 `status in (in_progress, paused)`
- `savedPhraseCount`
  - 来自 `getUserPhraseSummary(userId)`
- `recentStudyMinutes`
  - 来自最近 7 天 `user_daily_learning_stats.study_seconds`
  - 最后换算成分钟并四舍五入
- `reviewAccuracy`
  - 来自 `getReviewSummary(userId)`

## 4. 页面/服务端映射

### 4.1 页面展示映射

当前页面映射关系：

- `连续学习` -> `streakDays`
- `完成场景` -> `completedScenesCount`
- `学习中场景` -> `inProgressScenesCount`
- `已收藏短语` -> `savedPhraseCount`
- `最近 7 天累计学习约 X 分钟` -> `recentStudyMinutes`
- `复习正确率` -> `reviewAccuracy`

这意味着：

- 如果未来要改展示口径，优先改 `getLearningOverview()`
- 页面层不应自己再拼新的“近 30 天”或“本周”统计

## 5. 失败回退或兼容策略

`progress/page.tsx` 对 `getLearningOverview()` 做了保守降级：

- 服务端聚合失败时不会让页面直接炸掉
- 会返回一份 0 值 / `null` 的 fallback overview

当前 fallback：

- `streakDays: 0`
- `completedScenesCount: 0`
- `inProgressScenesCount: 0`
- `savedPhraseCount: 0`
- `recentStudyMinutes: 0`
- `reviewAccuracy: null`

页面展示上：

- 数值字段显示 `0`
- `reviewAccuracy === null` 时显示 `—`

维护约束：

- 如果新增字段，也要同步补 fallback
- 不要让页面直接消费 `undefined` 聚合值

## 6. 和其它模块/页面的边界

`progress` 和 `today`、`review` 都会消费学习聚合，但职责不同：

- `today`
  - 回答“今天该做什么”
  - 强依赖 continue learning 和任务状态
- `review`
  - 负责真正的复习与正式信号记录
- `progress`
  - 只负责长期概览，不负责任务编排

所以：

- 不要把 today 的任务字段搬进 progress
- 不要让 progress 页面自己解释 review 原始日志

## 7. 什么时候必须同步改文档

出现这些改动时，应同步更新本文档：

- `LearningOverview` 字段新增、删减或含义变化
- 统计窗口从“最近 7 天”改成其它口径
- `reviewAccuracy` 的来源从 review summary 改到其它聚合
- 页面 fallback 规则变化

## 8. 建议回归

如果改到 `progress` 概览，至少要自查：

- `getLearningOverview()` 的字段仍和页面一一对应
- 最近学习分钟数仍基于最近 7 天
- 连续学习仍只按 `study_seconds > 0` 计算
- 聚合失败时页面仍能稳定降级
