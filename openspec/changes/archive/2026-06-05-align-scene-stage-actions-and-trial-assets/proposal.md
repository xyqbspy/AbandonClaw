## Why

当前正式 Scene 详情已经具备重新练习和重新进入变体的能力，但入口主要跟随“当前下一步”或隐藏在训练进度面板里。用户在已经解锁变体后，想主动回到原场景练习时不够直观。

匿名试用页也需要展示完整训练价值：试用场景和句子内容固定，因此可以默认展示并解锁“练习 / 变体”两个阶段入口；这些入口应使用预生成、固定资产，不触发实时生成、不写入用户学习状态。

这次变更把正式页和试用页的阶段入口规则收口成统一契约：正式页按阶段到达后显示可用入口，试用页默认全阶段可见且直接开始固定体验。

## What Changes

- 正式 `/scene/[slug]` 主详情页保留“当前下一步”主 CTA，同时在阶段已到达并有可进入内容后，保留清晰的 `练习` / `变体` 阶段入口。
- 正式页 `练习` 入口规则：
  - 未到达练习阶段时不展示为可点击入口。
  - 到达练习阶段后，若已有 generated practice set，点击进入练习；若已 completed，点击开启再练一轮；若尚未生成，则由当前下一步 CTA 负责生成并进入。
  - 手动重新生成题目仍只能发生在练习页内部的明确重新生成动作。
- 正式页 `变体` 入口规则：
  - 未解锁变体时不展示为可点击入口。
  - 解锁后，若已有 generated variant set，点击进入变体；若已 completed，点击开启再练一轮；若尚未生成，则由当前下一步 CTA 负责生成并进入。
- 匿名 `/trial/scene/[slug]` 默认展示 `练习` / `变体` 阶段入口，并视为全阶段解锁。
- 匿名试用的练习、变体、TTS 必须读取固定预生成资产；不得触发 AI 生成、TTS 实时生成、practice set 写入、variant run 写入、progress 写入或 review 写入。
- 匿名保存 / 加入复习 / 注册阻断弹框必须高于句子详情 sheet，或在触发阻断前关闭详情 sheet，避免弹框被遮挡。

## Capabilities

### Modified Capabilities

- `learning-loop-overview`: 补充 Scene 主详情页阶段入口规则，明确“当前下一步”和“阶段入口”的层级关系。
- `scene-practice-generation`: 补充正式页阶段入口不等同于重新生成；重新生成仍必须是练习页内的明确动作。
- `anonymous-trial-mode`: 补充试用页默认全阶段解锁和固定资产只读体验。
- `auth-api-boundaries`: 补充匿名固定资产读取与匿名写入 / 实时生成禁止边界。

## Impact

- 页面：
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/scene/[slug]/scene-detail-view-switch.tsx`
  - `src/features/anonymous-trial/components/share-scene-preview-client.tsx`
- 试用资产：
  - 新增或复用 trial 固定 practice / variant fixture
  - 新增 trial TTS / practice / variant asset manifest 或等效校验
- 测试：
  - 正式 Scene 阶段入口回归
  - 匿名详情全阶段入口、固定资产、弹层层级测试
- 文档：
  - `docs/feature-flows/scene-training-flow.md`
  - `docs/feature-map/anonymous-trial.md`

## Stability Closure

### 本轮收口项

- 正式页：阶段入口只在阶段到达后出现，不绕过训练主路径，不把“入口按钮”变成提前生成入口。
- 试用页：默认全阶段可见，使用固定资产直接体验，不写入、不生成。
- 弹层：注册阻断必须能盖住详情 sheet。

### 明确不收项

- 不改变 Scene 完成判定、review 调度、today continue 优先级。
- 不开放匿名保存、匿名提交、匿名 progress、匿名实时 AI 或匿名实时 TTS 生成。
- 不做匿名学习态迁移到注册账号。
