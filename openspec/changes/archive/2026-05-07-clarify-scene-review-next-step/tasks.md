## 1. Scene 下一步主路径

- [x] 1.1 梳理 `SceneTrainingCoachFloatingEntry` 当前步骤、主 CTA、practice step action 与 `SceneBaseView` 的 props 边界。
- [x] 1.2 在 Scene 主学习视图增加轻量“当前下一步”任务条，展示当前步骤、下一步说明和主 CTA，不新增学习状态语义。
- [x] 1.3 保留浮动训练入口作为完整进度 / 快捷入口，避免与主任务条展示完全重复。
- [x] 1.4 调整 variant-study 页动作层级，把“基于此变体生成练习 / 继续学习”保留为主动作，把删除变体降级为辅助或危险次级动作。

## 2. Review 阶段主问题收口

- [x] 2.1 梳理 `ReviewPageStagePanel` 中每个阶段的主问题、输入区、参考区、调度提示和底部 CTA。
- [x] 2.2 收短普通表达 review 阶段说明，让每个阶段优先呈现一个主问题和一个主 CTA。
- [x] 2.3 将来源场景入口、调度原因、统计摘要等辅助信息保持为次级展示，不抢当前阶段主 CTA。
- [x] 2.4 确认场景回补 review 的“回到场景练习”仍是降级辅助路径，而不是当前 review 阶段失败终点。

## 3. 测试

- [x] 3.1 更新或新增 Scene detail regression / interaction 测试，覆盖主学习视图能看到当前下一步，且主 CTA 与训练步骤一致。
- [x] 3.2 更新或新增 variant-study 相关测试，覆盖删除变体不再与学习主动作同层级。
- [x] 3.3 更新或新增 Review interaction 测试，覆盖递进阶段主 CTA、辅助来源入口和最终 feedback 行为不回归。
- [x] 3.4 运行最小相关测试：Scene detail regression、Review interaction、相关 selectors/labels 测试。
- [x] 3.5 运行 `pnpm run lint` 与 `pnpm exec tsc --noEmit`。

## 4. 文档与收尾

- [x] 4.1 同步 `docs/feature-flows/scene-training-flow.md`，记录 Scene 主视图下一步入口与浮动入口分工。
- [x] 4.2 同步 `docs/system-design/review-progressive-practice.md`，记录 Review 阶段主问题和辅助入口层级。
- [x] 4.3 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项、风险和验证结果。
- [x] 4.4 运行 `pnpm run maintenance:check`、`pnpm run text:check-mojibake`、`git diff --check`。
- [x] 4.5 对照 proposal / design / delta specs 做实现 Review，确认未改数据模型、后端写回、调度算法和 AI 评分语义。

## 5. 明确不收项记录

- [x] 5.1 确认本轮不新增数据库字段、API 字段、AI 评分或 Review 调度算法。
- [x] 5.2 确认本轮不重写 Scene practice / variant 生成策略。
- [x] 5.3 确认本轮不抽全局页面骨架、不做全站视觉重构；若实现中发现跨页面样式漂移，只记录风险不扩大范围。
