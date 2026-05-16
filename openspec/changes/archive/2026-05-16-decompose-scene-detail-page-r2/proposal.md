# scene-detail-page.tsx 第二轮拆分

## Status
draft

## Why

`src/app/(app)/scene/[slug]/scene-detail-page.tsx` 当前实测 1245 行，仍是 `SceneDetailClientPage` 单一入口。`docs/system-design/architecture-audit-2026-05-16.md` §2.4 已把它列为 P0，原因是 scene detail 是 `today -> scene -> chunks -> review` 主学习闭环里的核心入口，继续在同一个页面文件叠加练习、变体、表达地图和训练 CTA 编排，会放大后续维护和回归成本。

现状已经拆出 `use-scene-detail-data`、`use-scene-detail-actions`、`use-scene-detail-playback`、`use-scene-detail-route-state`、`use-scene-learning-sync`、`scene-detail-page-logic`、`scene-detail-controller` 等模块，但主页面仍集中承担：

- practice run start / attempt / mode complete / complete 的 API 编排、缓存快照回写和去重。
- practice / variant idle prewarm 的调度与失败门禁。
- variant run cache/API 同步和自动 run 启动。
- training next-step CTA 派生、progress entry 装配、chunk detail sheet 装配。
- practice / variants / expression-map / variant-study / base view 的分支返回。

这些职责都属于 scene detail 页内部强语义，不适合抽到公共组件层；但它们已经足够独立，适合继续拆成同目录 hook、logic 或 view section，保持页面入口只做路由和视图组装。

## What Changes

本 change 只定义并准备推进第二轮拆分，审批前不实施业务代码。

### 1. 抽 practice run lifecycle hook

新建同目录 hook，承载页面中与 practice run 生命周期直接相关的局部状态和 handler：

- `handlePracticeRunStart`
- `handlePracticeAttempt`
- `handlePracticeModeComplete`
- `handlePracticeComplete`
- `practiceRunStartDedup` 与测试 reset 入口
- `setScenePracticeSnapshotCache` 回写、`setPracticeSnapshot` 更新和 learning state 回写回调

拆分后必须保持 practice set 保存、run 去重窗口、attempt 统计、mode complete summary、scene practice milestone 和缓存快照语义不变。

### 2. 抽 generation prewarm hook

新建同目录 hook，承载 practice / variant idle prewarm：

- practice prewarm failure counter、blocked state、retry error。
- `resetPracticePrewarmFailures` / `registerPracticePrewarmFailure`。
- `handlePracticeToolAction` / manual generate / manual regenerate 的失败门禁重置。
- practice idle prewarm effect。
- variant idle prewarm effect。

拆分后必须保持三次失败后阻断自动预热、中文错误提示、手动重试会解除阻断、idle action key 和 cleanup 行为不变。

### 3. 抽 variant run lifecycle hook

新建同目录 hook，承载 variant run 的缓存/API 同步：

- `getSceneVariantRunCache` -> `getSceneVariantRunSnapshotFromApi` -> `setSceneVariantRunCache` 的读取和回写。
- `hydrateVariantSetFromRun` 与 `refreshGeneratedState`。
- 无 query variant 时自动设置 `activeVariantId`。
- `viewMode === "variants"` 且 variant set generated 时启动 `startSceneVariantRunFromApi`。

拆分后必须保持 variants / variant-study 路由状态、active variant 自动恢复和非阻塞失败语义不变。

### 4. 抽 scene detail view switch section

新建同目录 view section 或 presenter，承载 `practice`、`variants`、`expression-map`、`variant-study` 与 base `SceneBaseView` 的分支装配。第一轮允许使用较粗 props，目标是把 JSX 分支从主页面中隔离出来，不引入 context，也不改变子组件 props 契约。

拆分后必须保持现有 DOM selector、按钮文案、loading 文案、`aria`/`data-testid`、`SelectionDetailSheet` 装配和 view route 行为兼容。

## Stability Closure

### In This Round

- 明确 §2.4 的第二轮拆分边界，避免把 scene detail 重构混进样式、TTS、practice 业务语义或公共组件抽象。
- 将高风险 handler 拆分限定在同目录内部 hook / section，保持 feature-private 边界。
- 为 practice run、prewarm、variant run 和 view switch 都设置入口级回归与专属测试要求。

### Not In This Round

