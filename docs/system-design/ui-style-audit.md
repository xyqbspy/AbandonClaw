# UI 样式渐进收口审计

## 1. 目标

这份文档记录当前 UI 样式的第一批漂移点和渐进收口顺序。

它不是完整设计系统，也不是要求立刻重构所有页面。后续改到相关页面时，优先参考这里做小范围收口。

## 2. 当前统一基础

当前已经具备：

- 全局 CSS 变量：`src/app/globals.css`
  - background / surface / border / shadow / button / feedback / radius
- 样式常量：`src/lib/ui/apple-style.ts`
  - surface、panel、button、badge、banner、input 等公共 class
- 基础组件：`src/components/ui`
  - `Button`、`Card`、`Badge`、`Input`、`Sheet` 等
- 共享组件：`src/components/shared`
  - `EmptyState`、`PageHeader`、`StatCard`、`DetailSheetShell`、`SegmentedControl` 等
- 子域组件：
  - `src/components/audio`
  - `src/components/admin`

所以当前不是“没有统一”，而是“统一基础已经存在，页面局部仍有漂移”。

## 3. 第一批漂移点

### 3.1 圆角

已有 token：

- `--app-radius-card`
- `--app-radius-panel`
- `--app-radius-pill`
- `--mobile-adapt-overlay-*`

当前漂移：

- `review` 中有 `rounded-[32px]`、`rounded-[24px]`、`rounded-[20px]`、`rounded-[18px]`
- `chunks detail` 中有大量移动端 overlay 专属 radius
- `today` 多数使用 token，但仍有少量局部尺寸和圆形图标容器

建议顺序：

1. 先收重复 summary / metric card 的圆角。
2. 再收 review stage panel 内部 block。
3. 暂不动 chunks detail overlay radius。

### 3.2 阴影

已有 token：

- `--app-shadow-soft`
- `--app-shadow-raised`
- `--app-button-primary-shadow`

当前漂移：

- `review` 中有多个 `shadow-[0_...]`
- `today` 有局部 card 和按钮阴影
- shared 组件里 `confirm-dialog`、`detail-sheet-shell` 有浮层专属阴影

建议顺序：

1. 先把重复 summary card 阴影常量化。
2. 保留浮层阴影，因为它们承担 overlay 层级。
3. 后续再评估 review hero / stage panel 是否收回 token。

### 3.3 颜色

已有 token：

- surface / feedback / button / scene / chunks 系列变量

当前漂移：

- `today` 有较多直接十六进制色值。
- `review` 使用 sky / amber / emerald / slate Tailwind 色阶和局部渐变。
- `chunks detail` 使用 `--app-chunks-*` 专属变量。

建议顺序：

1. 先收通用 summary / pill / feedback 颜色。
2. 保留 chunks 专属变量，后续按 chunks detail 专项收。
3. 不在本轮重命名或迁移全局 token。

### 3.4 文字尺寸

当前基础：

- Tailwind text scale
- `app-title-*`、`app-meta-text`、`app-body-text`
- mobile font 变量

当前漂移：

- `today` 使用大量移动端 clamp 字体，属于当前移动端体验的一部分。
- `review` 在页面内混用 `text-xl`、`text-2xl`、`text-base` 和局部 stage 文案。
- `chunks detail` 使用 mobile overlay 字体变量。

建议顺序：

1. 先统一 summary card 的 label/value 字体。
2. 学习主任务区保留页面语义，暂不强行统一。

### 3.5 间距

当前基础：

- `app-container`
- `mobile-space-*`
- Tailwind spacing

当前漂移：

- `review` 中有较多 `p-5`、`p-4`、`gap-3`、`space-y-4`、`pb-28`
- `today` 主要使用 mobile spacing 变量
- `chunks detail` 使用 mobile adapt spacing 变量

建议顺序：

1. 优先收 card / panel 内部 padding。
2. 不先动页面整体布局间距。

## 4. 当前第一步收口对象

已完成：

