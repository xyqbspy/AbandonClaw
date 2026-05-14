# Scene

## 1. 模块目标

`scene` 是主学习工作台，负责把用户从“选择学习场景”推进到“完成练习并解锁变体”。

`/scenes` 列表页现在同时承担移动端学习入口职责：新用户应能直接看到 Start Here 推荐路径、默认 builtin 入门场景、筛选入口和底部开始/继续学习主 CTA，而不是先被生成或导入动作拦住。

## 2. 输入

- scene 详情内容
- scenes 列表数据与 scene list cache
- builtin starter / daily scenes 元字段
- 当前学习状态与 session
- expression / chunk 相关数据
- practice / variants / expression map

## 3. 输出

- 学习进度推进
- Start Here / 推荐路径入口
- scenes 筛选、排序与继续学习 CTA
- scene practice / variant 入口解锁
- expression 打开、保存与后续回流

## 4. 核心规则

- 用户可见主步骤应保持为：
  - 听熟这段
  - 看重点表达
  - 开始练习
  - 解锁变体
- scene 不是只读内容页，而是学习流程站点
- `/scenes` 的主优先级是开始学习 / 继续学习，生成、导入、删除、循环复习属于次级操作
- starter packs 和筛选结果必须基于真实 scene list 数据，不得写死静态 mock 场景
- `level/category/source_type/is_starter/is_featured/sort_order/estimated_minutes/learning_goal` 是 scenes 入口展示与排序的稳定元字段
- builtin starter scenes 必须继续复用现有 scene_json / chunks 结构，保证表达沉淀和 review 回流不分叉
- practice、variants、expression map 必须和主场景页串联，而不是散开的独立页

## 5. 上下游依赖

上游：

- scenes 列表进入
- builtin scene seed
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
- `/scenes` 新入口绕过 `openSceneRoute()`，导致预热、进入中 overlay 或重复点击保护丢失
- 筛选、排序、pack 和底部 CTA 逻辑散落到页面 JSX，造成 scenes 与 today 的 continue fallback 语义漂移
- 默认场景只做静态展示，无法进入 chunks / review 主链路

## 7. 测试关注点

- scene detail page 回归
- scenes page interaction 回归
- scene-display selector 单测
- practice / variants 切换
- 学习状态推进与恢复
- expression map / detail 浮层串联
