# Feature Map

本目录用于维护“模块地图”文档。

模块地图回答的是：

- 这个模块是什么
- 它负责什么
- 它的输入输出是什么
- 它和上下游模块的边界在哪里

如果你要理解一个功能模块本身，先看这里；如果你要理解一条跨模块链路怎么流转，再看 `docs/feature-flows/`。

## 当前目录

- [today.md](/d:/WorkCode/AbandonClaw/docs/feature-map/today.md)
- [scene.md](/d:/WorkCode/AbandonClaw/docs/feature-map/scene.md)
- [session.md](/d:/WorkCode/AbandonClaw/docs/feature-map/session.md)
- [expression-item.md](/d:/WorkCode/AbandonClaw/docs/feature-map/expression-item.md)
- [review.md](/d:/WorkCode/AbandonClaw/docs/feature-map/review.md)

## 推荐使用方式

- 第一次理解项目骨架
  - 建议按下面顺序阅读
- 修改某个模块但还没理清职责边界
  - 先看对应模块文档，再决定是否继续进入 `feature-flows`

## 推荐阅读顺序

建议按这条顺序理解项目骨架：

1. `today`
2. `scene`
3. `session`
4. `expression-item`
5. `review`

## 使用原则

出现这些情况时，应优先补或改 `feature-map`：

- 模块职责变化
- 模块输入输出变化
- 状态边界变化
- 模块间关系变化

以下情况通常不需要单独更新模块地图：

- 单纯样式调整
- 不影响模块职责的局部重构
- 纯测试代码改动

## 与其它文档的边界

- `feature-map/`
  - 解释模块本身是什么、负责什么、边界在哪里
- `feature-flows/`
  - 解释多个模块串起来后具体怎么流转
- `domain-rules/`
  - 解释模块或链路背后的稳定判定标准
- `system-design/`
  - 解释这些职责和规则最终落在哪些实现结构上

## 建议正文模板

新增或重写 `feature-map` 文档时，优先按这组章节组织：

1. 模块目标
2. 输入
3. 输出
4. 核心规则
5. 上下游依赖
6. 常见改动风险
7. 测试关注点
