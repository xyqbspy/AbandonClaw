# Tasks

按依赖序执行；每完成一项立即跑 page.interaction.test.tsx 验证。

## Status
done

## 1. 抽 use-expression-map.ts

- [x] 1.1 新建 `src/app/(app)/chunks/use-expression-map.ts`，承载 map 浮层 6 state（`mapOpen` / `mapLoading` / `mapError` / `mapData` / `mapSourceExpression` / `mapOpeningForId`）+ close / resetError helpers
- [x] 1.2 hook 出参：`{ state: { open, loading, error, data, sourceExpression, openingForId }, setters: { setOpen, setLoading, setError, setData, setSourceExpression, setOpeningForId }, resetError, close }`（采用 state + setters 模型保持与既有 useChunksPageActions 的 6 个 setter props 兼容）
- [x] 1.3 page.tsx 解构 hook 返回的 state + setters，删除原 6 useState 与 ExpressionMapResponse import
- [x] 1.4 新建 `use-expression-map.test.tsx`：验证初始状态、setters 更新、close、resetError
- [x] 1.5 跑 page.interaction.test.tsx 确认 DOM 一致

## 2. 抽 use-sentence-expression-save.ts

- [x] 2.1 新建 `src/app/(app)/chunks/use-sentence-expression-save.ts`，承载：
  - state: `savingSentenceExpressionKey` / `savedSentenceExpressionKeys`
  - handler: `saveExpressionFromSentence`
- [x] 2.2 hook 入参：`{ savePhrase?, notifySaved, notifyFailed }`（savePhrase 默认为 savePhraseFromApi，DI 友好）
- [x] 2.3 hook 出参：`{ savingSentenceExpressionKey, savedSentenceExpressionKeys, saveExpressionFromSentence }`
- [x] 2.4 page.tsx 删除原 2 state 与 24 行 handler，删除 savePhraseFromApi import；替换为 hook 解构
- [x] 2.5 新建 `use-sentence-expression-save.test.tsx`：5 个用例（初始状态、成功、失败、同 key 进行中 noop、空表达跳过）
- [x] 2.6 跑 page.interaction.test.tsx

## 3. 抽 use-focus-relation-tab.ts

- [x] 3.1 新建 `src/app/(app)/chunks/use-focus-relation-tab.ts`，承载：
  - state: `focusRelationTab` / `expandedFocusMainId` / `focusRelationActiveText` / `detailConfirmAction` / `focusDetailActionsOpen`
- [x] 3.2 hook 出参：5 个 state + 5 个对应 setter（保留 useState dispatch 语义，page.tsx 既有 useEffect / useCallback / 子 hook 调用全部不动 props 签名）
- [x] 3.3 page.tsx 删除 5 useState、删除本地 `FocusDetailConfirmAction` 类型定义（迁到 hook export）；替换为 hook 解构
- [x] 3.4 新建 `use-focus-relation-tab.test.tsx`：6 个用例（初始状态、tab 切换、expandedFocusMainId 切换、focusRelationActiveText 更新、detailConfirmAction + actionsOpen、三种 confirm action）
- [x] 3.5 跑 page.interaction.test.tsx

## 4. 抽 chunks-page-focus-mode-section.tsx

- [x] 4.1 新建 `src/app/(app)/chunks/chunks-page-focus-mode-section.tsx`，承载 page.tsx return 体中 focus mode 视图装配（`<ClusterFocusList>` wrapper，含 labels 闭包 + appleSurfaceClassName 常量化）
- [x] 4.2 props 形态：12 个 props（ready / rows / currentFocusExpressionId / expandedFocusMainId / clusterMembersByClusterId / savedRelationRowsBySourceId / currentFocusSimilarItems + 5 个 handler 透传）
- [x] 4.3 DOM 输出**字节级保持兼容**：相同的 `<div className="space-y-4">` 嵌套、ClusterFocusList 同样的 labels / appleSurfaceClassName / onToggleMain / onToggleExpanded / onOpenMainDetail / onOpenMainSimilarTab / onOpenPreviewItem
- [x] 4.4 page.tsx 中替换为 `<ChunksPageFocusModeSection ... />`，删除 ClusterFocusList 直接 import
- [x] 4.5 page.interaction.test.tsx 必须全绿

### 4.6 调整说明（与 proposal §4 字面承诺的偏差）

proposal §4 原描述"focus detail 区 JSX 装配（焦点 expression header + similar/contrast tab + relation 列表 + actions menu + confirm dialog）"。实际调研发现这些 UI 全部在 `chunks-page-sheets.tsx` 内通过 `FocusDetailSheet` 渲染，page.tsx 主体不直接渲染这套 detail UI。

为保持 r3 范围一致性 + 落实 spec delta "1 个 view section 抽离" 的承诺，本轮实际抽出的是 **focus mode 视图装配**（`<ClusterFocusList>` wrapper），覆盖 page.tsx return 体中 line ~1819-1873 的 55 行 JSX，文件名 `chunks-page-focus-mode-section.tsx`。组件作用相同（物理隔离 focus 模式相关 JSX 块），只是承载对象从"focus detail（sheet 内）"调整为"focus mode（page 主体）"。

详细见 dev-log [2026-05-17] entry。

## 5. 验证收尾

