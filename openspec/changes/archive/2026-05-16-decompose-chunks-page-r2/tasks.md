# Tasks

按依赖序执行；每完成一项立即跑 page.interaction.test.tsx 验证。

## 1. 前置：建 chunks-page-styles.ts

- [x] 1.1 新建 `src/app/(app)/chunks/chunks-page-styles.ts`，迁入 page.tsx 顶层 `appleButtonClassName` / `appleButtonStrongClassName` / `chunksButtonClassName` 三个常量（命名调整为 `CHUNKS_APPLE_BUTTON_CLASSNAME` / `CHUNKS_APPLE_BUTTON_STRONG_CLASSNAME` / `CHUNKS_PRIMARY_BUTTON_CLASSNAME`），删除 page.tsx 原定义
- [x] 1.2 扫描 page.tsx return 之后 JSX，识别在 hero / search / library tab / cluster filter / saved tabs 区域重复出现 ≥2 次的 className，抽到 styles 文件（命名 `CHUNKS_HERO_*` / `CHUNKS_SEARCH_INPUT_*` / `CHUNKS_LIBRARY_TAB_*` / `CHUNKS_CLUSTER_FILTER_*`），不扫 chunks-list-view 和 chunks-page-sheets 内部
- [x] 1.3 抽 review status 标签 className（`reviewStatusLabel` 已是 Record<PhraseReviewStatus, string>，本身不动；只抽其中重复使用的 pill class）
- [x] 1.4 跑 `page.interaction.test.tsx` 确认 DOM 一致

## 2. 抽 use-quick-add-related.ts

- [x] 2.1 新建 `src/app/(app)/chunks/use-quick-add-related.ts`，承载：
  - state: `quickAddRelatedOpen` / `quickAddRelatedText` / `quickAddRelatedType` / `savingQuickAddRelated`
  - ref: `quickAddRelatedInputRef`
  - handler: `handleSaveQuickAddRelated` / `handleCopyQuickAddTarget`
- [x] 2.2 hook 入参：当前 quickAdd 用到的依赖项（loadPhrases / contentFilter / expressionClusterFilterId / query / reviewFilter / notify* / focus state 等），按 useCallback 依赖项原样透传
- [x] 2.3 hook 出参稳定函数引用：`{ state, openFor, close, setText, setType, focusInput, save, copyTarget }`
- [x] 2.4 page.tsx 中所有原 setQuickAddRelated* / quickAddRelated* 替换为 hook 出参的语义化方法
- [x] 2.5 新建 `use-quick-add-related.test.tsx`：mock phrasesApi + notify，验证 save 成功/失败、copy 调用 navigator.clipboard、open/close 状态切换
- [x] 2.6 跑 page.interaction.test.tsx + chunks-quick-add-related-sheet.test.tsx

## 3. 抽 use-builtin-phrases-actions.ts

- [x] 3.1 新建 `src/app/(app)/chunks/use-builtin-phrases-actions.ts`，承载：
  - state: `savingBuiltinPhraseId`
  - handler: `handleSaveBuiltinPhrase`
  - 副作用: `setBuiltinPhrases` 局部 mutate（标记 isSaved）
- [x] 3.2 hook 入参：`{ loadPhrases, setBuiltinPhrases, query, reviewFilter, contentFilter, expressionClusterFilterId }`
- [x] 3.3 hook 出参：`{ savingBuiltinPhraseId, savePhrase }`
- [x] 3.4 page.tsx 中 `handleSaveBuiltinPhrase` useCallback 删除，替换为 hook 调用
- [x] 3.5 新建 `use-builtin-phrases-actions.test.tsx`：mock savePhraseFromApi + loadPhrases，验证成功路径 setBuiltinPhrases 标记 + loadPhrases 触发，失败路径 toast
- [x] 3.6 跑 page.interaction.test.tsx

## 4. 抽 use-detail-audio-actions.ts

- [x] 4.1 新建 `src/app/(app)/chunks/use-detail-audio-actions.ts`，承载：
  - state: `regeneratingDetailAudio`
  - handler: `handleRegenerateCurrentDetailAudio`
- [x] 4.2 hook 入参：focusExpression / regenerateChunkAudioBatch 相关依赖 + notify*
- [x] 4.3 hook 出参：`{ regenerating, regenerate }`
- [x] 4.4 page.tsx 删除原 handler 与 state
- [x] 4.5 新建 `use-detail-audio-actions.test.tsx`：mock regenerateChunkAudioBatch，验证 loading 状态进出 + toast
- [x] 4.6 跑 page.interaction.test.tsx

## 5. 抽 chunks-page-hero.tsx

- [x] 5.1 新建 `src/app/(app)/chunks/chunks-page-hero.tsx`，承载 page.tsx 当前 return JSX 最前 ~120 行：sticky header / hero icon+title+subtitle / search input / 关闭/展开 cluster filter 的 X 按钮
- [x] 5.2 props 形态：`{ heroTitle, heroSubtitle, summary, libraryTab, onLibraryTabChange, query, onQueryChange, onOpenAddSheet, clusterFilterExpressionLabel?, onClearClusterFilter? }`
- [x] 5.3 DOM 输出**字节级保持兼容**：相同的 `<header>` 嵌套、`className`、`aria-label`、`placeholder`，确保 interaction test 的 selector 不变
- [x] 5.4 page.tsx 中替换为 `<ChunksPageHero ... />`
- [x] 5.5 跑 page.interaction.test.tsx 必须全绿

## 6. 验证收尾

- [x] 6.1 跑 chunks 全套 unit test（见 proposal §Test Plan）
- [x] 6.2 跑 chunks 全套 interaction test（同上）
- [x] 6.3 `pnpm run lint`：无新增 warning
- [x] 6.4 `npx tsc --noEmit`：本次触动文件无新增错误（pre-existing 错误不修）
- [x] 6.5 `pnpm run text:check-mojibake`：通过
- [x] 6.6 `pnpm run spec:validate --strict`：通过
- [x] 6.7 量化 chunks/page.tsx LoC 变化（预期 2368 → ~1700-1800）
- [x] 6.8 不提交，等待用户审核

## 7. 完成态收尾（用户审核通过后）

- [x] 7.1 commit 实施改动（feat: prefix）
- [x] 7.2 更新 `docs/system-design/ui-style-audit.md` 追加 entry 记录本轮 chunks 拆分
- [x] 7.3 更新 `docs/dev/dev-log.md` 追加 entry
- [x] 7.4 更新 `docs/system-design/architecture-audit-2026-05-16.md` §2.3 / §2.11 标注已落地
- [x] 7.5 `openspec archive decompose-chunks-page-r2` 完成归档
- [x] 7.6 `pnpm run maintenance:check`：通过
