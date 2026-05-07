## Context

上轮为了让用户不打开悬浮入口也能看到当前下一步，在 Scene 主学习视图增加了任务条。但悬浮训练入口保留了原先的底部主按钮和“下一步”文案，导致两个组件都在表达“当前该做什么”。

当前合理分工应为：

- 任务条：当前步骤、下一步解释、唯一主 CTA。
- 悬浮入口：完整进度、步骤列表、统计摘要、已完成步骤的辅助快捷入口。

## Goals / Non-Goals

**Goals:**

- 避免 Scene 主视图同时出现两个当前步骤主 CTA。
- 保留悬浮入口作为进度总览，不削弱用户回看训练进度的能力。
- 保留已完成练习步骤的辅助复习入口，因为它不是当前主步骤 CTA。

**Non-Goals:**

- 不改变训练步骤计算逻辑。
- 不改变 practice / variant 生成与路由跳转逻辑。
- 不重写浮层定位、拖拽和视觉系统。
- 不改后端学习写回和完成判定。

## Decisions

1. 从 `SceneTrainingCoachFloatingEntry` 移除 `currentStepActionLabel`、`onCurrentStepAction`、`currentStepActionLoading` 和 `currentStepActionDisabled` 的渲染职责。

   原因：这些 props 的语义已经由任务条承载；继续保留会造成两个主 CTA。

2. 悬浮面板底部仅保留进度摘要，不再展示“下一步：…”。

   原因：“下一步”属于当前行动指令，应该只出现在任务条。

3. 保留 `practiceStepAction`。

   原因：它只出现在已完成的练习步骤上，用于复习/再练，是步骤列表中的辅助入口，不是当前步骤主 CTA。

## Risks / Trade-offs

- 用户打开悬浮面板后不能直接执行当前主动作。缓解：主视图任务条固定承担该入口，避免行动指令分裂。
- 既有测试依赖悬浮面板触发当前动作会失效。缓解：更新测试，将主 CTA 行为覆盖放到任务条 / 页面 regression，悬浮组件测试只覆盖进度总览和辅助入口。
