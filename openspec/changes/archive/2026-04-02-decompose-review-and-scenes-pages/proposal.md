## Why

`review/page.tsx` 和 `scenes/page.tsx` 现在都已经进入“页面壳子 + 状态机 + 局部交互 + 弹层装配”混在一起的阶段。继续在这两个入口里直接叠加功能，会让回归测试、缓存语义和后续维护判断越来越难收口。

## What Changes

- 为 `src/app/(app)/review/page.tsx` 制定第一轮拆分方案，优先把数据加载、阶段推进和底部动作区从页面主文件中拆开。
- 为 `src/app/(app)/scenes/page.tsx` 制定第一轮拆分方案，优先把列表数据刷新、场景进入预热、滑动删除与导入/删除弹层装配从页面主文件中拆开。
- 明确这轮拆分只处理页面级编排与局部容器，不顺手改 review 训练流程、scene 列表功能或用户可见行为。
- 同步补充重页面拆分约束，明确 review/scenes 这类页面在拆分时必须保持缓存、跳转、手势和阶段状态语义稳定。

## Capabilities

### New Capabilities

### Modified Capabilities
- `feature-component-decomposition`: 增加对 review/scenes 这类重页面拆分时缓存语义、阶段状态和手势行为保持稳定的约束
- `project-maintenance`: 增加对 review/scenes 页面这类高状态密度入口的拆分优先级与回归要求说明

## Impact

- 受影响页面：
  - `src/app/(app)/review/page.tsx`
  - `src/app/(app)/scenes/page.tsx`
- 可能新增的 supporting modules：
  - `src/app/(app)/review/*`
  - `src/app/(app)/scenes/*`
- 受影响文档：
  - 项目维护手册
  - `CHANGELOG.md`
- 受影响测试：
  - `review` 页面交互测试
  - `scenes` 页面交互测试
