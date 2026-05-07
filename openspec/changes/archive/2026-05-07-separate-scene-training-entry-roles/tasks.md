## 1. 入口职责收口

- [x] 1.1 移除 `SceneTrainingCoachFloatingEntry` 中当前步骤主 CTA 和“下一步”提示的展示。
- [x] 1.2 保留悬浮入口的完整进度、步骤列表、统计摘要和已完成步骤辅助快捷入口。
- [x] 1.3 确认任务条仍承载当前步骤、下一步说明和唯一主 CTA。

## 2. 测试

- [x] 2.1 更新 `SceneTrainingCoachFloatingEntry` 测试，覆盖其只作为进度总览和辅助入口。
- [x] 2.2 更新 Scene detail regression，覆盖页面主 CTA 只出现在任务条，不在悬浮面板重复出现。
- [x] 2.3 运行最小相关 Scene detail / floating entry 测试。

## 3. 文档与收尾

- [x] 3.1 同步 `docs/feature-flows/scene-training-flow.md`。
- [x] 3.2 同步 `openspec/specs/learning-loop-overview/spec.md`。
- [x] 3.3 更新 `docs/dev/dev-log.md`，记录本轮收口项、不收项和验证。
- [x] 3.4 运行 `pnpm run text:check-mojibake`、`pnpm run maintenance:check`、OpenSpec validate 与 `git diff --check`。
- [x] 3.5 对照 proposal / design / spec delta 做实现 Review，确认未改状态流、API、数据库、生成策略和完成判定。
