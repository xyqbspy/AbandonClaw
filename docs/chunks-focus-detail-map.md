# Chunks 详情浮层与表达地图维护说明

## 1. 目标

这份文档补充说明 `chunks` 页里两条容易一起出问题、但目前没有独立文档的链路：

- focus detail 详情浮层
- expression map 表达地图

它和 [chunks-data-mapping.md](/d:/WorkCode/AbandonClaw/docs/chunks-data-mapping.md) 的分工不同：

- `chunks-data-mapping.md` 负责保存、relation、cluster、review 的数据契约
- 本文档负责页面层怎样打开详情、切换 tab、触发更多动作、打开地图、把 map cluster 批量并入当前学习链路

## 2. 关键入口

页面总装配：

- [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/page.tsx)
- [chunks-page-sheets.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-page-sheets.tsx)
- [use-chunks-page-actions.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-chunks-page-actions.ts)

详情浮层组件：

- [focus-detail-sheet.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-sheet.tsx)
- [focus-detail-content.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-content.tsx)
- [focus-detail-actions.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-actions.tsx)

表达地图组件：

- [expression-map-sheet.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/expression-map-sheet.tsx)
- [expression-map-selectors.ts](/d:/WorkCode/AbandonClaw/src/features/chunks/components/expression-map-selectors.ts)

## 3. Focus Detail 的职责

focus detail 不是一个普通只读详情卡片，它承担了四层职责：

1. 展示当前表达主体信息
   - 正文、翻译、差异标签、TTS
2. 展示三类内容 tab
   - `info`
   - `similar`
   - `contrast`
3. 承接“更多操作”
   - 查找关系
   - 手动添加关联表达
   - 重新生成音频
   - 重试补全
   - 设为主表达 / 移入当前簇 / 脱离当前簇
   - 删除当前表达
4. 承担从 related rows 继续钻取详情的链路

## 4. Focus Detail 的状态来源

页面层在 [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/page.tsx) 维护真实状态：

- 当前 focus expression
- 当前 detail 是否打开
- 当前 detail tab
- 当前 detail trail
- 当前 confirm action
- loading / retrying / deleting / moving 等动作态

再通过这些派生层收口成稳定展示态：

- `buildFocusDetailSheetState`
- `buildChunksFocusDetailSheetPresentation`
- `buildFocusDetailViewModel`

维护约束：

- 不要把页面态和展示派生态重新分散回组件内部
- 组件层尽量只接“已经可渲染”的 props

## 5. Focus Detail 三个 tab 的含义

### 5.1 `info`

展示：

- semantic focus
- review stage hint
- common usage
- typical scenario
- source sentence / example cards

这些内容有一部分来自已保存表达，一部分来自 AI enrich 或 assist 结果。

### 5.2 `similar`

展示同类表达列表：

- 可直接打开已保存详情
- 未保存项可快速加入表达库

### 5.3 `contrast`

展示对照表达列表：

- 可打开已保存详情
- 未保存项也可直接加入
- 文案更强调差异而不是并入簇

## 6. “更多操作”菜单边界

[focus-detail-actions.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-actions.tsx) 只负责：

- 是否显示某个动作
- 当前动作 loading 文案
- 把点击透传给页面

真正业务动作仍在页面 / action hook：

- 查关系
- 打开手动添加
- 重新生成音频
- 重试 enrich
- cluster 结构调整
- 删除表达

维护约束：

- 不要把 service 调用直接塞进 `focus-detail-actions.tsx`
- 这个组件是菜单层，不是业务层

## 7. Expression Map 的职责

expression map 用来展示“当前表达所在语义簇的扩展视图”，不是简单的 related rows 展平。

当前 sheet 会负责：

- 展示当前 cluster anchor
- 展示 cluster meaning
- 展示 map 里返回的 related expressions
- 显示这些表达在当前用户表达库中的状态
- 允许直接把这一簇加入当前学习链路

## 8. Expression Map 的状态来源

页面层维护：

- `mapOpen`
- `mapLoading`
- `mapError`
- `mapData`
- `mapSourceExpression`
- `activeClusterId`
- `addingCluster`

再通过 `buildExpressionMapViewModel()` 派生：

- `activeCluster`
- `centerExpressionText`
- `displayedClusterExpressions`
- `expressionStatusByNormalized`

维护约束：

- 不要在 sheet 组件内部自行推断 active cluster
- map 的“哪些表达已存在”必须由页面层传入，不要在组件内重新扫全量 phrases

## 9. 把 map cluster 加入当前学习链路

页面动作 `handleAddClusterToReview()` 的职责是：

- 若当前主表达还没有 cluster，先补种子 cluster
- 再把 map cluster 里的其它表达按批量保存链路并入当前表达库 / cluster

这里本质上是“批量扩容当前 cluster”，不是简单打开 review。

维护约束：

- 这个动作会影响 phrase 保存、cluster 结构和后续 review 入口
- 所以改它时要同时看 [chunks-data-mapping.md](/d:/WorkCode/AbandonClaw/docs/chunks-data-mapping.md)

## 10. 和 Source Scene / TTS 的关系

focus detail 和 chunks list 里都可能带来源句 / 来源场景入口。

页面层会：

- 通过 `prefetchSceneDetail(slug)` 预热来源场景
- 用共享 TTS 播放控制器处理详情朗读

所以如果你改动：

- 来源场景打开方式
- 详情 TTS 行为
- source sentence 展示

就不要只改浮层组件，要连页面动作和预热一起看。

## 11. 建议回归

每次改这两条链路，至少检查：

- [focus-detail-sheet.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-sheet.interaction.test.tsx)
- [focus-detail-content.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-content.interaction.test.tsx)
- [focus-detail-actions.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-actions.interaction.test.tsx)
- [expression-map-sheet.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/expression-map-sheet.interaction.test.tsx)
- [chunks-page-logic.test.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-page-logic.test.ts)
- [page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/page.interaction.test.tsx)

重点关注：

- 详情页 tab 切换和 trail 回退仍稳定
- 更多操作菜单的禁用 / loading 不回退
- 删除表达后的详情回退仍消费后端返回
- map cluster 的 active cluster 与状态标签仍正确
- “加入这一簇”后列表、cluster 和 review 链路仍一致
