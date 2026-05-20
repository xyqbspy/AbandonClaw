# 规范文档：feature-component-decomposition

## ADDED Requirements

### Requirement: chunks/page.tsx 第四轮拆分必须按"1 个高 props-cost view wrapper section"边界执行
系统 MUST 在对 `chunks/page.tsx` 进行第四轮拆分时，按以下边界推进：抽 `chunks-page-list-section.tsx`（ChunksListView 装配 wrapper，含原 page.tsx 顶部的 `reviewStatusLabel` 模块常量与 `extractExpressionsFromSentenceItem` helper 一并迁入）；不得借本轮顺手改变既有 17 个 hook 的 props 签名、不得动 `chunks-list-view.tsx` 与 `chunks-page-sheets.tsx` 内部实现、不得改变 spec 层业务语义。

#### Scenario: 推进 chunks/page.tsx 四轮拆分时的范围边界
- **GIVEN** 维护者准备推进 `chunks/page.tsx` 第四轮拆分
- **WHEN** 决定本轮拆分对象时
- **THEN** 维护者 MUST 把拆分范围限定为：抽 1 个 view wrapper section（`chunks-page-list-section.tsx`），承载 ChunksListView 完整装配 + `reviewStatusLabel` + `extractExpressionsFromSentenceItem`
- **AND** MUST NOT 动 `chunks-list-view.tsx` 与 `chunks-page-sheets.tsx` 的内部实现
- **AND** MUST NOT 改变既有 17 个 hook（`use-chunks-route-state` / `use-expression-cluster-actions` / `use-focus-assist` / `use-generated-similar-sheet` / `use-chunks-list-data` / `use-manual-expression-composer` / `use-manual-sentence-composer` / `use-saved-relations` / `use-focus-detail-controller` / `use-chunks-page-actions` / `use-builtin-phrases-data` / `use-builtin-phrases-actions` / `use-quick-add-related` / `use-detail-audio-actions` / `use-expression-map` / `use-sentence-expression-save` / `use-focus-relation-tab`）的 props 签名
- **AND** MUST NOT 改变 `chunks-data-contract` / `chunks-workbench-user-path` / `feature-component-decomposition` 三份 spec 的 Requirement
- **AND** MUST NOT 借本轮抽 ChunksListView 内部 sub-component（card / sentence card / similar list 等），这些留给后续 r5

#### Scenario: chunks 四轮拆分后的入口级回归
- **WHEN** 维护者完成本轮拆分（chunks-page-list-section）
- **THEN** `page.interaction.test.tsx` MUST 继续通过，不得依靠重写测试或弱化断言来达成
- **AND** `chunks-list-view.interaction.test.tsx` / `chunks-page-sheets.interaction.test.tsx` / `chunks-quick-add-related-sheet.test.tsx` MUST 继续通过
- **AND** 抽出的 `chunks-page-list-section.tsx` MUST 在 DOM 输出上保持字节级兼容（相同的外层 `<section className="space-y-4">` 嵌套、ChunksListView 的 41 字段 labels 闭包 / 18 handler props / appleSurfaceClassName / appleButtonClassName 透传完全一致）
- **AND** 新 section 自身**无独立单测**是允许的（纯装配组件，业务行为由 ChunksListView 已有测试与 page.interaction.test.tsx 共同覆盖），但 page.interaction.test.tsx 必须仍能覆盖 list view 入口链路

#### Scenario: chunks 四轮拆分的 LoC 实际结果与 r5 策略指导
- **GIVEN** 维护者完成 r4 拆分后准备评估 r5 策略
- **WHEN** 维护者观察 r4 实际 LoC 减幅（chunks/page.tsx 2108 → 2041 = -67 行，-3.2%）相比 r3（-23 行，-1.1%）的差异
- **THEN** 维护者 MUST 认识到"抽高 props-cost 子树 + 一并迁入与该子树强耦合的常量/helper"在 page.tsx 瘦身上效率约为"抽 state + 小 handler 组合"的 3 倍
- **AND** r5 范围 SHOULD 继续沿"高 props-cost 子树"方向，候选包括：`<FocusDetailSheet>` 装配（chunks-page-sheets 内）、其它 50+ 行 props 列表的子组件调用
- **AND** r5 启动前 SHOULD 先量化候选抽离对象的 props 行数与该对象关联的"page.tsx 顶部常量/helper"行数之和，确保有显著减幅
- **AND** r5 SHOULD NOT 再回头抽小 hook 组合（r3 已证明此类抽离的 page.tsx 瘦身效率极低）
