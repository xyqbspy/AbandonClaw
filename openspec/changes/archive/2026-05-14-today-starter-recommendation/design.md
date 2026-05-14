## Context

当前 `today` 页面主要依赖 `/api/learning/dashboard` 聚合 `overview`、`continueLearning`、`todayTasks`，再由前端 `today-page-selectors.ts` 解释为 continue 卡片、三段学习路径和 review/expressions 摘要。现有 continue fallback 会在 dashboard 无数据时退回 scene list 首项，但它没有区分“新用户默认从 starter 路径开始”和“一般 browse fallback”，也没有稳定的推荐理由与降级文案。

与此同时，P1 的 `/scenes` 已经建立 starter metadata 的稳定使用方式：
- 场景查询默认排序为 `is_starter -> is_featured -> sort_order -> created_at`
- UI 能识别 `level/category/source_type/is_starter/is_featured/sort_order/estimated_minutes/learning_goal`
- `getPrimarySceneAction()` 已支持“有进行中场景则 continue，没有则从 starter 开始”的主 CTA 方向

这次需要让 `today` 与 `/scenes` 在 starter path 语义上保持一致，同时不破坏既有老用户 Today 逻辑与 dashboard API 兼容性。

本轮暴露出的不稳定点：
- Today 与 `/scenes` 对 builtin starter 的优先级判断分散，容易漂出两套“默认第一课”逻辑。
- Today 首要任务解释目前偏前端拼接，新增新手推荐后如果继续堆 JSX，会让推荐原因和服务端状态断裂。
- dashboard 当前只能表达 continue/review/output，不足以稳定承载“新用户从这里开始”的首要推荐。

本轮收口项：
- 统一由服务端产出 starter recommendation。
- 统一用纯函数封装推荐优先级与理由。
- 统一复用 scenes 元字段排序口径。

本轮不收项：
- 不把 Today、Scenes 两边完全抽象成共享 domain package；先做最小复用，避免过度重构。
- 不改 review summary contract；仅保证新手推荐不会覆盖现有 review 摘要与任务。
- 不新增数据库层“新用户标记”；先复用现有 progress/stats/phrases/review 信号。

## Goals / Non-Goals

**Goals:**
- 为 `today` 增加服务端聚合的 `starterRecommendation`，兼容现有 dashboard 字段。
- 让新用户第一次进入 Today 时始终得到一个明确、可点击、可解释的 starter scene 推荐。
- 让完成部分 starter 的用户拿到“下一个 starter”而不是模糊的 scene list fallback。
- 让已有进行中场景的用户继续优先看到 continue learning。
- 保留 review summary、progress summary、saved expressions 和现有 Today 下游内容。
- 保证无 builtin scenes 或字段缺失时安全降级，不崩溃。

**Non-Goals:**
- 不改 `/api/learning/continue`、`/api/learning/progress` 的响应结构。
- 不引入新表、缓存层或复杂推荐模型。
- 不替换 `/scenes` 现有 UI 或底部 CTA。
- 不新增 AI 文案生成。

## Decisions

### 1. 扩展现有 `/api/learning/dashboard`，不新增独立推荐接口

选择在 `getLearningDashboard()` 返回中新增可选 `starterRecommendation` 字段，而不是新建 `/api/learning/starter-recommendation`。

原因：
- `today` 已把 dashboard 作为主聚合入口，继续扩展能减少一次额外请求与缓存同步复杂度。
- 推荐逻辑本身依赖 continue/review/progress/scenes，多接口拆分会让前端更难保证首要任务解释与排序一致。
- 新字段为可选，旧前端不读取时保持兼容。

备选方案：
- 新增轻接口。缺点是 Today 要多维护一个失败降级面，并且容易和 dashboard 中的 review/continue 解释漂移。

### 2. 服务端新增纯函数 `getTodayPrimaryRecommendation(...)`

