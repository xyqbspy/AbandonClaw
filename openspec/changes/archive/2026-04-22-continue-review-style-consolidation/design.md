## Overview

本轮继续沿用“页面或 feature 私有样式先在本地收敛”的策略，不抽公共组件、不新增全局设计 token。

目标是降低 `review-page-stage-panel.tsx` JSX 中剩余样式噪音，让 Review 阶段式训练的文字层级更容易维护，同时保持视觉输出和交互条件不变。

## Current State

已完成：

- stage panel 外壳、step tag、标题、内部 block、warning block、reference block、feedback pill 已抽为同文件局部常量。
- Review page 外壳、hero、progress、来源入口和 footer 已抽为页面局部常量。
- UI 风格指南和审计文档已经存在。

仍存在：

- 空队列标题、场景标题、表达标题、评分提示、调度提示、reference toggle 等仍在 JSX 内直接写 `text-slate-*` / `text-amber-*` / `font-*` 组合。
- 这些样式属于 Review 阶段式训练语义，不适合直接提升为全局 `apple-style.ts`。

## Design

- 在 `review-page-stage-panel.tsx` 顶部继续新增局部常量，例如：
  - queue done title
  - scene title/body/expected answer
  - phrase hidden/expression/scoring text
  - scheduling reason text
  - reference toggle button
  - inline practice result tone
- JSX 中只替换 className 引用，不改变标签结构、条件渲染、事件处理或文本内容。
- 对动态状态色保留 `cn()` 组合，但把固定基础层级抽为常量。
- 更新 `ui-style-audit.md` 的 Review stage panel 收口记录。

## Stability Closure

- 已发现的不稳定点：Review 内部文案层级仍有多个局部 class 残留，后续新增阶段容易继续复制。
- 本轮收口：只收 Review stage panel 内部文字层级和提示样式。
- 明确不收：不抽全局 token、不改按钮 variant、不改 `review/page.tsx` hero 视觉、不处理已知 review 交互测试前置语义问题。
- 风险记录：`docs/system-design/ui-style-audit.md`。

## Validation

- `pnpm exec eslint --max-warnings=0 'src/app/(app)/review/review-page-stage-panel.tsx'`
- `git diff --check`
- `node_modules\.bin\openspec.CMD validate continue-review-style-consolidation --strict`
- 若运行 `review/page.interaction.test.tsx`，需继续说明既有空队列用例前置状态失败是否仍与样式无关。
