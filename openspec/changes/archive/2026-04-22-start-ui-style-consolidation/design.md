## Context

样式审计发现当前已有两层基础：

- 全局变量与工具 class：`globals.css`、`src/lib/ui/apple-style.ts`
- 公共组件：`Button`、`Card`、`Badge`、`EmptyState`、`StatCard`、`DetailSheetShell`

漂移主要来自页面局部 class：

- `review` 中存在 `rounded-[32px]`、`rounded-[24px]`、`shadow-[0_...]`、渐变背景等较强局部视觉。
- `today` 中存在较多直接十六进制颜色和移动端 clamp 字体。
- `chunks detail` 有大量专属 token，短期不能简单并入全局。

## Goals / Non-Goals

**Goals:**

- 先建立审计文档，避免凭感觉重构。
- 第一处代码收口只做重复 class 常量化，不改变视觉。
- 后续同类收口可以沿着审计文档逐步推进。

**Non-Goals:**

- 不做全站 UI 重构。
- 不调整页面布局或视觉风格。
- 不新增设计 token 系统或 Storybook。
- 不修改主 stable spec；如需稳定规则，后续 archive 时再同步。

## Decisions

1. 先审计再改页面。
   - 原因：现有漂移分布在 review / today / chunks 等多处，直接改页面容易破坏主链路体验。

2. 第一处代码只抽 `APPLE_SUMMARY_CARD` 常量。
   - 原因：`review-page-summary-cards` 有三处完全重复的 summary card class，抽常量不改变 UI，风险低。

3. 不处理 chunks detail token。
   - 原因：chunks detail 是移动端浮层重体验区域，已有大量专属变量，直接统一会牵动范围过大。

## Risks / Trade-offs

- [风险] 常量化不等于真正统一。  
  缓解：把它作为第一步，后续按 audit 文档继续收 surface、radius、shadow。

- [风险] 审计文档过期。  
  缓解：只记录第一批高频漂移点和下一步顺序，不试图成为完整设计系统。
