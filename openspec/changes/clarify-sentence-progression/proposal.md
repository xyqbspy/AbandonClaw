## Why

当前项目已经具备场景学习、句子练习和场景完成的基本能力，但“进入句子后如何推进”“句子在什么条件下算阶段完成”“何时算完成整句练习”“何时算当前场景完成”仍分散在页面编排、selector 和练习组件里，缺少一份稳定且可回归的链路规范。现在需要先把这条链路沉淀为 OpenSpec change，避免后续继续通过局部条件分支维护，导致 `scene -> practice -> variant -> done` 的状态判断和提示文案逐渐偏离。

## What Changes

- 明确 `scene` 中从进入句子、推进句子里程碑、完成练习题型到完成当前场景的正式链路。
- 区分三层状态：场景显式步骤、句子练习内部题型、句子掌握里程碑，避免它们被当成同一套状态使用。
- 规范句子级完成条件与场景级完成条件，明确哪些事件只表示“进入练习”，哪些事件表示“完成句子”，哪些事件表示“完成本轮场景练习”。
- 约束 `today`、`scene` 训练浮层和练习页对同一学习状态的消费方式，避免入口提示和实际完成判断不一致。
- 补充句子推进链路的测试与回归范围，包括步骤推进、题型解锁、句子里程碑升级和场景完成。

## Capabilities

### New Capabilities
- `sentence-progression`: 定义句子从进入练习到里程碑完成、再到整轮场景练习完成的稳定行为。

### Modified Capabilities
- `learning-loop-overview`: 补充场景学习链路中句子推进、场景练习完成与场景 done 的关系约束。

## Impact

- 受影响代码：
  - `src/app/(app)/scene/[slug]/*`
  - `src/features/scene/components/*`
  - `src/features/today/components/*`
  - `src/lib/shared/scene-training-copy.ts`
  - `src/lib/utils/learning-api.ts`
- 受影响系统：
  - 场景学习状态同步
  - 句子练习题型解锁与完成判断
  - `today` / `scene` 对学习状态的聚合展示
- API / 数据：
  - 预期不新增外部 API，但会重新核对现有学习状态字段和事件语义
- 测试：
  - 需要补充或更新 `scene detail`、练习视图、`today` 聚合选择器相关测试
