# Expression Item

## 1. 模块目标

`expression item` 是长期学习对象，用来承接表达的来源、状态、review 和聚类关系。

## 2. 输入

- scene / sentence / chunk 来源
- 用户保存、补全、关联、聚类动作
- review 回写结果

## 3. 输出

- 用户表达条目
- relation / cluster 结构
- review 状态与来源信息

## 4. 核心规则

- expression item 不是 chunk 的简单镜像
- 表达的长期状态依赖真实学习动作，而不是只靠浏览
- related、cluster、review 必须保持数据语义一致

## 5. 上下游依赖

上游：

- scene 中打开 / 保存表达
- chunks 手动录入与 AI assist

下游：

- review 队列
- expression map / focus detail
- progress / today 的部分聚合

## 6. 常见改动风险

- 改 source 字段却不改 review 来源解释
- 改 relation / cluster 语义却不改 chunks 页面回退
- 只改前端 item 展示，不改后端长期状态

## 7. 测试关注点

- phrases / clusters 逻辑测试
- chunks 保存与删除回归
- review 来源和状态写回
