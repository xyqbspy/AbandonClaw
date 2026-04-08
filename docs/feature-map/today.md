# Today

## 1. 模块目标

`today` 是用户每天进入系统后的主入口，负责回答两件事：

- 今天最应该先做什么
- 当前学习闭环卡在什么位置

它不是内容生产页，而是编排页。

## 2. 输入

- continue learning 场景
- 今日 scene 任务
- review summary / due review
- output task / phrases saved today

## 3. 输出

- 主推荐动作
- 次级任务状态
- 今日概览摘要

## 4. 核心规则

- 有未完成或可继续的 scene / session 时，优先继续当前训练
- review 有积压时，需要明确展示 review 任务和数量
- output / review 是聚合任务，不应覆盖当前正在进行的 scene 主链路

## 5. 上下游依赖

上游：

- learning service
- review summary
- scene progress / session 聚合

下游：

- 跳转到 scene
- 跳转到 review
- 回到 progress / 其它概览页

## 6. 常见改动风险

- 只改推荐文案，不同步调整真正推荐条件
- 把 repeat practice / repeat variants 和正常 continue learning 混在一起
- 直接在页面解释底层 review 原始事件，而不是消费聚合字段

## 7. 测试关注点

- 主推荐优先级
- continue learning 的恢复入口
- review / output 任务状态展示
- today summary 与真实学习状态一致
