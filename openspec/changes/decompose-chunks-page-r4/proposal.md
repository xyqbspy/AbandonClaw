# chunks/page.tsx 第四轮拆分（抽 chunks-list-view 装配 wrapper section）

## Status
draft

## Why

`src/app/(app)/chunks/page.tsx` 经过 r2（2368 → 2125 = -243）和 r3（2125 → 2102 = -23）两轮拆分后仍然 2108 行（以 `wc -l` 为准，r3 收口报告中的 2102 与本数 6 行差异来自计行算法差异，下同），是仓库 LoC 最大的前端文件。

r3 收口（archive `2026-05-17-decompose-chunks-page-r3`）tasks.md §5.9 明确给出了 r4 策略指导：

> 抽 hook + section 时如果 "装配回调 / 解构 / props 透传" 占用的代码与 "抽走的 state 声明 / JSX" 相当，page.tsx 行数减幅有限。要让 page.tsx 真正瘦身，应采用以下策略：
> 1. 抽大块、高密度逻辑（例如：250+ 行的 useEffect orchestration 整体抽到 hook，page.tsx 只剩 hook 调用）
> 2. 抽高 props-cost 子树（例如：抽 `<ChunksListView>` wrapper，让 page.tsx 不再 hand-roll 100 行 props，wrapper 内自带常量化 labels / handler factory）
> 3. 不抽 state + 简单 handler 的组合（这种组合"装配开销"≈"抽走开销"，无法瘦身）

`page.tsx` 当前 return 体中调用 `<ChunksListView>` 的代码块（约 line 1843-1933）有 90 多行 props 透传，包含：

- 41 个 `labels` 字段闭包透传（zh.* messages 字典化）
- 一个 `reviewStatusLabel: Record<PhraseReviewStatus, string>`（4 字段）模块常量
- 一个 `extractExpressionsFromSentenceItem` helper（~17 行 pure 函数）
- `appleButtonClassName` / `appleSurfaceClassName` 两个常量
- 18 个 handler props 透传

同时 r3 收口同模式参考 archive `2026-05-16-decompose-scene-detail-page-r2`、`2026-05-16-decompose-chunks-page-r2` 已经验证了"抽高 props-cost 子树成 view section wrapper"是低风险、高收益的拆分方向。

不收口的话：

- chunks/page.tsx 继续维持 2100+ 行的反例地位，与已完成多轮拆分的 scene-detail（849 行）、today、review 形成更明显的健康差距
- ChunksListView 的装配代码（labels / handlers）紧贴 page.tsx 主体，任何 list view 视觉/字段调整都要在 2100+ 行文件里改
- `reviewStatusLabel`、`extractExpressionsFromSentenceItem` 这类与 list view 强耦合的常量/helper 留在 page.tsx 顶部，与页面级状态/路由编排混杂

参考：
- `openspec/specs/feature-component-decomposition/spec.md` Requirement "重入口第二轮拆分必须继续保留入口级交互回归" + r3 ADDED Scenario "chunks 三轮拆分的 LoC 实际结果与 r4 策略指导"
- `openspec/changes/archive/2026-05-17-decompose-chunks-page-r3/tasks.md` §5.9
- `openspec/changes/archive/2026-05-16-decompose-chunks-page-r2/proposal.md` §不收项 §1（明确把 chunks-list-view 留给后续）
- `docs/system-design/architecture-audit-2026-05-16.md` §2.3

## What Changes

### 1. 抽 chunks-page-list-section.tsx（ChunksListView 装配 wrapper）

- 新建 `src/app/(app)/chunks/chunks-page-list-section.tsx`
- 承载：
  - `<ChunksListView>` 的完整装配（41 个 labels + 18 个 handler + 5 个 status + 6 个 expansion + 2 个 audio + 6 个 presenter props）
  - 把 page.tsx 顶部的 `reviewStatusLabel: Record<PhraseReviewStatus, string>` 模块常量迁过来
  - 把 page.tsx 顶部的 `extractExpressionsFromSentenceItem` helper 迁过来（不动签名、不动行为）
  - 内部常量化 `LIST_SECTION_CLASSNAME = "space-y-4"` 与 `LIST_SURFACE_CLASSNAME = "rounded-[2rem] border border-slate-50 bg-white shadow-sm ring-0"`
