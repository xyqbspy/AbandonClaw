# chunks/page.tsx 第二轮拆分（建私有 styles + 抽 hook + 抽 hero section）

## Why

`src/app/(app)/chunks/page.tsx` 当前 **2368 行**，是仓库 LoC 最大文件，`openspec/specs/feature-component-decomposition/spec.md` 已经明确点名它需要"第二轮拆分"。

第一轮已经做过非常细致的拆分（11 个 hook + 4 个 view + 6 个 logic 文件），但主 `ChunksPage` 函数仍然：

- 行 339-1843 = **1505 行的 hooks + handlers + memos + useEffects + useCallbacks**（含 30+ useState、6 个核心 handler、30+ useMemo/useCallback）
- 行 1844-2368 = **524 行的 JSX 装配**
- 行 170-172 直接在文件顶层定义了 3 个 `appleButtonClassName` 常量，没收到 styles 入口
- chunks 是仓库**唯一**没有对应 `*-page-styles.ts` 的页族（today / scene / review 都有）

不收口的话：

- 任何 chunks 主链路改动都要在 2368 行文件里读上下文，AI 协作和人维护成本明显高于其它页族
- 重复 class 字符串散落在 page.tsx + chunks-list-view.tsx + chunks-page-sheets.tsx 三处
- 第三轮拆分（chunks-list-view.tsx 868 行 / chunks-page-sheets.tsx 449 行）会因为 page.tsx 这层没收口而难以推进

参考 `docs/system-design/architecture-audit-2026-05-16.md` §2.3、§2.11。

## What Changes

按依赖序：

### 1. 前置：建 chunks-page-styles.ts

- 新建 `src/app/(app)/chunks/chunks-page-styles.ts`
- 抽 page.tsx 行 170-172 的 `appleButtonClassName` / `appleButtonStrongClassName` / `chunksButtonClassName` 三个常量
- 抽 hero / search / library tab / cluster filter / saved tabs 等 sticky header 区的重复 className
- 抽 review status 标签的 className 常量
- 命名遵循其它页族约定（`CHUNKS_HERO_*` / `CHUNKS_LIBRARY_TAB_*` / `CHUNKS_SEARCH_INPUT_*` 等 SCREAMING_SNAKE_CASE）

### 2. 抽 3 个独立动作 hook

每个 hook 只承载单一职责，对外暴露稳定 props：

- `use-quick-add-related.ts`：当前 page.tsx 散落 5 个 state（`quickAddRelatedOpen` / `quickAddRelatedText` / `quickAddRelatedType` / `savingQuickAddRelated` / `quickAddRelatedInputRef`）+ 2 个 handler（`handleSaveQuickAddRelated` / `handleCopyQuickAddTarget`）。集中到一个 hook 后 page.tsx 只调用 `const quickAddRelated = useQuickAddRelated({...})`。
- `use-builtin-phrases-actions.ts`：`handleSaveBuiltinPhrase` + `savingBuiltinPhraseId` state + `setBuiltinPhrases` 副作用回写。与现有 `use-builtin-phrases-data.ts` 并存（数据 vs 动作分离）。
- `use-detail-audio-actions.ts`：`handleRegenerateCurrentDetailAudio` + `regeneratingDetailAudio` state，承载详情音频重生成动作。

### 3. 抽 1 个视图 section

- `chunks-page-hero.tsx`：sticky top header（hero title + search input + library tab switch + summary 副标题）。这块当前在 JSX return 的最前 ~120 行，独立性最强、出现在 builtin / mine 两种 tab 之上。

### 4. 不动的部分