- [x] 5.1 跑 chunks 全套 unit test（见 proposal §Validation）：9 个 logic / messages / notify / presenters / save-contract / focus-detail-sync 测试全过
- [x] 5.2 跑 chunks 全套 interaction test：page + list-view + sheets + quick-add + 14 个 hook 单测 = 114/114 全过
- [x] 5.3 `pnpm run lint`：0 errors，2 pre-existing warnings（与本轮无关）
- [x] 5.4 `npx tsc --noEmit`：错误均为预先存在（`today-primary-recommendation.test.ts` / `service.user-phrase-flow.test.ts`），git stash 到 main 同样复现，与本轮无关
- [x] 5.5 `pnpm run text:check-mojibake`：通过
- [x] 5.6 `pnpm exec openspec validate decompose-chunks-page-r3 --strict`：通过
- [x] 5.7 量化 chunks/page.tsx LoC：**2125 → 2102（-23, -1.1%）**，**远低于 proposal §预期收益（1500-1600）的预测**
- [x] 5.8 检查本轮未收口项已记录原因与风险（见 proposal §Stability Closure §不收项）

### 5.9 LoC 远低于预期的原因分析（重要发现，影响 r4 策略）

| 抽离对象 | 移走代码量 | page.tsx 新增装配代码 | 净减 |
| --- | --- | --- | --- |
| use-expression-map | 6 useState (~10 行) | 1 hook 调用 + 2 个解构 block (~20 行) | **+10** |
| use-sentence-expression-save | 2 useState + 24 行 handler (~26 行) | 1 hook 调用 + 1 解构 block (~8 行) | -18 |
| use-focus-relation-tab | 5 useState + 5 行 type def (~10 行) | 1 hook 调用 + 1 解构 block (~13 行) | +3 |
| chunks-page-focus-mode-section | 55 行 JSX | 1 个组件调用 + 11 个 props (~42 行) | -13 |
| 1 行 ExpressionMapResponse import + 1 行 savePhraseFromApi import | -2 | - | -2 |
| 同步加 6 行 hook import | - | +6 | +6 |
| 修 4 个 react-hooks/exhaustive-deps warning | - | +4 | +4 |

**总计净减 -10 行**（实际 -23，差异由其它细微调整造成）。

**关键发现**：抽 hook + section 时如果"装配回调 / 解构 / props 透传"占用的代码与"抽走的 state 声明 / JSX"相当，page.tsx 行数减幅有限。要让 page.tsx 真正瘦身，应采用以下策略：
1. **抽大块、高密度逻辑**（例如：250+ 行的 useEffect orchestration 整体抽到 hook，page.tsx 只剩 hook 调用）
2. **抽高 props-cost 子树**（例如：抽 `<ChunksListView>` wrapper，让 page.tsx 不再 hand-roll 100 行 props，wrapper 内自带常量化 labels / handler factory）
3. **不抽 state + 简单 handler 的组合**（这种组合"装配开销"≈"抽走开销"，无法瘦身）

此发现对 r4 策略至关重要：r4 应该优先抽 chunks-list-view 装配 wrapper（line 1876-1961 的 ~87 行 props 列表），而不是继续抽小 hook。

## 6. 完成态收尾（用户审核通过后）

- [x] 6.1 commit 实施改动（commit `f8e1d4c`, feat: prefix）
- [x] 6.2 更新 `docs/dev/dev-log.md` 追加 entry：背景 / 协作说明 / 落地 / 验证 / 量化 / LoC 实际结果 + 偏差原因分析
- [x] 6.3 更新 `docs/system-design/architecture-audit-2026-05-16.md` §2.3 追加 r3 状态行（LoC 量化数据）
- [x] 6.4 `openspec archive decompose-chunks-page-r3` 完成归档
- [x] 6.5 spec sync：把 r3 delta 合并到 `openspec/specs/feature-component-decomposition/spec.md`（与 r2 同模式）
- [x] 6.6 `pnpm run maintenance:check`：通过

### 6.7（2026-05-20 后补 patch）meta 三件套检查项

本节是 r4 收尾期间识别 r3 隐性漏洞后的追加补丁，目的是把"漏掉 meta 三件套检查"这件事在 r3 archive 留痕，避免 r5 / r6 继续抄 r3 旧模板（§6.1–§6.6）继承漏洞。**archive 不修内容**是 OpenSpec workflow 原则，但本补丁只追加 §6.7 不修改既有 §6.1–§6.6，且属于流程修复留痕性质，不改变 r3 实际拆分结果。

- 漏掉的检查项：`docs/meta/product-overview.md` / `docs/meta/technical-overview.md` / `docs/meta/interview-project-deep-dive.md` 三件套是否需要按 `openspec/specs/project-maintenance/spec.md` line 117 "较大改动必须同步产品与技术总览" 同轮更新
- r3 当时的应做但未做：r3 是"架构能力"变化（feature-component-decomposition spec 新增 1 个 Requirement + 3 个 scenario），应当同轮检查 meta 三件套，但 §6 收尾清单未列此项
- r3 期间的实际状态：commit `a146d12`（2026-05-19, 在 r3 commit `f8e1d4c`/`4278e23` 之后）已经把 meta 三件套补到 P0-P2 治理 + 北极星量化的状态，但**未覆盖 r3 + r4 的多轮拆分案例**
- 本漏洞造成的实际后果：r4 收尾时继续照抄 r3 §6 模板，再次漏检 meta 三件套，导致 r4 commit `43db0cd` 违反 spec line 135（先提交实现代码再补文档）。详见 r4 archive tasks.md §5.7 流程修复段
- 后续防复发：r4 archive tasks.md §5（含 §5.4 meta 三件套检查 + §5.7 流程修复）替代 r3 §6 作为下一轮拆分（r5 / r6）的收尾模板

如果 r5 / r6 维护者读到这里：**请参考 `openspec/changes/archive/2026-05-20-decompose-chunks-page-r4/tasks.md` §5 而非 r3 的 §6 作为收尾模板**。
