## Why

当前从 `chunks` 或其他入口进入 `scene/[slug]` 时，用户会先感受到一段短暂空白，再看到场景内容出现。这个空档主要发生在路由切换与场景详情数据加载之间：路由级 `loading.tsx` 目前直接返回 `null`，而页内 `sceneLoading` 只展示极简 spinner，没有给用户稳定的结构预期。

这类空白虽然只有几百毫秒，但正好出现在主学习链路 `today / scenes / chunks -> scene` 的关键进入时刻，会放大“页面卡住”或“白屏”的感知，也不符合项目当前对学习链路连续性的要求。

现在需要把场景详情页的进入反馈定义成明确的可维护行为：进入时必须先展示结构化骨架，不允许出现整页空白；相关入口也应尽量做轻量预热，减少这段可感知等待。

## What Changes

- 为 `scene/[slug]` 提供稳定的路由级骨架屏，替换当前 `loading.tsx` 的空返回。
- 为场景详情页内部 `sceneLoading` 提供结构化 skeleton，而不是单行 loading 文案。
- 对齐 `chunks -> scene` 的进入链路，在跳转前触发轻量场景预热，减少缓存未命中时的首屏空档。
- 补充相关回归测试，锁住“进入场景不再空白”和“列表入口会触发预热”的行为。

## Capabilities

### Modified Capabilities

- `learning-loop-overview`: 调整 `scene` 入口的加载反馈要求，保证主学习流程入口在等待期间保持可感知的结构化占位，而不是空白页。

## Impact

- 受影响页面与前端模块：
  - `src/app/(app)/scene/[slug]/loading.tsx`
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/chunks/page.tsx`
  - `src/features/scene/components/*`
- 数据库迁移：否
- API 契约变化：否
- 前端交互变化：是，进入场景时由空白 / spinner 改为骨架屏
- 缓存策略变化：轻微，`chunks -> scene` 会补一层已有场景预热能力的复用
- 测试影响：是，需要补充 `scene detail` 与 `chunks` 相关交互 / 回归测试
