# 任务清单

## Status
draft

> 当前仅完成 Proposal 阶段。用户批准前不得实施业务代码。

## 1. Proposal

- [x] 1.1 读取维护入口、产品北极星、feature/component 拆分规范和 scene 相关审计入口
- [x] 1.2 盘点 `scene-detail-page.tsx` 当前行数、已拆模块和主文件残留职责
- [x] 1.3 新建 `openspec/changes/decompose-scene-detail-page-r2/proposal.md`
- [x] 1.4 新建 `openspec/changes/decompose-scene-detail-page-r2/tasks.md`
- [x] 1.5 新建 `openspec/changes/decompose-scene-detail-page-r2/specs/feature-component-decomposition/spec.md`
- [x] 1.6 运行 `pnpm exec openspec validate decompose-scene-detail-page-r2 --strict`
- [x] 1.7 等待用户批准后进入实施阶段

## 2. 实施：practice run lifecycle

- [x] 2.1 新建同目录 hook，迁入 `handlePracticeRunStart` / `handlePracticeAttempt` / `handlePracticeModeComplete` / `handlePracticeComplete`
- [x] 2.2 保留 `practiceRunStartDedup` 的去重窗口与测试 reset 能力
- [x] 2.3 保持 `setPracticeSnapshot`、`setScenePracticeSnapshotCache`、learning state 回写和 milestone 触发语义不变
- [x] 2.4 新增 hook 专属测试，覆盖 run start 去重、attempt summary、mode complete、complete fallback 与 cache write
- [x] 2.5 跑 scene detail 页面级回归测试

## 3. 实施：generation prewarm

- [x] 3.1 新建同目录 hook，迁入 practice prewarm failure counter、blocked state、retry error 与 reset/register handler
- [x] 3.2 迁入 practice idle prewarm effect，保持失败三次阻断、手动重试 reset、schedule/cancel key 不变
- [x] 3.3 迁入 variant idle prewarm effect，保持 generated/idle/loading 判断不变
- [x] 3.4 新增 hook 专属测试，覆盖失败计数、阻断、手动重试 reset、schedule/cancel cleanup
- [x] 3.5 跑 scene detail 页面级回归测试

## 4. 实施：variant run lifecycle

- [x] 4.1 新建同目录 hook，迁入 variant run cache/API 同步和 `hydrateVariantSetFromRun`
- [x] 4.2 保持无 query variant 时自动设置 `activeVariantId` 的行为不变
- [x] 4.3 迁入 `viewMode === "variants"` 且 set generated 时自动 start run 的 effect
- [x] 4.4 新增 hook 专属测试，覆盖缓存命中、API fallback、cache write、active variant 自动恢复和 start run
- [x] 4.5 跑 scene detail 页面级回归测试

## 5. 实施：view switch section

- [x] 5.1 新建同目录 view section / presenter，承载 practice / variants / expression-map / variant-study / base view 分支装配
- [x] 5.2 保持子组件 props 契约、按钮文案、loading 文案、`data-testid`、`aria` 和关键 DOM selector 兼容
- [x] 5.3 保持 `SelectionDetailSheet` 只装配一次且传参语义不变
- [x] 5.4 新增 section 测试或扩展页面回归，覆盖五个 viewMode 分支
- [x] 5.5 跑 scene detail 页面级回归测试

## 6. 验证

- [x] 6.1 跑 `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[slug]/page.test.tsx" "src/app/(app)/scene/[slug]/page.regression.test.tsx"`
- [x] 6.2 跑 scene detail 相关 logic / hook 测试
- [x] 6.3 跑新增 hook / section 测试
- [x] 6.4 `pnpm run lint`
- [x] 6.5 `npx tsc --noEmit`
- [x] 6.6 `pnpm run text:check-mojibake`
- [x] 6.7 量化 `scene-detail-page.tsx` 行数变化

## 7. 文档与收尾

- [x] 7.1 更新 `docs/dev/dev-log.md`，记录拆分结果、验证命令、剩余风险和明确不收项
- [x] 7.2 更新 `docs/system-design/architecture-audit-2026-05-16.md` §2.4 状态
- [x] 7.3 如 view section 或 scene-local 样式边界发生实质变化，补充 `docs/system-design/ui-style-audit.md`
- [x] 7.4 对照 proposal / tasks / spec delta 做实现 Review
- [x] 7.5 将 change delta 同步到 stable spec 后归档
- [x] 7.6 运行 `pnpm run maintenance:check`
- [x] 7.7 确认本轮无用户可感知变化，正式 `CHANGELOG.md` 不更新

## 本轮收口项

- [x] `scene-detail-page.tsx` 第二轮拆分边界落到同目录 hook / section，页面入口回到组装职责
- [x] practice run / prewarm / variant run / view switch 均有入口级回归或专属测试保护
- [x] 完成态文档记录不收项和剩余风险

## 明确不收项

- [x] 不改变 scene 学习状态推进、session 恢复、完成判定、today/progress 聚合或 review 回流语义
- [x] 不改变 practice / variant / expression map 的业务文案、生成策略、API、缓存 TTL、DB 或服务端契约
- [x] 不调整 TTS、block-first audio、scene full loop 或音频预热公共层
- [x] 不重构 `lesson-reader`、`selection-detail-*`、`ScenePracticeView`、`SceneVariantsView`、`SceneExpressionMapView` 内部实现
- [x] 不抽公共组件、不提升 scene 私有 styles 到全局 token
- [x] 不处理既有 `react-hooks/refs` lint 历史问题，除非本轮新增或触碰导致新的 lint 错误

