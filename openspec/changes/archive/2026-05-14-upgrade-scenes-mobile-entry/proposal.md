# 变更提案：upgrade-scenes-mobile-entry

## 背景

P0 已经为 `scenes` 补齐了 builtin starter/daily scenes 和基础元字段，但当前 `/scenes` 页面仍然更像“场景管理页”而不是“学习入口页”：

- 新用户虽然能拿到默认场景，但首屏不知道应该先从哪里开始。
- 生成 / 导入入口仍处于高优先级，压过“开始学习 / 继续学习”主线。
- 移动端缺少清晰的推荐路径、筛选入口和底部主 CTA。
- `level/category/source_type/is_starter/is_featured/sort_order/estimated_minutes/learning_goal` 这些 P0 字段还没有真正转化成可见学习路径。

本轮需要把 `/scenes` 升级为“移动端优先的新手学习入口页”，让新用户进入后就能看到 Start Here、学习中场景、推荐 pack 和可直接用的筛选能力。

## 本轮目标

1. 在 `/scenes` 首屏为新用户展示清晰的 Start Here 新手路径。
2. 用真实 scenes 数据渲染推荐路径卡片、筛选区和纵向场景卡片，不写死场景内容。
3. 让底部主 CTA 优先服务“开始学习 / 继续学习 / 复习表达”，而不是“生成 / 导入”。
4. 保留原有生成 / 导入 / 删除 / 预热 / review pack 能力，不破坏主链路。
5. 保证移动端优先展示，同时不把桌面端布局打坏。

## 范围

### 本轮收口

- 改造 `/scenes` 页面结构，转译 `scenesNew.html` 的移动端视觉方向为 Next.js / React / Tailwind 组件。
- 新增基于真实 scenes 数据的 starter pack 组合、筛选、排序、主 CTA 选择逻辑。
- 展示 `level/category/source_type/is_starter/is_featured/sort_order/estimated_minutes/learning_goal` 等 P0 字段。
- 保留并降级展示生成 / 导入入口，避免继续作为主 CTA。
- 处理加载中、空状态、筛选无结果、错误状态和安全区底部遮挡。
- 补最小单测，覆盖 selector / utility 逻辑和关键页面交互。

### 明确不收

- 不重构 scene detail、TTS、review、chunks 的内部学习逻辑。
- 不新增复杂推荐算法，不重做 Today 聚合。
- 不新建大型 UI 基础设施或状态管理。
- 不做完整远程搜索体系；如现有页面没有正式搜索，仅做最小入口或本地搜索降级。
- 不重构整个桌面端信息架构，只保证桌面端继续基本可用。

## 稳定性收口

本次需求暴露了以下稳定性问题，需在本轮最小收口：

- `scenes` 页面的主入口语义仍停留在“管理 / 生成场景”，与产品北极星“先开始学”不一致。
- P0 新字段已经进了 API，但前端缺少稳定的 selector 层，后续容易把筛选、推荐、主 CTA 逻辑散落到页面组件里。
- `scenes` 与 `today` 都在做 continue learning / fallback 入口判定，本轮需要复用或对齐现有 selector 语义，避免重复定义。

本轮不收的风险：

- 如果后续要做跨页面统一的学习入口编排，仍需要单独收敛 `today` 与 `scenes` 的推荐协同。
- 现有 review pack 区块是否继续保留在 `/scenes` 顶部，属于后续页面信息架构优化，不在本轮解决。

风险记录位置：

- `openspec/changes/upgrade-scenes-mobile-entry/design.md`
- `docs/dev/dev-log.md`（实施阶段补充）

## 影响范围

- `src/app/(app)/scenes/*`
- 可能新增 scenes 相关展示组件与 selector / utility
- scenes 页面测试
- `docs/feature-flows/scene-entry.md`
- OpenSpec / dev-log / archive（完成态）

## 验收摘要

- `/scenes` 移动端宽度下可见吸顶标题、推荐路径横滑卡片、粘性筛选区、纵向卡片列表、底部主 CTA。
- 推荐路径和场景列表基于真实 API 数据渲染。
- Start Here 可进入第一个未完成 starter scene。
- level/category/source_type 筛选可用。
- 生成 / 导入仍可用，但不再压过学习主线。
- `pnpm run build` 成功。
