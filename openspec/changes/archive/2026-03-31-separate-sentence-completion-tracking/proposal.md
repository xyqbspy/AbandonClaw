## Why

当前项目已经在前端解释层把“进入句子练习”“完成整句练习”“完成当前场景练习”拆开了，但服务端学习状态仍把 `practice_sentence` 事件近似当成“句子已完成”的信号使用，导致 `practiced_sentence_count`、`currentStep`、`today` 聚合和场景完成判定之间仍存在语义混用。现在需要把服务端记录模型和聚合消费一起收口，避免前后端各自维护不同的“句子完成”定义，后续继续放大学习状态不一致。

## What Changes

- 拆分服务端“进入句子练习”和“句子完成”两类学习事件，不再让 `practice_sentence` 直接承担句子完成语义。
- 重新定义场景学习进度中与句子推进相关的字段、聚合口径和完成条件，保证 `today`、`scene`、学习统计消费的是同一套服务端语义。
- 调整场景 session done、场景练习完成和句子完成之间的判定关系，避免单次进入练习就推进到接近完成状态。
- 规范 `continueLearning`、`todayTasks` 与场景训练状态聚合时如何消费句子级和场景级完成信息。
- 补充对应 API、服务层和聚合测试，覆盖兼容旧字段、迁移期间的回退行为和新语义回归。

## Capabilities

### New Capabilities
- `sentence-completion-tracking`: 定义服务端如何记录句子已进入练习、句子已完成、场景练习已完成及其聚合消费规则。

### Modified Capabilities
- `learning-loop-overview`: 补充学习闭环里服务端学习状态必须区分句子进入练习与句子完成的约束。

## Impact

- 受影响代码：
  - `src/lib/server/learning/service.ts`
  - `src/lib/server/learning/practice-service.ts`
  - `src/app/api/learning/scenes/[slug]/training/route.ts`
  - `src/app/api/learning/dashboard/*`
  - `src/lib/utils/learning-api.ts`
  - `src/features/today/components/*`
  - `src/app/(app)/scene/[slug]/*`
- 受影响系统：
  - 场景学习状态记录
  - 学习 dashboard 聚合
  - continue learning / today task 生成
  - 场景完成和变体解锁判断
- 数据与兼容性：
  - 预期会触达学习状态字段或聚合解释层
  - 需要考虑兼容已有 `practice_sentence` / `practiced_sentence_count` 记录
- 测试：
  - 需要补充服务层、API 层、today 聚合和 scene 回归测试
