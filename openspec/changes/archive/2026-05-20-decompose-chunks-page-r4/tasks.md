# Tasks

实施完成 → 验证 → 量化 → meta 同步 → archive，完整收尾。

## Status
done

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

- [x] 3.1 跑 chunks 全套 unit test（pure logic，9 个文件）：39/39 通过
- [x] 3.2 跑 chunks 全套 interaction test（page + list-view + sheets + quick-add + 17 个 hook）：75/75 通过
- [x] 3.3 `pnpm run lint`：本轮触动文件 0 errors / 0 warnings
- [x] 3.4 `npx tsc --noEmit`：本轮触动文件无新增错误（pre-existing 错误不修，与 r3 同源）
- [x] 3.5 `pnpm run text:check-mojibake`：通过
- [x] 3.6 `pnpm exec openspec validate decompose-chunks-page-r4 --strict`：通过

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

## 5. 完成态收尾

按 `openspec/specs/project-maintenance/spec.md` 两条硬约束执行：
- **line 117**：架构能力变化必须同轮检查并同步 `docs/meta/product-overview.md` + `docs/meta/technical-overview.md`（含 interview-project-deep-dive.md，下称 meta 三件套）
- **line 135**：Spec-Driven 完成态提交前必须先完成收尾，不得先提交实现代码再补文档

下一轮（r5 / r6）直接按此清单走，不要再用 r3 §6 的旧模板（缺 meta 三件套）。

### 5.1 实施代码提交
- [x] commit `43db0cd`：feat(chunks) 实施代码 + OpenSpec change 三件套（proposal + tasks + spec delta）
- [x] commit `ccce359`：chore 移除 `.codex/skills/openspec-*` 4 个工作流 skill（与 r4 解耦）

### 5.2 dev-log 追加 r4 entry
- [x] `docs/dev/dev-log.md` 追加 `[2026-05-17] chunks/page.tsx 第四轮拆分（decompose-chunks-page-r4 落地）` entry：背景 / OpenSpec change / 本轮落地 / 验证 / 量化与策略验证 / **meta 三件套同步说明** / **流程修复（本轮顺序违规的反思）** / 协作说明 / 本轮明确不收项

### 5.3 architecture-audit §2.3 追加 r4 状态行
- [x] `docs/system-design/architecture-audit-2026-05-16.md` §2.3 追加 r4 状态行：LoC 量化（2108 → 2041，-67，-3.2%）+ 拆离对象（chunks-page-list-section.tsx 176 行）+ r3 §5.9 策略验证结果 + r5 候选

### 5.4 meta 三件套检查与同步（project-maintenance spec line 117 硬约束）
对照 spec line 117 列出的 7 类触发条件：用户可感知核心能力 / 产品亮点 / 主链路体验 / **架构能力** / 缓存或播放链路 / 平台治理能力 / 对外技术介绍口径。

- [x] `docs/meta/product-overview.md`：本轮属于"架构能力"变化但对用户可感知能力**无直接影响**（拆分内部组件结构，用户行为完全不变），无需在 §5 当前版本新增亮点新增小节。**已在 commit `90baf71` 验证**：a146d12 之后的用户可感知变化已通过 §5.8 / §5.9 / §5.10 一次性收口。
- [x] `docs/meta/technical-overview.md`：**已在 commit `90baf71` 同步**：§4.4 "代码组织治理与多轮拆分"覆盖 chunks r2/r3/r4 + scene-detail r2 完整 LoC 表与策略反馈链路。
- [x] `docs/meta/interview-project-deep-dive.md`：**已在 commit `90baf71` 同步**：§14.14 "page.tsx 多轮拆分：工程能力的可量化案例"完整展开 r2/r3/r4 量化反馈案例。

### 5.5 OpenSpec archive + stable spec sync
- [x] `pnpm exec openspec archive decompose-chunks-page-r4 -y`：r4 目录搬到 `archive/2026-05-17-decompose-chunks-page-r4/`，spec delta 自动合并到 `openspec/specs/feature-component-decomposition/spec.md`
- [x] `pnpm exec openspec validate --all --strict`：通过

### 5.6 maintenance:check
- [x] `pnpm run maintenance:check`：通过

### 5.7 流程修复（本轮顺序违规的防复发动作）
本轮在 commit `43db0cd` 之前未完成 meta 三件套同步与 archive，违反 spec line 135。**根因**：r3 tasks.md §6 收尾清单未列 meta 三件套，r4 直接照抄 r3 模板继承了漏洞。本轮通过 4 步联合修复防复发：

- [x] 5.7.1 本 tasks.md §5 收尾清单完整化（含 meta 三件套检查 + spec line 117 / line 135 显式 cite），archive 后成为 r5 模板
- [x] 5.7.2 补 r3 archive 的 tasks.md patch（标注隐性漏洞源头与本轮修复轨迹）
- [x] 5.7.3 强化 `scripts/check-maintenance-guardrails.ts`：扫描最近 feat / refactor commit 涉及主链路文件时警告 `docs/meta/*` 是否同步
- [x] 5.7.4 加 AI feedback memory：主链路 OpenSpec change 优先读 `project-maintenance` spec 两条硬约束
