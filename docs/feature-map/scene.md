# Scene

## 1. 模块目标

`scene` 是主学习工作台，负责把用户从“阅读场景”推进到“完成练习并解锁变体”。

## 2. 输入

- scene 详情内容
- 当前学习状态与 session
- expression / chunk 相关数据
- practice / variants / expression map

## 3. 输出

- 学习进度推进
- scene practice / variant 入口解锁
- expression 打开、保存与后续回流

## 4. 核心规则

- 用户可见主步骤应保持为：
  - 听熟这段
  - 看重点表达
  - 开始练习
  - 解锁变体
- scene 不是只读内容页，而是学习流程站点
- practice、variants、expression map 必须和主场景页串联，而不是散开的独立页

## 5. 上下游依赖

上游：

- scenes 列表进入
- scene detail 数据预热

下游：

- chunks 表达沉淀
- review 回补
- progress / today 聚合

## 6. 常见改动风险

- 路由 query 和视图状态不同步
- 删除 / 重生成 practice 后链路断裂
- 主步骤文案和真实学习状态不一致
- scene 内动作改了，但 today / progress 聚合没同步

## 7. 测试关注点

- scene detail page 回归
- practice / variants 切换
- 学习状态推进与恢复
- expression map / detail 浮层串联
