## Why

当前场景练习页在点击“重新生成题目”后进入 `practice/run` 页面时，会持续重复调用 `/api/learning/scenes/[slug]/practice/run`。这不是用户主动重复操作，而是题目页的运行态启动副作用在重渲染后被反复触发，导致接口噪声、潜在状态抖动和不必要的后端写入。

同时，练习页顶部“来源场景”目前只能展示场景标题，用户无法判断这套题目是 AI 生成还是系统本地生成。尤其在上游失败回退本地出题后，用户侧缺少明确提示，不利于理解题目来源和排查生成质量问题。

## What Changes

- 修正 scene 练习页启动 `practice run` 的触发条件，确保单次进入题目页或单次重新生成后只启动一次运行态
- 为练习集补充生成来源元数据，区分 `ai` 与 `system`
- 在题目页“来源场景”文案中增加生成来源提示，例如：`来源场景 | 系统生成：Ordering Coffee(咖啡店点单)`
- 为重复请求回归和来源提示补充测试

## Capabilities

### Modified Capabilities

- `scene-practice-generation`: 修改题目页运行态启动的幂等行为
- `scene-practice-generation`: 修改练习来源展示，补充系统生成 / AI 生成提示

## Impact

- 受影响代码：
  - `src/features/scene/components/scene-practice-view.tsx`
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
  - `src/lib/types/learning-flow.ts`
- 受影响接口：
  - `POST /api/learning/scenes/[slug]/practice/run`
- 受影响链路：
  - 题目页首次进入
  - 题目页“重新生成题目”
  - 题目页来源场景展示
