## Context

当前 `today` 页面实际由三层数据共同驱动：

- 服务端 `getLearningDashboard()` 返回 `overview`、`continueLearning`、`todayTasks`
- 前端 `resolveContinueLearning()` 会在服务端 `continueLearning` 为空时，继续用场景列表和本地 repeat generated state 兜底
- `buildTodayTasks()`、`getContinueLearningStepLabel()`、`getContinueLearningHelperText()` 再把这些字段翻译成页面卡片、步骤文案、按钮跳转与锁定状态

这条链路已经具备业务能力，但状态解释散落在多个文件里。最近我们又把“进入句子练习”“句子完成”“场景练习完成”拆开，导致 today 页面展示语义更依赖一套明确的数据契约。如果没有单独梳理，后续改 service、selector 或 scene 学习流程时，很容易出现 today 文案、任务状态和后端真实学习态不一致。

## Goals / Non-Goals

**Goals:**

- 定义 today 页面各块展示数据的来源、优先级、回退规则和允许的前端派生范围。
- 定义后端学习表与 `LearningDashboardResponse` 之间的映射关系，尤其是 `currentStep`、`masteryStage`、`completedSentenceCount`、repeat continue 与今日任务完成态。
- 明确维护文档的交付物，让后续改 scene 学习链路时有一份可同步更新的稳定说明。
- 明确回归测试边界，保证 today 页面和后端 dashboard 聚合不会再次各自漂移。

**Non-Goals:**

- 不在这次提案里重做 today 页面 UI 布局或视觉设计。
- 不默认引入新的学习步骤枚举、数据库表或额外 API。
- 不扩大到 `progress`、`review`、`chunks` 全量文档重写，只覆盖它们与 today 直接相连的输入输出关系。

## Decisions

### 1. 以服务端 dashboard 为 today 学习语义主来源，本地场景列表与 repeat generated state 仅作为回退层

原因：

- `service.ts` 已经掌握用户学习主状态、每日统计和 repeat continue 聚合能力。
- 前端 fallback 仍然需要保留，以处理 dashboard 暂无 continue item 但本地已有可恢复入口的场景。
- 明确“主来源”和“回退层”后，可以防止 selectors 再悄悄承担业务状态修正职责。

备选方案：

- 继续让 selectors 自由拼接所有来源：实现快，但语义边界继续模糊。
- 彻底移除本地 fallback：语义更纯，但会损失当前已有的离线/弱网络恢复体验。

### 2. 单独输出一份 today 数据映射文档，覆盖“后端字段 -> dashboard 响应 -> selectors 派生 -> 页面展示”

原因：

- 仅靠 spec delta 适合描述规则，不适合承载字段级映射表、优先级表和维护提示。
- 文档可以作为开发和回归时的直接参照，减少从代码反推链路的成本。

备选方案：

- 只写 OpenSpec spec：规则能保留下来，但不够适合快速查字段来源。
- 只在代码里加注释：分散且难维护，无法表达完整链路。

### 3. 约束 today selectors 只做展示派生，不再定义新的学习完成语义

原因：

- `currentStep`、`masteryStage`、`completedSentenceCount` 与 repeat continue 的解释，应该由服务端学习聚合或稳定契约决定。
- selectors 适合负责文案、卡片状态、按钮 href 和兜底行为，不适合继续创造“看起来合理”的新学习语义。

备选方案：

- 继续在 selector 层修补语义缺口：短期灵活，长期会再次出现 today 与 scene / backend 不一致。

### 4. 把“文档同步”纳入受影响变更的维护规则

原因：

- 这次用户明确要求把 today 数据与学习步骤、后端关联关系写成文档。
- 如果后续 scene 学习步骤、完成条件、today 卡片逻辑调整时不要求同步文档，这份梳理会很快过期。

## Risks / Trade-offs

- [风险] 文档和实现再次脱节 -> [缓解] 在 spec 和 tasks 中显式要求：改 today 学习映射、dashboard 聚合或 scene 步骤语义时必须同步文档与测试。
- [风险] 过度把 today 逻辑搬回服务端，削弱当前本地 fallback 体验 -> [缓解] 保留本地 repeat / first scene fallback，但把其定位写成明确兜底层。
- [风险] today 页面仍有历史字段兼容逻辑，梳理后暴露更多不一致 -> [缓解] 在实施阶段先补 mapping 表和回归测试，再决定是否收紧代码。
- [风险] 文档过于宏观，无法指导改动 -> [缓解] 文档必须包含字段来源、优先级、派生规则和典型场景，而不只写概念说明。
