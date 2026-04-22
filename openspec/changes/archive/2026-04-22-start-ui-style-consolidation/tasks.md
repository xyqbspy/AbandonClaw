## 1. 审计

- [x] 1.1 新增 `docs/system-design/ui-style-audit.md`，记录当前间距、圆角、文字、颜色、阴影的第一批漂移点。
- [x] 1.2 更新 `docs/system-design/README.md` 和 `component-library.md`，加入审计文档入口。

## 2. 第一处低风险收口

- [x] 2.1 在 `src/lib/ui/apple-style.ts` 新增 summary card surface 常量。
- [x] 2.2 将 `review-page-summary-cards.tsx` 的重复 summary card class 改为复用该常量，保持视觉不变。
- [x] 2.3 将 Today review pill / accuracy value 的局部样式收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.4 将 Today learning path step 的状态 card 样式收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.5 将 Today continue card 的进度环、标题和 skeleton 样式收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.6 将 Today recommended scene 的标题、reason pill、空态和 badge 样式收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.7 记录 `today-task-list` 主/次按钮局部组合的后续 TODO，暂不扩大本轮范围。
- [x] 2.8 将 `today-saved-expressions-section` 的 inline link、saved item 和 footnote 样式收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.9 将 `today-task-list` 的主/次/禁用任务按钮组合收回 `today-page-styles.ts`，保持视觉不变。
- [x] 2.10 将 `review-page-stage-panel` 的 stage shell、内部 block、warning block 和 feedback pill 抽为 review 局部常量，保持视觉不变。

- [x] 2.11 将 `review/page.tsx` 的 hero、progress、来源提示和底部 footer 样式抽为页面局部常量，保持视觉不变。

## 3. 验证

- [x] 3.1 运行相关最小测试或类型检查。
  - `pnpm exec eslint src/lib/ui/apple-style.ts 'src/app/(app)/review/review-page-summary-cards.tsx'` 通过。
  - `pnpm exec eslint src/features/today/components/today-page-styles.ts src/features/today/components/today-review-summary-card.tsx src/features/today/components/today-learning-path-section.tsx src/lib/ui/apple-style.ts 'src/app/(app)/review/review-page-summary-cards.tsx'` 通过。
  - `pnpm exec eslint --max-warnings=0 src/features/today/components/today-page-styles.ts src/features/today/components/today-review-summary-card.tsx src/features/today/components/today-learning-path-section.tsx src/features/today/components/today-continue-card.tsx src/features/today/components/today-recommended-scenes-section.tsx src/lib/ui/apple-style.ts 'src/app/(app)/review/review-page-summary-cards.tsx'` 通过。
  - `pnpm exec eslint --max-warnings=0 src/features/today/components/today-page-styles.ts src/features/today/components/today-saved-expressions-section.tsx src/features/today/components/today-task-list.tsx src/features/today/components/today-continue-card.tsx src/features/today/components/today-recommended-scenes-section.tsx` 通过。
  - `pnpm exec eslint --max-warnings=0 'src/app/(app)/review/review-page-stage-panel.tsx'` 通过。
  - `pnpm exec eslint --max-warnings=0 'src/app/(app)/review/page.tsx'` 通过。
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test src/features/today/components/today-sections.test.tsx src/features/today/components/today-page-client.test.tsx` 通过，8 项测试通过。
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/review/page.interaction.test.tsx'` 已尝试，7/8 通过；失败用例卡在“进入熟悉度判断”而非“返回 today”，属于 review 队列清空测试语义/前置状态问题，和本轮样式常量化无关，暂不改业务测试。
  - `pnpm exec tsc --noEmit` 已尝试，失败来自既有 chunks / scene / admin / tts / practice 测试与服务类型问题，和本轮样式常量化无关。
- [x] 3.2 使用 `rg` 检查重复 summary card class 是否收口。
- [x] 3.3 使用 `git diff --check` 检查空白问题。