- props 形态：6 个分组对象 props（data / expansion / status / audio / presenters / actions），用 `Pick<ChunksListViewProps, ...>` 自描述类型边界
  - `data`：`phrases` / `clusterMembersByClusterId`
  - `expansion`：6 个 expand/toggle props
  - `status`：6 个 saving/loading id 状态
  - `audio`：speakingText / loadingText / handlePronounceSentence
  - `presenters`：6 个渲染/计算函数引用
  - `actions`：9 个交互回调
- DOM 输出**字节级保持兼容**：相同的 `<section className="space-y-4">` 外层、ChunksListView 同样的 41 个 labels / appleSurfaceClassName / handler props

### 2. 配套调整 chunks-list-view.tsx（export type）

- 把 `ChunksListViewLabels` 和 `ChunksListViewProps` 两个本地 type 改为 `export type`，让 `chunks-page-list-section.tsx` 能用 `Pick<ChunksListViewProps, ...>` 自描述 props 边界
- 不动 ChunksListView 组件本身的实现

### 3. 配套整理 chunks-page-focus-mode-section.tsx（消除重复 type）

- 把内联的 `FocusPreviewItem` / `SavedRelationRowsBySourceId` type 删掉，改成从 `@/features/chunks/components/types` import
- 原内联 type 实际上已经和 `ClusterFocusList` 期望的 props 形状不一致（孤儿定义），这次顺手收口
- 不动组件行为

### 4. 配套小幅 lint cleanup（use-sentence-expression-save.test.tsx）

- 把 `let resolveSave: (() => void) | null = null` 改成 `let resolveSave: () => void = () => {}`，消除 `resolveSave?.()` 的可选链
- 测试断言完全不动

### 5. 不动的部分

