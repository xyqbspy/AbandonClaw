## Why

Scene 主视图新增任务条后，右下角训练悬浮框仍展示当前步骤主 CTA 与“下一步”提示，导致两个入口职责重复，用户会看到两套几乎相同的行动指令。

## What Changes

- 将 Scene 主视图任务条明确为唯一“当前下一步 + 主 CTA”入口。
- 将 `SceneTrainingCoachFloatingEntry` 收口为训练进度、步骤总览、统计摘要和已完成步骤的辅助快捷入口。
- 移除悬浮面板中与任务条重复的当前步骤主 CTA 与下一步提示。
- 同步 Scene training flow 和 stable spec 中的入口职责边界。
- 不改变训练步骤推导、学习状态、写回、practice / variant 生成或完成判定。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `learning-loop-overview`：Scene 当前下一步入口与浮动训练入口的职责边界需要更严格，浮动入口不得重复承载当前主 CTA。

## Impact

- 影响页面组件：`SceneTrainingNextStepStrip`、`SceneTrainingCoachFloatingEntry` 及 Scene detail 组装。
- 影响测试：Scene detail regression、floating entry interaction。
- 影响文档：`docs/feature-flows/scene-training-flow.md`、`openspec/specs/learning-loop-overview/spec.md`。
- 不影响 API、数据库、缓存、学习状态流或后端服务。
