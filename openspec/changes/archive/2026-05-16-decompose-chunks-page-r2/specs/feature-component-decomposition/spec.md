# 规范文档：feature-component-decomposition

## ADDED Requirements

### Requirement: chunks/page.tsx 第二轮拆分必须按"styles + 单一职责 hook + hero section"边界执行
系统 MUST 在对 `chunks/page.tsx` 进行第二轮拆分时，按以下边界推进：抽 `chunks-page-styles.ts` 收口本文件内重复 class 常量、抽承载单一动作职责的 hook（quick-add-related / builtin-phrases-actions / detail-audio-actions）、抽 sticky hero section；不得借本轮顺手改变 11 个既有 hook 的 props 签名、不得动 `chunks-list-view.tsx` / `chunks-page-sheets.tsx` 内部、不得改变 spec 层业务语义。

#### Scenario: 推进 chunks/page.tsx 二轮拆分时的范围边界
- **GIVEN** 维护者准备推进 `chunks/page.tsx` 第二轮拆分
- **WHEN** 决定本轮拆分对象时
- **THEN** 维护者 MUST 把拆分范围限定为：建 `chunks-page-styles.ts`、抽 3 个单一动作 hook（`use-quick-add-related.ts` / `use-builtin-phrases-actions.ts` / `use-detail-audio-actions.ts`）、抽 1 个 view section（`chunks-page-hero.tsx`）
- **AND** MUST NOT 动 `chunks-list-view.tsx` 与 `chunks-page-sheets.tsx` 的内部实现
- **AND** MUST NOT 改变既有 11 个 hook（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data`）的 props 签名
- **AND** MUST NOT 改变 `chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition` 三份 spec 的 Requirement

#### Scenario: chunks 二轮拆分后的入口级回归
- **WHEN** 维护者完成本轮拆分（chunks-page-styles + 3 hook + chunks-page-hero）
- **THEN** `page.interaction.test.tsx` MUST 继续通过，不得依靠重写测试或弱化断言来达成
- **AND** `chunks-list-view.interaction.test.tsx` / `chunks-page-sheets.interaction.test.tsx` / `chunks-quick-add-related-sheet.test.tsx` MUST 继续通过
- **AND** 抽出的 hero section MUST 在 DOM 输出上保持字节级兼容（相同的 `<header>` / `className` / `aria-label` / `placeholder`）
- **AND** 3 个新 hook MUST 各自带专属单测，验证 loading / 成功 / 失败路径以及关键 handler 引用稳定性
