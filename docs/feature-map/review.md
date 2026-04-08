# Review

## 1. 模块目标

`review` 负责把已经沉淀的内容重新拉回回忆链路，并将结果回写为稳定学习信号。

## 2. 输入

- due review 表达
- scene practice 回补项
- review scheduling signals

## 3. 输出

- review 结果
- 正式训练信号
- next review 调度
- today / progress 可消费的聚合摘要

## 4. 核心规则

- review 不是孤立卡片页，而是学习闭环的一部分
- 普通表达 review 和 scene 回补可以共存于同一工作台
- 回忆结果必须稳定回写，而不是只停留在本地 UI

## 5. 上下游依赖

上游：

- chunks 保存与进入 review
- scene practice 回补

下游：

- review summary
- scheduling
- today / progress 聚合

## 6. 常见改动风险

- 只改页面阶段，不改正式信号写回
- 调度规则变化后 today / summary 解释不同步
- 来源场景不可访问时没有降级

## 7. 测试关注点

- review 阶段推进
- source scene 降级
- scheduling 提示
- review writeback 与 summary 更新
