# 变更提案：重构复习页面体验

Status

draft

Why

当前 `review` 页面虽然已经接通了表达复习、场景练习回补和缓存刷新，但整体仍偏“功能堆叠”：

- 页面信息层级不清，缺少明确的阶段引导、进度感和下一步动作
- 普通表达复习与场景内联练习虽然都在同页，但视觉和交互语言不统一
- 当前交互更像管理页，不像连续复习工作台
- 设计稿 [review.html](/d:/WorkCode/AbandonClaw/newApphtml/review.html) 体现了更明确的三段式节奏：唤醒回忆 -> 变体练习 -> AI 反馈/延展

这次变更希望以 `review.html` 为参考，完整改造当前复习页面的 UI 与交互组织方式。默认优先复用现有后端接口；若在实施阶段发现要实现目标交互必须补后端能力，则允许把后端支持列入同一个 change 的实施计划中，按“先前端主流程、再逐步补后端能力”的方式推进。

What Changes

- 参考 `review.html` 重新定义 `review` 页信息结构、视觉层级和主交互节奏
- 把当前复习页改造成“单卡片沉浸式复习流”，而不是多个独立卡块并列展示
- 重新组织普通表达复习、场景练习回补、查看参考、下一题推进和进度展示
- 为暂时缺少后端支持的交互保留 TODO UI/占位逻辑，并允许后续把这些 TODO 转成正式的后端实施任务
- 为新的复习页体验补充页面 selector / interaction / regression 测试

Scope

In Scope

- `review` 页面整体 UI 改造
- `review` 页前端交互逻辑重组
- 页面内不同复习阶段和按钮行为重构
- 将现有后端能力映射到新的复习流
- 对缺失后端支持的交互定义 TODO 占位策略
- 相关 OpenSpec 规范和维护文档更新

Out of Scope

- 本次不强行一次性补齐所有后端表结构或复杂新的评分引擎
- 本次不要求一次性实现所有 AI 反馈能力
- 本次允许在实施阶段按需扩展 `review-api` 或 `learning-api`，但要先回写 design / tasks / spec delta 再继续

Impact

- 影响的规范：
  - `learning-loop-overview`
  - `review-experience`（新增）
- 影响的代码模块：
  - `src/app/(app)/review/page.tsx`
  - `src/app/(app)/review/review-page-selectors.ts`
  - `src/app/(app)/review/review-page-*`
  - `src/features/review/components/*`
- 是否涉及数据库迁移：可能，视后端支持范围而定
- 是否涉及 API 变更：可能，允许纳入本次 change 的后续实施计划
- 是否影响前端交互：是
- 是否影响缓存策略：可能，小范围调整 `review-page-cache` 的消费方式
- 是否影响测试基线或回归范围：是
- 兼容性：向后兼容，优先复用现有后端接口
- 风险点：
  - UI 全量改造容易打断现有普通复习与场景回补两条链路
  - 若交互节奏设计过重，可能与当前后端数据粒度不匹配
  - 若后端能力分阶段补齐，需要明确哪些交互是正式落库、哪些仍是前端 TODO 占位
