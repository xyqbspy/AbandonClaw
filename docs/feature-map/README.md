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

## 阅读顺序

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
