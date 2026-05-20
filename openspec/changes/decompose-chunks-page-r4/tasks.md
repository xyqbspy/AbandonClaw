# Tasks

实施已完成，本轮先补 OpenSpec 工作流再验证 + commit。

## Status
in-progress

## 1. 抽 chunks-page-list-section.tsx（ChunksListView 装配 wrapper）

- [x] 1.1 新建 `src/app/(app)/chunks/chunks-page-list-section.tsx`，承载 ChunksListView 完整装配 + reviewStatusLabel 常量 + extractExpressionsFromSentenceItem helper + 两个 className 常量
- [x] 1.2 设计 6 个分组对象 props（data / expansion / status / audio / presenters / actions），用 `Pick<ChunksListViewProps, ...>` 自描述 props 边界
- [x] 1.3 内部用 `{...data} {...expansion} ...` 散开重组成 ChunksListView 原 hand-roll props 形态，保证透传完全一致
- [x] 1.4 page.tsx 替换为 `<ChunksPageListSection ... />`，按 6 个分组组装入参；同步删除：
  - `import { ChunksListView }` 直接 import
  - `import { CHUNKS_PRIMARY_BUTTON_CLASSNAME as chunksButtonClassName }` 直接 import（迁到 section 内部）
  - 顶部 `reviewStatusLabel: Record<PhraseReviewStatus, string>` 模块常量
  - 顶部 `extractExpressionsFromSentenceItem` helper
- [x] 1.5 DOM 输出保持字节级兼容（外层 `<section className="space-y-4">`、ChunksListView 透传 props 形态完全一致）

## 2. 配套调整 chunks-list-view.tsx 与 chunks-page-focus-mode-section.tsx

- [x] 2.1 chunks-list-view.tsx：把 `ChunksListViewLabels` 与 `ChunksListViewProps` 改为 `export type`，让 section 能 `Pick<>` 自描述 props
- [x] 2.2 chunks-page-focus-mode-section.tsx：删除内联 `FocusPreviewItem` / `SavedRelationRowsBySourceId` type 定义，改成从 `@/features/chunks/components/types` import 统一定义（顺手修一个孤儿 type，与 ClusterFocusList 期望对齐）
- [x] 2.3 use-sentence-expression-save.test.tsx：把 `let resolveSave: (() => void) | null = null` 改成 `let resolveSave: () => void = () => {}`，消除可选链；测试断言完全不动

## 3. 验证

- [ ] 3.1 跑 chunks 全套 unit test（pure logic，9 个文件）：全部通过
- [ ] 3.2 跑 chunks 全套 interaction test（page + list-view + sheets + quick-add + 17 个 hook）：全部通过
- [ ] 3.3 `pnpm run lint`：本轮触动文件 0 errors，无新增 warning
- [ ] 3.4 `npx tsc --noEmit`：本轮触动文件无新增错误（pre-existing 错误不修）
- [ ] 3.5 `pnpm run text:check-mojibake`：通过
- [ ] 3.6 `pnpm exec openspec validate decompose-chunks-page-r4 --strict`：通过

## 4. 量化与策略验证

- [x] 4.1 量化 chunks/page.tsx LoC：**2108 → 2041（-67, -3.2%）**，明显高于 r3 的 -23（-1.1%）
- [x] 4.2 验证 r3 §5.9 给出的 r4 策略（"抽高 props-cost 子树"）有效：本轮 67 行减幅证明该策略相比 r3 的"抽 state + 小 handler"组合，对 page.tsx 瘦身贡献明显更大
- [x] 4.3 量化新组件规模：chunks-page-list-section.tsx **176 行**，结构清晰
- [x] 4.4 检查本轮未收口项已记录原因与风险（见 proposal §Stability Closure §不收项）

### 4.5 LoC 减幅来源分析

| 移走对象 | 移走代码量（page.tsx） | page.tsx 新增装配 | 净减 |
| --- | --- | --- | --- |
| ChunksListView 装配代码（41 labels + 18 handler + 多组 props） | ~95 行 hand-roll | 1 个组件调用 + 6 个分组 props 拼装 (~52 行) | -43 |
| `reviewStatusLabel` 常量 | 6 行 | - | -6 |
| `extractExpressionsFromSentenceItem` helper | 17 行 | - | -17 |
| `import { ChunksListView }` | 1 行 | - | -1 |
| `import { CHUNKS_PRIMARY_BUTTON_CLASSNAME as chunksButtonClassName }` | 1 行 | - | -1 |
| 同步加 `import { ChunksPageListSection }` | - | +1 | +1 |

**总计净减 -67 行**，与实测一致。

**关键发现**：r4 策略验证成功——抽高 props-cost 子树 + 顺带搬走与子树强耦合的常量/helper，比 r3 的"抽 state + 小 handler"组合在 page.tsx 瘦身上效率高约 3 倍（67 vs 23）。这也意味着 r5/r6 应继续沿这个方向：先找下一个高 props-cost 子树（候选：`<FocusDetailSheet>` 装配、`<MapPanel>` 装配等），而非继续找小 hook 抽。

## 5. 完成态收尾（用户审核通过后）

- [ ] 5.1 commit 实施改动 + 本 OpenSpec change（一笔 feat）
- [ ] 5.2 commit `.codex/skills/openspec-*` 删除（单独一笔 chore，与 r4 解耦）
- [ ] 5.3 等审核通过后再做：更新 `docs/dev/dev-log.md` 追加 r4 entry + 更新 `docs/system-design/architecture-audit-2026-05-16.md` §2.3 追加 r4 状态行 + `openspec archive decompose-chunks-page-r4` 归档 + spec sync
