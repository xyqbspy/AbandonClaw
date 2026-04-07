## Why

当前 scene 练习在删除后重新预热生成时，如果 `/api/practice/generate` 因上游模型请求失败返回 500，前端会持续停留在“练习阶段 + 本地练习集为空”的状态，进而重复触发生成请求。用户会连续看到 `Practice generate failed.`，既无法拿到本地兜底题目，也看不到明确可理解的中文错误提示。

这个问题已经影响到“删除练习后重新生成题目”这条真实用户链路，需要同时收口接口失败兜底、短时间重复失败熔断，以及统一中文错误文案。

## What Changes

- 为 scene 练习生成链路增加短时间失败熔断规则：同一场景在短时间内连续失败达到阈值后，停止继续自动重复请求，并返回最终失败结果
- 调整 `/api/practice/generate` 的失败策略：上游模型请求失败时也要优先回退到本地出题，而不是直接抛出泛化 500
- 统一 practice generate 链路的中文错误文案，避免继续向用户暴露英文报错
- 为已有练习补一个手动重新生成入口，让用户在题目不满意或生成逻辑更新后，无需先删除再回到句子页也能主动重生题目
- 为删除练习后重新预热、接口连续失败、上游失败回退到本地题目补充回归测试

## Capabilities

### New Capabilities

- `practice-generate-retry-guard`: 统一管理练习生成短时间失败熔断与最终失败结果

### Modified Capabilities

- `scene-practice-generation`: 修改场景练习生成在上游失败、连续失败和错误提示时的行为契约
- `scene-practice-generation`: 修改场景练习生成在手动重生入口上的行为契约

## Impact

- 受影响代码：
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
  - `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
  - `src/lib/utils/practice-generate-api.ts`
  - `src/app/api/practice/generate/route.ts`
- 受影响接口：
  - `POST /api/practice/generate`
- 受影响链路：
  - 删除练习后自动预热
  - 已有练习时的手动重新生成
  - 手动点击“开始练习”触发生成
  - scene 练习生成失败后的用户提示