- `chunks-list-view.tsx` (868 行) — 第三轮再拆，本轮不动
- `chunks-page-sheets.tsx` (449 行) — 已是独立组件，本轮不动
- focus detail 已有的 hook / logic / presenter / notify 全部不动
- 现有 11 个 hook（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data`）签名和行为全部不动
- `chunks-page-logic.ts` / `chunks-page-load-logic.ts` / `chunks-page-notify.ts` / `chunks-page-messages.ts` / `chunks-focus-detail-*` 全不动
- spec 层（`chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition`）全不动
- 任何业务语义、路由、缓存、cookie、API、表单提交、复习入口、表达保存逻辑

## Impact

**Affected specs**:
- `feature-component-decomposition` — 本 change 是其 Requirement "重入口第二轮拆分必须继续保持页面级动作与分支语义稳定" 的具体落地，**不修改 spec 规则**。在 specs/ 子目录补一份 delta 仅声明本轮已落地 chunks/page.tsx 二轮拆分对应 Scenario。

**Affected code**:

新建：
- `src/app/(app)/chunks/chunks-page-styles.ts`
- `src/app/(app)/chunks/use-quick-add-related.ts`
- `src/app/(app)/chunks/use-builtin-phrases-actions.ts`
- `src/app/(app)/chunks/use-detail-audio-actions.ts`
- `src/app/(app)/chunks/chunks-page-hero.tsx`

新建测试：
- `src/app/(app)/chunks/use-quick-add-related.test.tsx`
- `src/app/(app)/chunks/use-builtin-phrases-actions.test.tsx`
- `src/app/(app)/chunks/use-detail-audio-actions.test.tsx`

修改：
- `src/app/(app)/chunks/page.tsx`：移走对应 const/state/handler/JSX 段，按 hook + section 装配

**不修改**：上面 "What Changes §4 不动的部分" 全部。

## 预期收益

- chunks/page.tsx 从 2368 行降到 ~1700-1800 行（减 25-30%）
- 3 个动作 hook 各 60-120 行，对外稳定 props
- chunks-page-styles.ts 收口 12-18 个常量
- chunks-page-hero.tsx ~100 行，独立单测
- page.interaction.test.tsx + chunks-page-sheets.interaction.test.tsx + 现有 9 个 hook 单测全部继续通过，不需要重写
- 为第三轮（chunks-list-view.tsx 868 行 + chunks-page-sheets.tsx 449 行）打下样式入口和拆分模式基础

## 不收项与原因

明确**本轮不做**的事，避免范围蔓延：

1. **不拆 chunks-list-view.tsx**（868 行）：本身是已抽出的 view 组件，第三轮再处理；本轮专注 page.tsx 主入口。
2. **不拆 chunks-page-sheets.tsx**（449 行）：本身是 sheet 装配，已抽出独立文件。
3. **不重写任何 handler 业务语义**：所有 handler 行为保持 100% 兼容，包括 toast、cache 失效、复习入口、loadPhrases 调用、setState 顺序。
4. **不引入新公共组件**：本轮只在 chunks 内部拆，不抽 shared、不抽 `src/components/*`。
5. **不动 chunks-page-styles.ts 中已有 class 之外的 class**：本轮只收 page.tsx 顶层 3 个常量 + hero 区重复 class，不扫整个 chunks 目录。
6. **不补 chunks 的 feature-private styles 入口到 features/chunks/**：page-styles 留在 `app/(app)/chunks/`，对齐 review 的做法（`app/(app)/review/review-page-styles.ts`），不强行迁到 `features/chunks/`。
7. **不动既有 11 个 hook 的 props 签名**：避免拆分波及现有测试。
8. **不动 spec 文件 `feature-component-decomposition.md`**：本 change 是 spec 已规划行为的落地，只补一份"已落地"的 delta scenario，不改 Requirement。

## Risks

- **Risk 1**：3 个 hook 抽出后，page.tsx 还有 ~1700 行，主 function 体积仍大。
  **缓解**：本轮目标是验证拆分模式 + 给第三轮铺路，不是一次降到 800 行。spec 也允许多轮迭代。
- **Risk 2**：useEffect / useMemo 之间的依赖关系复杂，抽到 hook 后可能漏传依赖。
  **缓解**：所有抽出的 handler 在 hook 内部仍走 useCallback，依赖项与原 page.tsx 完全一致；hook 暴露给 page.tsx 的就是稳定函数引用。每个 hook 必带单测。
- **Risk 3**：chunks-page-hero.tsx 抽出后，与 page.tsx 之间有大量 props（query / setQuery / libraryTab / setLibraryTab / summary / heroTitle / heroSubtitle / 等 10+ 个）。
  **缓解**：本轮可接受 "粗 props"，目标是物理隔离 JSX；如果未来 hero props 数量继续涨，再考虑用 context 收口。
- **Risk 4**：page.interaction.test.tsx 466 行依赖完整页面 DOM 结构，hero 抽出后 selector 可能漂移。
  **缓解**：抽 hero 时保持 DOM 输出**字节级兼容**（同样的 `<header>`、`<div>`、`className`），不改 aria-label，不改 text。

## Test Plan

按 spec Requirement "重入口第二轮拆分必须继续保留入口级交互回归"：

每次拆完单个 hook / section，立即跑：

```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx"
```

全部完成后跑 chunks 全套：

```
node --import tsx --test "src/app/(app)/chunks/chunks-page-load-logic.test.ts" "src/app/(app)/chunks/chunks-page-logic.test.ts" "src/app/(app)/chunks/chunks-page-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-logic.test.ts" "src/app/(app)/chunks/chunks-focus-detail-messages.test.ts" "src/app/(app)/chunks/chunks-focus-detail-notify.test.ts" "src/app/(app)/chunks/chunks-focus-detail-presenters.test.ts" "src/app/(app)/chunks/chunks-save-contract.test.ts" "src/app/(app)/chunks/chunks-page-focus-detail-sync.test.ts"
```

interaction 测试：

```
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx" "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/app/(app)/chunks/chunks-page-sheets.interaction.test.tsx" "src/app/(app)/chunks/chunks-quick-add-related-sheet.test.tsx" "src/app/(app)/chunks/use-chunks-list-data.test.tsx" "src/app/(app)/chunks/use-chunks-route-state.test.tsx" "src/app/(app)/chunks/use-expression-cluster-actions.test.tsx" "src/app/(app)/chunks/use-focus-assist.test.tsx" "src/app/(app)/chunks/use-focus-detail-controller.test.tsx" "src/app/(app)/chunks/use-generated-similar-sheet.test.tsx" "src/app/(app)/chunks/use-manual-expression-composer.test.tsx" "src/app/(app)/chunks/use-manual-sentence-composer.test.tsx" "src/app/(app)/chunks/use-saved-relations.test.tsx"
```

新增 3 个 hook 各带专属单测，使用 mock 模拟 phrasesApi / notify / loadPhrases，验证：
- 成功路径触发对应回调
- 失败路径触发对应 toast
- loading state 正确进出
- 关键 handler 在 dependency 变化时保持稳定引用

最后：
- `pnpm run lint`：无新增 warning
- `npx tsc --noEmit`：本次触动文件无新增错误
- `pnpm run text:check-mojibake`：通过
- `pnpm run spec:validate --strict`：通过
