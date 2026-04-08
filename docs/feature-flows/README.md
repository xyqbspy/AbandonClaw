# Feature Flows

本目录用于维护项目中的功能链路文档。

功能链路文档用于描述某个功能从入口到结果、从上游依赖到下游回写、从正常路径到异常/回退路径的完整过程。
所有主链路改动，必须同步更新本目录文档。

## 推荐使用方式

- 修改推荐逻辑、状态流转、回写或恢复路径
  - 先找对应链路文档
- 已经知道模块职责，但不确定实际链路怎么跑
  - 优先看这里，再回到代码

## 使用原则

以下场景必须创建或更新功能链路文档：
- 新增主链路功能
- 修改入口、推荐逻辑、状态流转、回写规则、恢复逻辑、回退路径
- 删除已有链路节点或废弃旧流程
- 改动会持续影响后续 AI 开发和重构

以下场景通常不需要单独维护链路文档：
- 单纯样式调整
- 局部文案修改
- 不影响行为的类型/lint 修复
- 无外部行为变化的小重构

## 开发要求

- 修改复杂功能前，优先阅读对应链路文档
- 若本次改动改变链路语义，必须同步更新文档
- 验收测试应优先保护链路文档中定义的核心规则
- 删除功能时，应在链路文档中标明删除依据、替代路径和影响范围

## 当前目录

- [scene-entry.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/scene-entry.md)
- [today-recommendation.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/today-recommendation.md)
- [scene-training-flow.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/scene-training-flow.md)
- [session-resume.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/session-resume.md)
- [review-writeback.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/review-writeback.md)

## 与其它文档的边界

- `feature-map/`
  - 解释模块本身的职责与边界
- `feature-flows/`
  - 解释跨模块链路如何触发、流转、回写和降级
- `domain-rules/`
  - 解释链路为什么这样判定，以及哪些规则不能改歪
- `system-design/`
  - 解释链路依赖的聚合、缓存、落库和实现锚点
- `docs/dev/dev-log.md`
  - 记录开发过程和中间态决策
- `docs/dev/testing-policy.md`
  - 约束测试策略，而不是解释具体链路

## 建议正文模板

新增或重写 `feature-flows` 文档时，优先按这组章节组织：

1. 目标
2. 入口
3. 主链路
4. 关键状态/回写节点
5. 失败与降级
6. 改动时一起检查
7. 建议回归
