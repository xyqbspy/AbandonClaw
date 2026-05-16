# chunks/page.tsx 第三轮拆分（抽 3 hook + 1 view section）

## Status
draft

## Why

`src/app/(app)/chunks/page.tsx` 经过第二轮拆分（archive `2026-05-16-decompose-chunks-page-r2`）从 2368 → 2125 行（-243，-10.3%），但仍是仓库 LoC 最大的前端文件，远超第二大 `chunks-list-view.tsx`（868 行）。

主 `ChunksPage` 函数体（行 330–1658 ≈ 1328 行）当前仍然集中承担：

- **30+ useState** + **70+ hook calls**
- map 浮层完整生命周期：`mapOpen` / `mapLoading` / `mapError` / `mapData` / `mapSourceExpression` / `mapOpeningForId` 6 个 state + `handleOpenExpressionMap` + load 副作用（line 354–363、~120 行散落使用）
- sentence-level expression 保存：`savingSentenceExpressionKey` / `savedSentenceExpressionKeys` + `handleSaveSentenceExpression`（line 375–378、~80 行）
- focus relation tab 控制：`focusRelationTab` / `expandedFocusMainId` / `focusRelationActiveText` / `detailConfirmAction` / `focusDetailActionsOpen` 5 个 state + 数个 toggle handler（line 384–390、~150 行散落使用）
- focus detail 区 JSX 装配在 return 体中 ~250 行

第二轮 proposal §不收项 §1-2 明确把 chunks-list-view.tsx / chunks-page-sheets.tsx 留给"第三轮"，但首要任务是先把 page.tsx 自身降到接近 800-行水位的健康范围，再考虑下游 view 拆分。`architecture-audit-2026-05-16.md` §2.3 也指明 chunks 拆分需"按 spec 要求多轮迭代"，本轮承接 r2 模式继续推进。

不收口的话：

- 任何 chunks map 浮层或 focus relation 改动仍要在 2000+ 行文件里读上下文，AI 协作和人维护成本明显高于其它已二轮拆分完成的页族（scene-detail 849 / today / review）
- focus detail JSX 装配紧贴 return 体，未来视觉调整时 selector 与 className 重复修改面大
- map / sentence save / focus relation 三块没有独立单测，只能通过 page.interaction.test 间接覆盖

参考：
- `openspec/specs/feature-component-decomposition/spec.md` Requirement "超重页面与 feature 容器必须优先做内部职责拆分" + Requirement "重入口第二轮拆分必须继续保留入口级交互回归"
- `openspec/changes/archive/2026-05-16-decompose-chunks-page-r2/proposal.md` §What Changes §不收项
- `docs/system-design/architecture-audit-2026-05-16.md` §2.3
- `docs/dev/api-error-response-audit-2026-05-16.md` §相关
- `openspec/changes/archive/2026-05-16-decompose-scene-detail-page-r2/proposal.md` 同模式参考

## What Changes

按依赖序：

### 1. 抽 use-expression-map.ts（map 浮层完整生命周期）

- 新建 `src/app/(app)/chunks/use-expression-map.ts`
- 承载：
  - state: `mapOpen` / `mapLoading` / `mapError` / `mapData` / `mapSourceExpression` / `mapOpeningForId`
  - handler: `handleOpenExpressionMap`、关闭 / 重置 / 清空 error 等小动作
  - 副作用：load expression map 的 fetch / abort
- hook 入参：`{ notify*, expressionClusterFilterId, phrases, activeClusterId }` 等当前 useCallback 依赖项原样透传
- hook 出参：`{ mapState: { open, loading, error, data, sourceExpression, openingForId }, openMap, closeMap, resetError, setData }`
- page.tsx 替换为 `const expressionMap = useExpressionMap({...})`

### 2. 抽 use-sentence-expression-save.ts（句子维度表达保存）

- 新建 `src/app/(app)/chunks/use-sentence-expression-save.ts`
- 承载：
  - state: `savingSentenceExpressionKey` / `savedSentenceExpressionKeys`
  - handler: `handleSaveSentenceExpression`
- hook 入参：`{ loadPhrases, notify* }`
- hook 出参：`{ savingSentenceExpressionKey, savedSentenceExpressionKeys, saveSentenceExpression }`

### 3. 抽 use-focus-relation-tab.ts（focus detail 关系 tab 控制）

- 新建 `src/app/(app)/chunks/use-focus-relation-tab.ts`
- 承载：
  - state: `focusRelationTab` / `expandedFocusMainId` / `focusRelationActiveText` / `detailConfirmAction` / `focusDetailActionsOpen`
  - 相关 toggle handler（setTab / setActiveText / openActions / requestConfirm / clearConfirm 等）
