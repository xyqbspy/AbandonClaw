## Context

Review 的场景回补任务由服务端从 `user_scene_practice_attempts` 聚合出未 complete 的最新尝试。该表本身包含 `practice_set_id`，而 scene practice run / attempt / complete 服务端链路要求传入的 `practiceSetId` 能在 `user_scene_practice_sets` 中通过当前 user + scene 校验。

当前前端 due item 没有 `practiceSetId`，于是通过 `review-inline:${sceneSlug}:${exerciseId}:${recommendedMode}` 合成 ID。这个 ID 不是服务端持久化 practice set 记录，和 `assertScenePracticeSetBelongsToScene` 的要求冲突。

## Goals / Non-Goals

**Goals:**

- Review due scene practice item 返回真实 `practiceSetId`。
- Review 页提交回补时复用真实 `practiceSetId`。
- 缺失 `practiceSetId` 时给出受控失败，不继续调用 scene practice mutation。
- 用测试覆盖 API 类型、页面提交参数和失败边界。

**Non-Goals:**

- 不新增 inline practice set 生成机制。
- 不放宽服务端 practice set 归属校验。
- 不重写 Review 场景回补候选生成策略。
- 不做历史缺失 `practice_set_id` 数据迁移。

## Decisions

1. **使用 attempt 原始 `practice_set_id`，不在前端合成 ID**
   - 原因：服务端归属校验已经以真实 practice set 为锚点，前端合成 ID 会制造第二套语义。
   - 替代方案：允许服务端为 `review-inline:*` 自动创建 practice set。放弃，因为会让 Review 回补绕过原练习题来源，且可能污染 generated set 生命周期。

2. **在 due item response 中新增 `practiceSetId`**
   - 原因：Review 页只需要沿用已有锚点，不需要读取完整 practice set。
   - 替代方案：Review 页提交前再请求 scene latest practice set。放弃，因为 latest set 可能不是产生该 failed attempt 的旧 set。

3. **缺失 ID 时前端阻断**
   - 原因：缺失 ID 已经表示数据不满足服务端 run / attempt 契约，继续提交只会得到服务端归属错误。
   - 替代方案：回退到合成 ID。放弃，因为这是当前问题来源。

## Risks / Trade-offs

- [Risk] 历史异常 attempt 缺少 `practice_set_id`。
  → Mitigation：类型允许前端判断，提交时受控失败；不静默创建错误 run。

- [Risk] due item 使用旧 practice set，而 scene 当前 latest set 已变化。
  → Mitigation：这正是期望行为，回补要追溯原 attempt 的题目锚点，而不是 latest set。

- [Risk] API response 字段新增影响 mock。
  → Mitigation：同步 Review API / 页面测试 mock。

## Stability Closure

- 不稳定点：Review scene practice 回补和 Scene practice run 的 `practiceSetId` 来源不一致。
- 本轮收口：统一到服务端持久化 practice set ID。
- 延后项：历史数据迁移和回补候选排序策略。
- 风险去向：Review writeback 文档。