- `chunks-list-view.tsx` 内部组件实现（868 行）— ChunksListView 自身 sub-component 拆分留给后续 r5
- `chunks-page-sheets.tsx` (449 行) — 留给后续 r5
- 现有 14 个 hook 的 props 签名（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data` / `use-builtin-phrases-actions` / `use-quick-add-related` / `use-detail-audio-actions` / `use-expression-map` / `use-sentence-expression-save` / `use-focus-relation-tab`）
- r2 抽出的 `chunks-page-styles.ts` / `chunks-page-hero.tsx` / `chunks-page-focus-mode-section.tsx`
- r3 抽出的 3 个 hook + `chunks-page-focus-mode-section.tsx`
- 现有 `chunks-page-logic.ts` / `chunks-page-load-logic.ts` / `chunks-page-notify.ts` / `chunks-page-messages.ts` / `chunks-focus-detail-*` 全部
- spec `chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition` 三份 Requirement 文字
- 任何业务语义、路由、缓存、cookie、API、表单提交、复习入口、表达保存逻辑

## Capabilities

### Modified Capabilities

- `feature-component-decomposition`：不修改既有 Requirement 文字。本 change 是其 Requirement "重入口第二轮拆分必须继续保留入口级交互回归" 的第四轮迭代落地，在 specs/ 子目录补一份 ADDED Requirement，声明本轮按 r3 给出的 r4 策略指导（高 props-cost 子树优先）执行，并量化结果。

## Impact

**Affected specs**：
- `feature-component-decomposition` — 仅补 ADDED Requirement「chunks/page.tsx 第四轮拆分必须按 1 view wrapper section 边界执行」，不动既有 Requirement 文字

**Affected code**：

新建：
- `src/app/(app)/chunks/chunks-page-list-section.tsx`（176 行）

修改：
- `src/app/(app)/chunks/page.tsx`：移走 ChunksListView 装配代码 + reviewStatusLabel + extractExpressionsFromSentenceItem helper + chunksButtonClassName 直接 import，替换为 `<ChunksPageListSection ... />`
- `src/app/(app)/chunks/chunks-list-view.tsx`：把 `ChunksListViewLabels` 和 `ChunksListViewProps` 改为 `export type`
- `src/app/(app)/chunks/chunks-page-focus-mode-section.tsx`：删内联 `FocusPreviewItem` / `SavedRelationRowsBySourceId` type，改用 `@/features/chunks/components/types` 的统一定义
- `src/app/(app)/chunks/use-sentence-expression-save.test.tsx`：小幅 lint cleanup

**不修改**：上面 "What Changes §5" 全部 + 任何 backend / API / DB / cache 层。

## 预期收益

- chunks/page.tsx 从 2108 行降到 2041 行（**-67 行，-3.2%**），比 r3 (-23, -1.1%) 有明显改善，符合 r3 §5.9 给出的"高 props-cost 子树"策略预测
- 新 `chunks-page-list-section.tsx` 176 行，对外稳定 6 个分组 props
- ChunksListView 的 41 字段 labels 闭包 + 18 handler props 透传从 page.tsx 主体物理隔离
- 与 list view 强耦合的 `reviewStatusLabel` / `extractExpressionsFromSentenceItem` 也一并迁到同文件，page.tsx 顶部进一步干净
- page.interaction.test.tsx + chunks-page-sheets.interaction.test.tsx + 17 个 hook 单测全部继续通过，无需重写

## Stability Closure

### 本轮收口项

- chunks/page.tsx 主入口由 r3 留下的 2108 行降到 2041 行
- ChunksListView 装配代码（41 labels + 18 handler + 多组 props）从 page.tsx 主体物理隔离
- `reviewStatusLabel` / `extractExpressionsFromSentenceItem` 这类与 list view 强耦合的常量/helper 收口到同文件

### 明确不收项

- **不拆 chunks-list-view.tsx 内部组件**（868 行）：留给后续 r5。理由：本轮只抽"装配 wrapper"，list view 自身 sub-component 拆分（card / sentence card / similar list 等）是更大动作，需要独立评估
- **不拆 chunks-page-sheets.tsx**（449 行）：留给后续 r5。理由：与 useManualExpressionComposer / useManualSentenceComposer 强耦合，需要更长准备时间
- **不重写任何 handler 业务语义**：所有 handler 行为保持 100% 兼容，包括 toast、cache 失效、复习入口、loadPhrases 调用、setState 顺序
- **不引入新公共组件**：本轮只在 chunks 内部拆，不抽 shared、不抽 `src/components/*`
- **不动 chunks-page-styles.ts**：r2 已建好，本轮不补新常量（新 section 内部的两个 className 常量与 styles 共享文件无关，作用域限本 section）
- **不动既有 17 个 hook 的 props 签名**：避免拆分波及现有测试
- **不动 ChunksListView 组件本身**：只把它的 type export 出来给 section 用，组件实现不动
- **不动 spec `feature-component-decomposition` Requirement 文字**：本 change 是 r3 已埋下的 r4 策略的落地，只补一份 ADDED Requirement

### 延后原因与风险记录

- r5 拆 chunks-list-view 内部 sub-component：需先看本轮 wrapper 抽离后 ChunksListView 是否还需要更细粒度的内部拆分
- r5 拆 chunks-page-sheets：与 manual composer 系列 hook 耦合，需评估边界

## Validation

按 spec Requirement "重入口第二轮拆分必须继续保留入口级交互回归"：

完成抽离后，跑入口级交互测试：

```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx"
```

chunks 全套 interaction + hook 测试：

```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx" "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/app/(app)/chunks/chunks-page-sheets.interaction.test.tsx" "src/app/(app)/chunks/chunks-quick-add-related-sheet.test.tsx" "src/app/(app)/chunks/use-chunks-list-data.test.tsx" "src/app/(app)/chunks/use-chunks-route-state.test.tsx" "src/app/(app)/chunks/use-expression-cluster-actions.test.tsx" "src/app/(app)/chunks/use-focus-assist.test.tsx" "src/app/(app)/chunks/use-focus-detail-controller.test.tsx" "src/app/(app)/chunks/use-generated-similar-sheet.test.tsx" "src/app/(app)/chunks/use-manual-expression-composer.test.tsx" "src/app/(app)/chunks/use-manual-sentence-composer.test.tsx" "src/app/(app)/chunks/use-saved-relations.test.tsx" "src/app/(app)/chunks/use-builtin-phrases-actions.test.tsx" "src/app/(app)/chunks/use-detail-audio-actions.test.tsx" "src/app/(app)/chunks/use-quick-add-related.test.tsx" "src/app/(app)/chunks/use-expression-map.test.tsx" "src/app/(app)/chunks/use-sentence-expression-save.test.tsx" "src/app/(app)/chunks/use-focus-relation-tab.test.tsx"
```

chunks 全套 pure logic 测试：

```
node --import tsx --test "src/app/(app)/chunks/chunks-page-load-logic.test.ts" "src/app/(app)/chunks/chunks-page-logic.test.ts" "src/app/(app)/chunks/chunks-page-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-logic.test.ts" "src/app/(app)/chunks/chunks-focus-detail-messages.test.ts" "src/app/(app)/chunks/chunks-focus-detail-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-presenters.test.ts" "src/app/(app)/chunks/chunks-save-contract.test.ts" "src/app/(app)/chunks/chunks-page-focus-detail-sync.test.ts"
```

本 change 不新增独立测试文件（新 section 是纯装配组件，无业务逻辑，行为由 ChunksListView 已有测试与 page.interaction.test.tsx 共同覆盖）。

最后：
- `pnpm run lint`：无新增 warning
- `npx tsc --noEmit`：本轮触动文件无新增错误（pre-existing 错误不修）
- `pnpm run text:check-mojibake`：通过
- `pnpm exec openspec validate decompose-chunks-page-r4 --strict`：通过

## Risks

- **Risk 1**：抽 wrapper section 后 page.tsx 仍有 2041 行，主函数体积仍偏大。
  **缓解**：本轮按 r3 §5.9 策略只针对一个高 props-cost 子树推进，是渐进式策略的一环。r5 / r6 可继续。
- **Risk 2**：新 section 的 6 个分组 props 形态（data / expansion / status / audio / presenters / actions）和原 hand-roll 透传不一致，page.interaction.test.tsx 可能因 React render diff 触发异常。
  **缓解**：section 内部把 6 个分组 props 用 `{...data} {...expansion} ...` 散开传给 ChunksListView，最终透传给 ChunksListView 的 props 与原来 hand-roll 完全一致；DOM 输出层面保持字节级兼容（同样的 `<section className="space-y-4">` 外层）。
- **Risk 3**：把 `ChunksListViewLabels` / `ChunksListViewProps` 改成 `export type` 后，理论上下游可能直接 import 这两个类型，造成边界扩散。
  **缓解**：本轮只新增一个 consumer（chunks-page-list-section）。如果未来出现更多 consumer 想拿这两个 type，应考虑是否要把 ChunksListView 的 props 边界从 chunks 私有迁到更稳定的层。
- **Risk 4**：chunks-page-focus-mode-section.tsx 改用统一 `@/features/chunks/components/types` 后，类型形状从 `Map<string, Array<{relationId, text, differenceLabel}>>` 变成 `Record<string, UserPhraseRelationItemResponse[]>`。
  **缓解**：原内联 type 实际上已经和 `ClusterFocusList` 期望的 props 形状不一致（孤儿定义），section 实际运行时拿的就是 page.tsx 提供的 `Record<string, UserPhraseRelationItemResponse[]>` 形状。修正后类型与实际数据一致，是 bug fix 而非 breaking change。

## Out of Scope

- chunks-list-view.tsx 内部 sub-component 拆分（留给后续 r5）
- chunks-page-sheets.tsx 拆分（留给后续 r5）
- backend service 层（admin / learning / phrases / tts-api）拆分
- review 页族二轮拆分
- 任何 spec 规则修改
- 公共组件抽离 / shared/ 扩展
