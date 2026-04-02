## Context

上一轮已经完成了 `review/page.tsx`、`scenes/page.tsx`、`scene-detail-page.tsx` 等入口的第一轮减重，但当前还有两个明显的高风险入口没有继续治理：

- `src/app/(app)/chunks/page.tsx` 仍然超过 2500 行，同时承担路由状态、列表筛选、focus detail、cluster 动作、expression map、manual composer、quick add related、音频和多个 sheet 装配。
- `src/features/lesson/components/lesson-reader.tsx` 仍然超过 1300 行，同时承担阅读态、选中态、dialogue/mobile 分支、toolbar、detail panel/sheet、chunk encounter 上报和训练模式桥接。

这两个文件的问题已经不只是“看起来大”，而是页面级组装和局部状态控制长期混在一起。继续在这两个文件里堆功能，会直接提高以下风险：

- 同一份状态被多个局部回调和 effect 读写，后续更难定位谁在真正控制链路
- 入口级测试必须穿过越来越大的组件才能保护真实行为，回归成本持续上升
- 维护者更容易把“应该拆成本地 hook / section 的职责”继续塞回主文件

## Goals / Non-Goals

**Goals:**
- 让 `chunks/page.tsx` 进一步回到“页面级路由与总装配”的边界
- 让 `lesson-reader.tsx` 进一步回到“feature 主容器 + 受控分支装配”的边界
- 优先拆出最清晰的局部动作编排、section 装配和 training bridge 逻辑
- 保持既有用户可见行为、缓存语义、音频行为和上报链路不变

**Non-Goals:**
- 不重写 chunks 页面功能或 lesson 阅读交互
- 不把这轮拆出的片段直接升级成 shared 公共组件
- 不顺手处理 `scene-practice-view.tsx` 或服务端大文件
- 不借拆分改变 review / expression map / sentence detail 的产品流程

## Decisions

### 1. `chunks/page.tsx` 优先按“页面动作编排 / sheet 装配 / expression map 入口”拆

决定：
- 优先抽出页面级动作编排模块，例如 review 启动、map 打开、quick add related、focus detail 成功回退这类成组动作
- 优先抽出多 sheet / panel 装配层，减少主文件继续内嵌多个 `Sheet`、detail 入口和 open-change 逻辑
- 列表展示仍先保留在既有 `ChunksListView` 周边，不把这轮范围扩成整套列表卡片重组

原因：
- 当前 `chunks/page.tsx` 最大的问题不是单张卡片，而是页面级控制链路过多
- 先拆动作和装配，比先继续拆列表卡片更能明显降低主文件认知成本

备选方案：
- 继续拆 `chunks-list-view.tsx`：有价值，但不是当前最影响页面可维护性的块
- 先抽更多 shared：过早公共化，不符合这轮目标

### 2. `lesson-reader.tsx` 优先按“selection / dialogue/mobile 分支 / training bridge”拆

决定：
- 优先抽出 selection 与 active chunk/sentence 的控制逻辑
- 优先抽出 dialogue block / mobile group 这类分支装配片段
- 把训练桥接与上报链路从阅读主容器中拆开，但保留页面/feature 对外行为不变

原因：
- `lesson-reader` 当前最大的复杂度来自多分支渲染和状态桥接，而不是单个 UI 原子组件
- 先收口 selection 和分支装配，能显著降低后续在阅读器里再加交互时的冲突风险

备选方案：
- 先继续拆音频：上一轮已经做过一轮，不是当前最该优先处理的剩余复杂度
- 直接把 detail panel/sheet 提到公共层：会模糊 feature 边界

### 3. 拆分后继续保留入口级测试，不让子模块测试替代主入口回归

决定：
- `chunks/page.interaction.test.tsx` 继续作为主入口保护
- `lesson-reader.interaction.test.tsx` 继续作为主入口保护
- 新拆出的 hook / section 只补最小针对性测试，不能替代入口回归

原因：
- 这轮是结构治理，不是功能替换
- 如果只测新模块，很容易漏掉主入口装配时的状态衔接问题

## Risks / Trade-offs

- [chunks 页面状态来源继续分裂] → 页面仍保留最终组装责任，新模块只收口单一动作域或装配域
- [lesson-reader 训练桥接被拆坏] → 入口交互测试继续保留，并对受影响分支补最小回归
- [为了减行数过度抽象] → 只拆职责已经明显成块的 action / section / controller，不新增重抽象层

## Migration Plan

1. 先审计 `chunks/page.tsx` 中最适合第二轮拆分的动作域和 sheet 装配边界
2. 再审计 `lesson-reader.tsx` 中最适合第二轮拆分的 selection 与分支装配边界
3. 按入口分别完成拆分并补最小测试
4. 运行受影响入口的交互测试、类型检查、spec 校验
5. 更新维护文档与 `CHANGELOG.md`

## Open Questions

- `chunks/page.tsx` 这一轮是否要同时把 expression map 打开链路和 review 启动链路一起收口，还是先拆最重的一组动作后再观察
- `lesson-reader.tsx` 的 dialogue/mobile 分支是否需要先补一层纯逻辑测试，再继续拆 section 组件