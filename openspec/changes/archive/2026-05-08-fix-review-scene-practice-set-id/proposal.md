## Why

Review 页的场景回补任务来自历史 scene practice attempt，但当前 due item 没有把真实 `practiceSetId` 传给前端。前端只能合成 `review-inline:*` ID，再调用 scene practice run / attempt API；服务端又要求 `practiceSetId` 必须属于当前用户和 scene，因此回补提交存在被归属校验拒绝的主链路风险。

## What Changes

- Review due scene practice item 暴露真实 `practiceSetId`。
- Review 页场景回补提交使用真实 `practiceSetId`，不再构造不存在的 inline practice set id。
- 服务端 review 聚合从 `user_scene_practice_attempts.practice_set_id` 带出该字段。
- 测试覆盖 response contract、页面提交参数和缺失 ID 的受控失败。
- 同步 Review writeback 文档，明确 scene practice 回补复用原 practice set 锚点。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `review-practice-signals`: 补充 Review 场景回补任务必须携带并复用真实 scene practice set 锚点的要求。
- `scene-practice-generation`: 补充 scene practice attempt 进入 review 回补时仍必须追溯原 `practiceSetId` 的要求。

## Impact

- 影响代码：
  - `src/lib/server/review/service.ts`
  - `src/lib/utils/review-api.ts`
  - `src/app/(app)/review/page.tsx`
  - `src/app/(app)/review/review-page-messages.ts`
  - Review API / 页面交互测试
- 不新增数据库表或迁移。
- 不改变普通表达 review submit。
- 不改变 scene detail 练习生成、run、attempt 的服务端归属校验。

## Stability Closure

- 本轮收口：Review 场景回补任务的 `practiceSetId` 契约，避免前端合成 ID 与服务端真实归属校验漂移。
- 明确不收：不迁移历史缺失 `practice_set_id` 的异常数据；这类数据在 UI 提交时应受控失败，并记录在 Review 回写文档的降级边界中。
- 延后原因：历史数据修复需要先确认线上数据分布，不适合混入本轮主链路修复。
- 剩余风险记录：`docs/feature-flows/review-writeback.md`。