推荐优先级与文案解释放在服务端纯函数/logic 文件中，输入统一为：
- scenes 列表及 starter metadata
- continue learning 聚合结果
- review summary / today tasks
- 用户是否存在已有学习痕迹的轻量信号

输出稳定结构，供 dashboard 直接返回。

原因：
- 这次规则有明确优先级，适合纯函数测试。
- 可以避免 JSX 里继续堆复杂条件分支。
- 服务端更容易复用 scene 元字段和 user progress 判定。

备选方案：
- 前端 selector 中计算。缺点是无法稳定复用 server truth，也难以保证未来多入口一致。

### 3. 继续把 continue learning 放在 starter recommendation 之前

首要推荐优先级保持：
1. 有进行中/暂停 scene continue
2. review 摘要与任务仍保留原有 Today 逻辑，不删除、不降级
3. 无学习记录或无完成记录时进入 first starter
4. 部分 starter 完成时进入 next starter
5. starter 全完成后进入下一个 `daily_life/time_plan/social` 的 `L0/L1`
6. 无可用 builtin scenes 时走 empty fallback

原因：
- 用户已进入上下文时，继续学习比切回 starter 更符合北极星和已有 Today contract。
- 用户明确要求不要让新手推荐覆盖已有重要 review 逻辑，因此 review 仍保留在 Today 主布局中。

### 4. 前端新增“首要任务卡片”但不删除现有 Today 其他区块

Today 顶部卡片将从单一 continue card 演进为可渲染 starter recommendation 的首要任务卡片。已有学习路径、review summary、saved expressions、welcome/overview 区块保留，只调整卡片数据来源与文案。

原因：
- 满足“新用户今天从这里开始”的明确入口。
- 兼容老用户 continue card 场景。
- 避免大范围推翻 Today 布局。

### 5. 新用户判断采用轻量组合信号，而不是新增重查询

优先复用现有数据推断“新用户/无学习痕迹”：
- `continueLearning` 是否为空
- `overview.completedScenesCount / inProgressScenesCount / savedPhraseCount`
- `todayTasks` 中 scene/output/review 的已知信息
- 场景 progress 聚合中是否存在 starter 完成记录

必要时增加一条与 scenes progress 一起查询的轻量聚合，但不单独去扫 chunks 大表。

原因：
- 避免为“新用户”概念引入单独 schema。
- Today 场景更关心“有没有学习痕迹”和“下一步推荐哪个场景”，不需要绝对意义的注册初始状态。

## Risks / Trade-offs

- [风险] Today 与 `/scenes` 排序仍有局部重复实现 → 缓解：推荐纯函数显式复用现有 starter 元字段口径，并补测试保护。
- [风险] dashboard 新字段增加后前端空值处理不全 → 缓解：字段设计为可选，前端以 empty fallback 和现有 continue card 兼容。
- [风险] review 与 starter recommendation 的视觉优先级让用户误解 → 缓解：保留 review summary/task 区块，并在首要卡片 reason 中明确“先从这里开始/继续学习”。
- [风险] scenes 元字段缺失或 builtin seeds 未同步时推荐为空 → 缓解：服务端返回 `empty` 类型与 `/scenes` 浏览入口。

## Migration Plan

1. 先在 OpenSpec 中新增 today-learning-contract delta。
2. 扩展服务端 dashboard 聚合与推荐纯函数，保持旧字段兼容。
3. 改造 Today 顶部首要任务卡片与文案显示。
4. 补 selector/unit 与页面测试。
5. 跑 `pnpm run build` 与最小相关测试。
6. 如果线上缺失 P0 starter seed/scene 元字段，按既有 seed/sql 流程补齐；本轮不新增 SQL。

回滚：
- 若首要推荐 UI 或新字段有问题，可回退前端读取 `starterRecommendation` 的改动，dashboard 保留旧 continue/review 逻辑即可。

## Open Questions

- 无。当前需求已明确，且优先级、非目标和 CTA 文案方向都足够实现。
