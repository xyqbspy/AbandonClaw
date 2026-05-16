# 规范文档：feature-component-decomposition

## ADDED Requirements

### Requirement: chunks/page.tsx 第三轮拆分必须按"3 hook + 1 view section + 已有 hook 协作边界"执行
系统 MUST 在对 `chunks/page.tsx` 进行第三轮拆分时，按以下边界推进：抽 `use-expression-map.ts`（map 浮层完整生命周期）、抽 `use-sentence-expression-save.ts`（句子维度表达保存）、抽 `use-focus-relation-tab.ts`（focus detail 关系 tab UI 控制）、抽 `chunks-page-focus-detail-section.tsx`（focus detail 区 JSX 装配）；不得借本轮顺手改变既有 14 个 hook 的 props 签名、不得动 `chunks-list-view.tsx` / `chunks-page-sheets.tsx` 内部、不得改变 `useFocusDetailController` 现有职责边界、不得改变 spec 层业务语义。

#### Scenario: 推进 chunks/page.tsx 三轮拆分时的范围边界
- **GIVEN** 维护者准备推进 `chunks/page.tsx` 第三轮拆分
- **WHEN** 决定本轮拆分对象时
- **THEN** 维护者 MUST 把拆分范围限定为：抽 3 个 hook（`use-expression-map.ts` / `use-sentence-expression-save.ts` / `use-focus-relation-tab.ts`）+ 抽 1 个 view section（`chunks-page-focus-detail-section.tsx`）
- **AND** MUST NOT 动 `chunks-list-view.tsx` 与 `chunks-page-sheets.tsx` 的内部实现
- **AND** MUST NOT 改变既有 14 个 hook（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data` / `use-builtin-phrases-actions` / `use-quick-add-related` / `use-detail-audio-actions`）的 props 签名
- **AND** MUST NOT 让新 `use-focus-relation-tab` 承担 focus detail 数据计算（`focusViewModel` / 关系数据等仍由 `useFocusDetailController` 提供，新 hook 只承载 tab/expand/confirm-action 等 UI 状态）
- **AND** MUST NOT 改变 `chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition` 三份 spec 的 Requirement

#### Scenario: chunks 三轮拆分后的入口级回归
- **WHEN** 维护者完成本轮拆分（3 hook + focus detail section）
- **THEN** `page.interaction.test.tsx` MUST 继续通过，不得依靠重写测试或弱化断言来达成
- **AND** `chunks-list-view.interaction.test.tsx` / `chunks-page-sheets.interaction.test.tsx` / `chunks-quick-add-related-sheet.test.tsx` MUST 继续通过
- **AND** 抽出的 `chunks-page-focus-detail-section.tsx` MUST 在 DOM 输出上保持字节级兼容（相同的 `<section>` 嵌套 / `className` / `aria-label` / `data-testid`）
- **AND** 3 个新 hook MUST 各自带专属单测，验证 loading / 成功 / 失败路径以及关键 handler 引用稳定性

#### Scenario: chunks/page.tsx 第三轮拆分后允许进入第四轮的前置条件
- **WHEN** 维护者计划在本轮 r3 之后启动第四轮（拆 chunks-list-view.tsx 868 行内嵌 sub-component 或 chunks-page-sheets.tsx 449 行）
- **THEN** 系统 MUST 要求本轮 r3 已完成 LoC 量化（page.tsx 应降到 ≤ ~1700 行）作为前置依据
- **AND** r4 不得在 r3 仍开放时启动，避免拆分范围混叠
