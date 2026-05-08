## 1. Contract

- [x] 1.1 在 Review scene practice due item 的服务端类型和前端 API 类型中加入 `practiceSetId`。
- [x] 1.2 从 `user_scene_practice_attempts.practice_set_id` 映射真实 `practiceSetId`。

## 2. Implementation

- [x] 2.1 Review 页提交场景回补时使用 due item 的真实 `practiceSetId`。
- [x] 2.2 移除或停止使用 Review inline 合成 `practiceSetId`。
- [x] 2.3 缺失 `practiceSetId` 时给出受控失败，不调用 scene practice mutation。

## 3. Tests

- [x] 3.1 补 Review API / 类型 contract 校验，确认 due item 带出 `practiceSetId`。
- [x] 3.2 补 Review 页面交互测试，确认提交参数使用真实 `practiceSetId`。
- [x] 3.3 跑最小相关测试、类型检查和维护检查。

## 4. Documentation And Closure

- [x] 4.1 更新 `docs/feature-flows/review-writeback.md`，记录 scene practice 回补复用真实 practice set 锚点。
- [x] 4.2 对照 proposal / design / specs 做实现 Review，更新 tasks 完成状态。
- [x] 4.3 本轮不迁移历史缺失 `practice_set_id` 的数据；风险保留在 Review writeback 文档。