- hook 入参：`{ focusContrastItems, focusSimilarItems }`（focus detail 数据由现有 `useFocusDetailController` 提供，本 hook 只控制 tab/UI 状态，不动 controller 边界）
- hook 出参：稳定函数引用 + state 对象，**不与 useFocusDetailController 冲突**

### 4. 抽 chunks-page-focus-detail-section.tsx（focus detail 区 JSX）

- 新建 `src/app/(app)/chunks/chunks-page-focus-detail-section.tsx`
- 承载 page.tsx return 体中 focus detail 区（焦点 expression header + similar/contrast tab + relation 列表 + actions menu + confirm dialog）的 JSX 装配
- props 形态：粗 props（focusViewModel / relationTabState / detailActions / onXxx 系列回调），允许 10-15 个 props
- DOM 输出**字节级保持兼容**：相同的 `<section>` / `<div>` / `className` / `aria-label`，确保 `page.interaction.test.tsx` selector 不漂移

### 5. 不动的部分

- `chunks-list-view.tsx` (868 行) — 留给后续 r4
- `chunks-page-sheets.tsx` (449 行) — 留给后续 r4
- 现有 13 个 hook（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data` / `use-builtin-phrases-actions` / `use-quick-add-related` / `use-detail-audio-actions`）签名和行为全部不动
- `chunks-page-styles.ts` 不动（按 r2 已建好）
- `chunks-page-hero.tsx` 不动
- 现有 `chunks-page-logic.ts` / `chunks-page-load-logic.ts` / `chunks-page-notify.ts` / `chunks-page-messages.ts` / `chunks-focus-detail-*` 全部不动
- spec `chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition` 规则全不动
- 任何业务语义、路由、缓存、cookie、API、表单提交、复习入口、表达保存逻辑

## Capabilities

### Modified Capabilities

- `feature-component-decomposition`: 不修改 Requirement 文字。本 change 是其 Requirement "重入口第二轮拆分必须继续保留入口级交互回归" 的第三轮迭代落地，在 specs/ 子目录补一份 delta 声明本轮已落地 chunks/page.tsx r3 对应 Scenario。

## Impact

**Affected specs**:
- `feature-component-decomposition` — 仅补"已落地"Scenario，不动 Requirement 规则

**Affected code**:

新建：
- `src/app/(app)/chunks/use-expression-map.ts`
- `src/app/(app)/chunks/use-sentence-expression-save.ts`
- `src/app/(app)/chunks/use-focus-relation-tab.ts`
- `src/app/(app)/chunks/chunks-page-focus-detail-section.tsx`

新建测试：
- `src/app/(app)/chunks/use-expression-map.test.tsx`
- `src/app/(app)/chunks/use-sentence-expression-save.test.tsx`
- `src/app/(app)/chunks/use-focus-relation-tab.test.tsx`

修改：
- `src/app/(app)/chunks/page.tsx`：移走对应 state / handler / JSX 段，按 hook + section 装配

**不修改**：上面 "What Changes §5" 全部 + 任何 backend / API / DB / cache 层。

## 预期收益

- chunks/page.tsx 从 2125 行降到 ~1500-1600 行（减 25-30%）
- 3 个新 hook 各 80-150 行，对外稳定 props 与 ref-equal 函数引用
- 1 个 view section ~200-250 行，独立组件
- page.interaction.test.tsx + chunks-page-sheets.interaction.test.tsx + 现有 13 个 hook 单测全部继续通过，无需重写
- focus detail 区从 JSX 装配中物理隔离，未来视觉调整面收窄到单个文件
- map / sentence save / focus relation 三块从 page 间接覆盖升级为独立单测可断言

## Stability Closure

### 本轮收口项

- chunks/page.tsx 主入口由 r2 留下的 2125 行进一步降到 ~1500-1600 行
- map / sentence save / focus relation 三个独立功能块从 page 主体抽离，便于后续单独迭代
- focus detail 区 JSX 物理隔离，为后续视觉调整 / 命名收口铺路

### 明确不收项

- **不拆 chunks-list-view.tsx**（868 行）：留给后续 r4。理由：本身是已抽出的 view 组件，与本轮抽离方向（page.tsx 内部 hook + section）不在同一层。
- **不拆 chunks-page-sheets.tsx**（449 行）：留给后续 r4。理由：本身已是独立组件，且与 useManualExpressionComposer / useManualSentenceComposer 强耦合，需要更长准备时间。
- **不重写任何 handler 业务语义**：所有 handler 行为保持 100% 兼容，包括 toast、cache 失效、复习入口、loadPhrases 调用、setState 顺序。
- **不引入新公共组件**：本轮只在 chunks 内部拆，不抽 shared、不抽 `src/components/*`。
- **不动 chunks-page-styles.ts**：r2 已建好，本轮不补新常量。
- **不动既有 13 个 hook 的 props 签名**：避免拆分波及现有测试。
- **不动 useFocusDetailController**：use-focus-relation-tab 只承载 UI 状态控制，focus detail 数据计算仍走 controller，避免双 hook 边界混乱。
- **不动 spec `feature-component-decomposition` Requirement 文字**：本 change 是 spec 已规划行为的落地，只补一份 delta scenario。

### 延后原因与风险记录

- r4 拆 chunks-list-view + chunks-page-sheets：需先把 page.tsx 降到健康水位（本轮目标），再评估 list-view 的 sub-component 拆分边界
- focus detail 区 JSX 拆出后 props 数量较多（10-15 个），如果未来再涨可能需要引入 context

## Validation

按 spec Requirement "重入口第二轮拆分必须继续保留入口级交互回归"：

每次抽完单个 hook / section，立即跑：
```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx"
```

全部完成后跑 chunks 全套：
```
node --import tsx --test "src/app/(app)/chunks/chunks-page-load-logic.test.ts" "src/app/(app)/chunks/chunks-page-logic.test.ts" "src/app/(app)/chunks/chunks-page-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-logic.test.ts" "src/app/(app)/chunks/chunks-focus-detail-messages.test.ts" "src/app/(app)/chunks/chunks-focus-detail-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-presenters.test.ts" "src/app/(app)/chunks/chunks-save-contract.test.ts" "src/app/(app)/chunks/chunks-page-focus-detail-sync.test.ts"
```

interaction 测试：
```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx" "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/app/(app)/chunks/chunks-page-sheets.interaction.test.tsx" "src/app/(app)/chunks/chunks-quick-add-related-sheet.test.tsx" "src/app/(app)/chunks/use-chunks-list-data.test.tsx" "src/app/(app)/chunks/use-chunks-route-state.test.tsx" "src/app/(app)/chunks/use-expression-cluster-actions.test.tsx" "src/app/(app)/chunks/use-focus-assist.test.tsx" "src/app/(app)/chunks/use-focus-detail-controller.test.tsx" "src/app/(app)/chunks/use-generated-similar-sheet.test.tsx" "src/app/(app)/chunks/use-manual-expression-composer.test.tsx" "src/app/(app)/chunks/use-manual-sentence-composer.test.tsx" "src/app/(app)/chunks/use-saved-relations.test.tsx" "src/app/(app)/chunks/use-builtin-phrases-actions.test.tsx" "src/app/(app)/chunks/use-detail-audio-actions.test.tsx" "src/app/(app)/chunks/use-quick-add-related.test.tsx"
```

新增 3 个 hook 各带专属单测，使用 mock 模拟 phrasesApi / notify / loadPhrases，验证：
- 成功路径触发对应回调
- 失败路径触发对应 toast
- loading state 正确进出
- 关键 handler 在 dependency 变化时保持稳定引用

最后：
- `pnpm run lint`：无新增 warning
- `npx tsc --noEmit`：本轮触动文件无新增错误（pre-existing 错误不修）
- `pnpm run text:check-mojibake`：通过
- `pnpm exec openspec validate decompose-chunks-page-r3 --strict`：通过

## Risks

- **Risk 1**：抽 3 hook + 1 section 后，page.tsx 仍有 ~1500-1600 行，主函数体积仍偏大。
  **缓解**：本轮目标是延续 r2 验证的拆分模式 + 进一步降水位，不是一次降到 800 行。spec 允许多轮迭代，r4 / r5 可继续。
- **Risk 2**：use-focus-relation-tab 与 useFocusDetailController 协作边界需小心，避免 state 重复 / 同步不一致。
  **缓解**：use-focus-relation-tab **只承载 UI 状态**（tab 切换、expand、confirm action 等），focus detail 数据计算（focusViewModel / 关系数据等）仍由 useFocusDetailController 提供。两者通过 page.tsx 装配协调。
- **Risk 3**：chunks-page-focus-detail-section.tsx props 数量较多（10-15 个），可能形成 prop drilling。
  **缓解**：本轮可接受"粗 props"，目标是物理隔离 JSX；如果未来再涨，可考虑用 context 收口。
- **Risk 4**：page.interaction.test.tsx 重度依赖 DOM 结构，section 抽出后 selector 可能漂移。
  **缓解**：抽 focus-detail-section 时保持 DOM 输出**字节级兼容**（同样的 `<section>` 嵌套、`className`、`aria-label`），不改 text，不改 data-testid。

## Out of Scope

- chunks-list-view.tsx / chunks-page-sheets.tsx 拆分（留给后续 r4）
- backend service 层（admin / learning / phrases / tts-api）拆分
- review 页族二轮拆分
- 任何 spec 规则修改
- 公共组件抽离 / shared/ 扩展
