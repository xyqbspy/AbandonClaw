# Session

## 1. 模块目标

`session` 记录“一次场景训练过程进行到哪里”，用于恢复、推荐和完成判定。

## 2. 输入

- 当前 scene
- 已完成的训练动作
- 当前训练步骤
- practice / variant 运行状态

## 3. 输出

- 恢复点
- 当前步骤
- continue learning 推荐依据
- scene 是否已完成

## 4. 核心规则

- session 应支持中断恢复，而不是每次都从头开始
- session 是 today 推荐 continue learning 的重要依据
- session 中的兼容状态可以保留，但用户侧步骤表达必须稳定

## 5. 上下游依赖

上游：

- scene 训练动作
- practice run / attempt / complete

下游：

- today continue learning
- progress 聚合
- review 回补判断

## 6. 常见改动风险

- 只改 session 写入，不改 continue learning 消费
- 把兼容状态直接暴露成用户可见步骤
- session 与 progress 的完成判定不一致

## 7. 测试关注点

- session resume
- continue learning 回填
- scene 完成后 session / progress 一致性
