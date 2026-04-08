# Review Writeback

## 1. 目标

说明 review 结果如何写回正式学习信号、调度和聚合摘要。

## 2. 入口

- 普通表达 due review
- scene practice 回补

## 3. 主链路

1. 页面推进 review 阶段
2. 用户提交结果
3. 前端调用 review submit / scene practice 相关 API
4. 服务端写回 review logs、summary、next review
5. today / progress / review summary 消费更新后的聚合

## 4. 正式回写内容

- review result
- output confidence / full output 等正式信号
- review scheduling 相关字段

## 5. 失败与降级

- 提交失败时不能误刷新队列
- 来源场景不可访问时要降级，而不是硬跳转
- 本地临时阶段不应被误当成正式回写结果

## 6. 改动时一起检查

- review page 阶段推进
- review source contract
- review practice signals
- review scheduling signals
