## Why

Scene 与 Review 的主链路已经能完成学习、练习、变体和复习写回，但用户可见层仍容易被浮动入口、辅助动作和较重阶段说明稀释。下一轮需要把“当前只需要做什么”重新放到页面主路径上，降低用户在 Scene / Review 之间切换时的决策成本。

这次改动服务产品北极星：让场景学习沉淀为未来能回忆、能使用、能迁移的表达资产。目标不是继续增加能力，而是让已有能力更明确地面向用户下一步行动。

## What Changes

- Scene detail 必须在主学习视图中提供清晰的当前训练步骤入口，让用户不依赖浮动入口也能理解下一步。
- Scene 变体学习页必须把“继续学习 / 基于变体练习”等学习动作置于主层级，把删除变体等管理动作降级。
- Review 阶段面板必须聚焦当前阶段的单一主问题，减少说明堆叠，让阶段训练更像自然复习而不是流程表。
- Review 来源场景入口必须保持辅助层级，不得抢占当前阶段主 CTA。
- 保留现有训练状态、practice set、review submit、learning writeback 与调度语义，不新增数据模型或 AI 评分。
- 补齐对应回归测试与文档说明，防止后续再次把辅助动作提升为主路径。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `learning-loop-overview`: 补充 Scene 主学习视图中“当前下一步”必须可见且与训练步骤一致的要求，并约束辅助 / 管理动作层级。
- `review-progressive-practice`: 补充 Review 递进式练习阶段必须聚焦当前主问题、主 CTA 不被来源入口抢占的要求。

## Impact

- 页面与组件：
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/scene/[slug]/scene-training-coach-floating-entry.tsx`
  - `src/features/scene/components/*`
  - `src/app/(app)/review/page.tsx`
  - `src/app/(app)/review/review-page-stage-panel.tsx`
  - `src/app/(app)/review/review-page-labels.ts`
- 逻辑与 selectors：
  - `src/app/(app)/scene/[slug]/scene-detail-selectors.ts`
  - `src/app/(app)/scene/[slug]/scene-detail-messages.ts`
  - `src/app/(app)/review/review-page-selectors.ts`
- 测试：
  - Scene detail regression / interaction 测试
  - Review interaction / selector / labels 相关测试
- 文档：
  - `docs/feature-flows/scene-training-flow.md`
  - `docs/system-design/review-progressive-practice.md`
  - `docs/dev/dev-log.md`

## Stability Closure

### 本轮暴露的不稳定点

- Scene 当前训练步骤主要藏在浮动入口里，用户可能能读场景却不清楚下一步训练动作。
- Scene 变体学习页的学习动作与管理动作同层级展示，容易让用户感到像在管理生成结果。
- Review 递进阶段文案和辅助来源入口较多，存在主任务被说明或跳转入口稀释的风险。

### 本轮收口项

- 收口 Scene 主视图“当前下一步”的用户可见入口。
- 收口 Scene 变体页学习动作与管理动作的层级。
- 收口 Review 阶段面板的主问题表达与主 CTA 优先级。
- 明确来源场景、删除、查看等辅助动作不得抢占当前训练主路径。

### 明确不收项

- 不改学习进度、scene session、practice run / attempt / complete、review submit 的后端语义。
- 不新增数据库字段、API 字段或 AI 评分。
- 不重写 Review 调度算法、Scene 练习生成策略或变体生成策略。
- 不做全站视觉重构、全局 token 重命名或组件库大抽象。

### 延后原因与风险去向

- 数据模型、调度算法和 AI 评分属于正式学习语义变化，若要推进必须另起 OpenSpec change。
- 全站视觉系统治理会扩大范围，后续若继续出现跨页面样式漂移，应进入 component-library / UI style 专项。
- 剩余风险记录在本 change 的 `design.md` 与 `tasks.md`，实现完成后同步进入 `docs/dev/dev-log.md`。