- `src/app/(app)/review/review-page-summary-cards.tsx`
  - 三个 summary card 使用完全重复的 `rounded-[18px] bg-white/88 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/5`
  - 改为复用 `src/lib/ui/apple-style.ts` 中的共享常量
  - 视觉不变，只减少重复局部 class

## 5. 第二步收口对象

已完成：

- `src/features/today/components/today-review-summary-card.tsx`
  - 将 review due / clear pill 色值和 accuracy value 字体收回 `today-page-styles.ts`
  - 这是 Today 私有视觉语义，暂不提升到全局 token
- `src/features/today/components/today-learning-path-section.tsx`
  - 将 task step card 的 completed / active / inactive 样式、图标容器、标题和说明文字样式收回 `today-page-styles.ts`
  - 视觉不变，只减少页面内散落色值和局部 class
- `src/features/today/components/today-continue-card.tsx`
  - 将 continue card 的标题、进度环、skeleton 和结果文案样式收回 `today-page-styles.ts`
  - 进度环颜色仍是 Today 私有语义，暂不提升到全局 token
- `src/features/today/components/today-recommended-scenes-section.tsx`
  - 将推荐卡标题、原因 pill、空态文字和 badge 样式收回 `today-page-styles.ts`

## 6. 待办

- `src/features/today/components/today-task-list.tsx`
  - 已将 task action 的主按钮、次按钮、禁用态和 wrapper 组合收回 `today-page-styles.ts`
  - 保留 `APPLE_BUTTON_BASE` / `APPLE_BUTTON_STRONG` 作为底层主次语义，不新增独立按钮体系
- `src/features/today/components/today-saved-expressions-section.tsx`
  - 已将“查看表达库”链接、saved item、meta 和 footnote 样式收回 `today-page-styles.ts`
  - 该链接仍是 Today 私有 inline link，暂不提升成全局 link token

## 7. 明确不收项

本轮不处理：

- `review` hero 大渐变和 stage panel 整体视觉
- `today` 全部十六进制色值替换
- `chunks detail` 专属 token 合并
- 全局 token 命名重构
- Storybook、视觉回归测试或全页面截图测试

## 8. 后续建议顺序

1. summary / metric card surface
2. feedback / pill 颜色
3. review stage panel 内部 block
4. today section 内部局部色值
5. chunks detail overlay 专项审计

每一步都应保持小范围、可回退、可解释。

## 9. Review stage panel 收口记录

已完成：

- `src/app/(app)/review/review-page-stage-panel.tsx`
  - 将 stage shell、step tag、标题、内部 panel、dashed todo block、warning block、reference block 和 feedback pill 抽为同文件局部常量。
  - 暂不提升到 `apple-style.ts`，原因是这些样式仍强依赖 review 阶段式工作台语义。
  - 保持视觉不变，只减少 JSX 中重复的圆角、阴影、border 和反馈色块。

待办：

- `review-page-stage-panel.tsx` 仍有若干字段标题、正文强弱层级使用 `text-slate-*` 局部 class。
- `review/page.tsx` 顶部 hero 仍有 `rounded-[32px]`、局部渐变和强阴影。
- 这些会影响 review 页面整体气质，后续应单独做 review 页面视觉收口，不在本轮继续扩大。

## 10. Review 页面外壳收口记录

已完成：

- `src/app/(app)/review/page.tsx`
  - 将页面 wrapper、hero、进度条、来源入口、来源不可用提示和底部固定操作栏样式抽为同文件局部常量。
  - 将底部主按钮、次按钮、危险按钮的 `buttonVariants` 组合提升为模块常量，避免每次 render 重建同一组 class。
  - 保持视觉和交互条件不变；这轮只收样式组织，不改变 review 队列、阶段推进或提交逻辑。

待办：

- `review/page.tsx` 的 hero 渐变、`rounded-[32px]` 和强阴影仍是 review 页面私有视觉语义，暂不提升到 `apple-style.ts`。
- 后续若 review、today、progress 出现同类 hero / fixed footer 结构，再评估是否抽成共享页面骨架 token。