- 不改变 scene 学习状态推进、session 恢复、完成判定、today/progress 聚合或 review 回流语义。
- 不改变 practice / variant / expression map 的业务文案、生成策略、API、缓存 TTL、DB 或服务端契约。
- 不调整 TTS、block-first audio、scene full loop 或音频预热公共层。
- 不重构 `lesson-reader`、`selection-detail-*`、`ScenePracticeView`、`SceneVariantsView`、`SceneExpressionMapView` 的内部实现。
- 不把 scene 私有组件、class 常量或训练组件提升到 `src/components/*`。
- 不处理 `scene-detail-page.tsx` 既有 `react-hooks/refs` lint 历史问题，除非本轮触碰代码直接引入新的 lint 错误。

### Risk Tracking

- 延后原因：上述不收项要么是独立业务能力，要么会扩大到跨 feature 组件边界，不适合和页面减重同轮处理。
- 风险记录位置：本 change 的 tasks、完成后的 `docs/dev/dev-log.md`，以及 `docs/system-design/architecture-audit-2026-05-16.md` §2.4。

## Scope

### In Scope

- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- 新增同目录 hook / view section / 测试文件
- 必要时小幅调整 `scene-detail-page-logic.ts` 的纯函数边界
- OpenSpec delta：`feature-component-decomposition`
- 完成态文档：`docs/dev/dev-log.md`、`docs/system-design/architecture-audit-2026-05-16.md`，必要时补 `docs/system-design/ui-style-audit.md`

### Out of Scope

- 服务端 API、数据库、RLS、缓存 TTL、TTS 公共层。
- scene practice 题型、variant 内容生成、expression map 数据结构。
- `lesson-reader` 与 selection detail 的结构性统一。
- 正式 `CHANGELOG.md`：本轮是内部可维护性拆分，无用户可感知变化，默认不更新。

## Impact

影响的规范：`feature-component-decomposition`

影响的模块：

- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/page.test.tsx`
- `src/app/(app)/scene/[slug]/page.regression.test.tsx`
- 新增 hook / section 及对应测试

是否涉及 API 变更：否

是否涉及前端交互变化：否，目标为行为兼容拆分

是否影响缓存策略：否，只保持现有 scene practice / variant run cache 回写语义

是否影响测试基线：是，需要新增拆分模块测试并保留页面级回归

兼容性：向后兼容

风险点：

- hook 抽出后遗漏依赖，导致 run 去重、快照回写或 prewarm cleanup 漂移。
- view section props 过粗，导致后续继续膨胀；本轮先接受粗 props，以物理隔离和测试保护为优先。
- scene detail 是主链路入口，必须用页面级回归覆盖真实分支，而不能只跑新 hook 单测。

## Test Plan

Proposal 阶段：

```bash
pnpm exec openspec validate decompose-scene-detail-page-r2 --strict
```

实施阶段最小验证：

```bash
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[slug]/page.test.tsx" "src/app/(app)/scene/[slug]/page.regression.test.tsx"
```

相关逻辑 / hook 测试：

```bash
node --import tsx --test "src/app/(app)/scene/[slug]/scene-detail-page-logic.test.ts" "src/app/(app)/scene/[slug]/scene-detail-learning-logic.test.ts" "src/app/(app)/scene/[slug]/scene-detail-load-logic.test.ts" "src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.test.ts" "src/app/(app)/scene/[slug]/scene-detail-controller.test.ts"
node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[slug]/use-scene-detail-actions.test.tsx" "src/app/(app)/scene/[slug]/use-scene-detail-data.test.tsx" "src/app/(app)/scene/[slug]/use-scene-detail-playback.test.tsx" "src/app/(app)/scene/[slug]/use-scene-detail-route-state.test.tsx" "src/app/(app)/scene/[slug]/use-scene-learning-sync.test.tsx"
```

新增测试要求：

- practice run lifecycle hook：验证 run start 去重、服务端 practice set 保存、attempt summary 更新、mode complete summary、complete fallback 和 cache write。
- generation prewarm hook：验证失败计数、三次阻断、手动重试 reset、schedule/cancel key。
- variant run lifecycle hook：验证缓存命中、API fallback、active variant 自动恢复、generated set 自动 start run。
- view switch section：验证 practice / variants / expression-map / variant-study / base view 分支仍渲染原子组件和关键按钮文案。

完成态收尾验证：

```bash
pnpm run lint
npx tsc --noEmit
pnpm run text:check-mojibake
pnpm run maintenance:check
```

