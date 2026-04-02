## Context

上一轮已经完成了 `chunks/page.tsx`、`scene-detail-page.tsx` 和 `lesson-reader.tsx` 的第一批重组件拆分，但页面层里仍然有两个高风险入口没有治理：

- `review/page.tsx` 同时承担缓存加载、session 恢复、scene review / phrase review 双任务流、阶段推进、提交、副作用通知和底部固定 CTA 编排。
- `scenes/page.tsx` 同时承担列表缓存、后台刷新、进入预热、顶部任务提示、滑动删除、导入弹窗、删除确认和场景生成入口。

这两个文件都已经超过“页面只做组装”的边界。如果继续直接加功能，风险不只是代码变长，而是：

- 页面入口越来越难判断哪些状态是页面级、哪些是局部交互级
- 回归测试会越来越依赖一整个巨型组件，而不是稳定的子模块
- 后续维护者更容易在局部改动时打破缓存、阶段推进或删除/跳转链路

## Goals / Non-Goals

**Goals:**

- 让 `review/page.tsx` 回到“页面组装 + 页面级状态”的职责边界
- 让 `scenes/page.tsx` 回到“列表页组装 + 页面级任务反馈”的职责边界
- 把可独立理解的状态流拆到局部 hook / component
- 保持现有用户行为、路由语义、缓存策略和交互提示不变
- 为下一轮继续拆 `scene-practice-view.tsx` 等重容器建立更稳定的页面层边界

**Non-Goals:**

- 不重写 review 的训练阶段定义
- 不改变 scenes 列表的导入、生成、删除或进入场景的产品行为
- 不在这轮把拆出的片段迁移到 `src/components/shared`
- 不顺手处理服务端 service 级大文件

## Decisions

### 1. `review/page.tsx` 先按“数据 / 阶段控制 / 视图区块”拆

决定：

- 提取 `use-review-page-data` 一类数据 hook，承接缓存命中、后台刷新、pull refresh 和 summary/items 同步
- 提取 `use-review-stage-controller` 一类阶段控制 hook，承接当前任务 key、阶段推进、scene phrase 两套任务流的局部状态
- 视图层至少拆出一个底部动作区和一个主要内容区，避免页面主文件继续内嵌整套 stage renderer

原因：

- `review` 页面的问题不只是 JSX 多，而是任务状态机和数据刷新揉在一起
- 先拆数据与阶段控制，比先抽“卡片组件”更能降低主文件复杂度

备选方案：

- 直接拆很多小 UI 组件：收益有限，因为真正复杂的是状态和阶段推进
- 只拆数据 hook 不拆 stage controller：主页面仍会保留大段任务流判断，减负不够

### 2. `scenes/page.tsx` 先按“数据 / 手势删除 / 弹层装配”拆

决定：

- 提取 `use-scenes-page-data` 一类 hook，统一场景列表读取、缓存、强刷、顶部任务状态和进入预热
- 提取 `use-scene-swipe-actions` 一类 hook，收口滑动删除和卡片位移状态
- 把导入弹窗和删除确认先拆成局部页面组件，减少页面内联 overlay 结构

原因：

- `scenes` 页的复杂度主要来自列表行为和多个 overlay 的混排，而不是单张卡片展示
- 先把滑动删除和弹层拆掉，可以明显降低页面里的交互噪声

备选方案：

- 先抽 scene card：对页面减重帮助有限，真正复杂的是手势和删除链路
- 先把预热逻辑提到 shared：过早公共化，不符合当前边界

### 3. 拆分后仍保留页面级总入口测试，不以新模块测试替代原入口回归

决定：

- 继续保留 `review/page.interaction.test.tsx` 和 `scenes/page.interaction.test.tsx` 作为入口级回归
- 新拆出的 hook / 局部组件只补针对性的补充测试，不替代页面主链路测试

原因：

- 这轮目标是减轻主文件复杂度，不是改变入口结构
- 如果只测新模块，很容易漏掉页面实际装配时的状态衔接问题

## Risks / Trade-offs

- [拆分后状态来源变多] → 页面仍保留最终组装责任，拆出的 hook 只收口单一职责，不重复拥有同一份状态
- [review 阶段推进被拆坏] → 保留现有页面交互测试，并补至少一条针对阶段推进的定向断言
- [scenes 滑动删除交互被拆坏] → 保留页面交互回归，并对 swipe controller 补最小验证
- [为了减行数而过度抽象] → 只拆已经形成清晰职责边界的数据、控制器和 overlay，不提前抽 shared
