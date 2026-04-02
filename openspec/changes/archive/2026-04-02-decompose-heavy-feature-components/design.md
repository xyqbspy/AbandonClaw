## Context

上一轮组件治理已经把真正跨 feature 复用的组件迁到了 `src/components/*`，但仓库里仍有几类“没有跨 feature 依赖问题、却明显过重”的核心容器：

- `src/app/(app)/chunks/page.tsx` 约 2400 行，同时管理路由状态、focus detail、cluster 操作、手动录入、快捷添加、音频和多个 sheet
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx` 约 1500 行，同时管理场景学习状态、训练浮层、practice/variant/detail 页切换和缓存同步
- `src/features/lesson/components/lesson-reader.tsx` 约 1400 行，同时管理阅读态、选中态、chunk 激活、音频、移动端分组和训练模式差异

这些文件的问题不是“应该抽公共组件”，而是已经同时承担了太多页面编排、状态流和视图职责。若继续在这些文件上叠加需求，会直接提高以下风险：

- 页面行为改动越来越难定位回归点
- 同一状态被多个局部回调和 `useEffect` 反复读写
- 交互测试必须从超大组件入口才能覆盖，导致维护成本升高
- 后续真正的公共化判断会被“先拆清楚”这个前置问题卡住

## Goals / Non-Goals

**Goals:**

- 为超重页面/feature 容器建立可执行的拆分标准
- 优先拆分 `chunks/page.tsx`、`scene-detail-page.tsx`、`lesson-reader.tsx` 中最明显的局部职责块
- 让页面层回到“路由 + 组装 + 串接”的薄层角色
- 保持既有产品行为、路由、缓存语义和对外 props 稳定

**Non-Goals:**

- 不把这些重组件直接抽成公共组件
- 不重写整套场景学习、chunks 管理或 lesson 阅读流程
- 不改变服务端接口、数据库结构或缓存协议
- 不为了追求行数绝对减少而强行制造抽象层

## Decisions

### 1. 优先做 feature 内部拆分，不做新的公共组件抽象

决策：本次改动默认把重组件拆回所在 feature 或页面目录下的 `hook / logic / section component`，而不是直接提升到 `src/components/shared`。

原因：

- 这几个文件的问题核心是职责过多，不是跨 feature 复用
- 提前公共化会把强业务语义容器抽空，反而模糊边界
- 先拆清楚 feature 内部结构，后续再判断是否有稳定公共部分更稳妥

### 2. 以“局部职责块”为单位拆，而不是整文件翻修

决策：每个重文件只优先抽走最明确的职责块。

首批优先目标：

- `chunks/page.tsx`
  - sheet/panel 装配层
  - focus detail 相关动作编排
  - quick add related / map open 这类局部动作
- `scene-detail-page.tsx`
  - `SceneTrainingCoachFloatingEntry`
  - 训练步骤 action 解析
  - practice/variant 切换的局部编排
- `lesson-reader.tsx`
  - 选择态与 chunk 激活逻辑
  - 音频动作组合逻辑
  - 移动端/对话块渲染分支

原因：

- 局部拆分更容易保持行为不变
- 可以用现有测试逐段卡住，不需要一次重写整页

### 3. 拆分后的落点遵循固定规则

决策：统一使用下面的落点判断：

- 页面级路由与组装：继续留在 `page.tsx`
- 可复用的状态与动作编排：抽到同目录 `use-*` 或 `*-controller.ts`
- 纯派生逻辑：抽到 `logic.ts` / `selectors.ts`
- 大块视图片区段：抽到 `*-section.tsx` / `*-panel.tsx`

原因：

- 这与现有仓库约定一致
- 后续维护者看到文件名就能判断职责，不需要重新猜

### 4. 以“行为不变 + 测试补位”为拆分验收标准

决策：每次拆分都必须保留现有 props 和路由/缓存语义，并补受影响测试。

原因：

- 这类改动最容易出现“只是重构，结果用户链路悄悄变了”
- 没有回归保护的拆分价值很低

## Risks / Trade-offs

- [拆分过程中状态流被打断] → 先抽纯派生逻辑和局部动作，再抽视图块，避免同时改动太多层
- [文件变多导致查找成本上升] → 严格约束命名和落点，只为明确职责拆分，不制造空壳文件
- [测试需要同步调整] → 优先保留原入口测试，再补子模块测试，避免只测新文件不测真实入口
- [误把业务容器抽成公共组件] → 在组件治理 spec 与维护文档中明确禁止这种路径

## Migration Plan

1. 先为这次拆分建立 OpenSpec 规则与任务清单
2. 先处理 `chunks/page.tsx` 和 `scene-detail-page.tsx` 里最清晰的局部职责块
3. 再处理 `lesson-reader.tsx` 的内部拆分
4. 每完成一块就执行对应单测/交互测试并更新 `CHANGELOG.md`
5. 所有拆分完成后再评估是否需要继续推进下一轮更细粒度收口

## Open Questions

- `scene-detail-page.tsx` 中训练浮层最终是只抽组件，还是连拖拽状态一起抽成单独 hook，更适合在实现时看测试耦合度决定
- `lesson-reader.tsx` 是否需要先补一层更细的 logic test，再开始拆移动端分组与选择逻辑
