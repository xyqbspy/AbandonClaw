## Context

项目当前存在两套底部详情动作区：

- `SelectionDetailSheet` 面向 lesson 阅读中的短语详情
- `FocusDetailSheet` 面向 chunks 资产详情

虽然它们都属于学习闭环中的详情页脚，但来源不同、演进不同，导致 footer spacing 和主操作表现不稳定。近期实际调整中，已经确认应以原有“加入复习” footer 的 `p-4` 作为统一基准，同时保留“加入复习”按钮带 icon 的表达。

## Goals / Non-Goals

**Goals:**

- 明确两套 detail footer 的 spacing 基准一致
- 明确“加入复习”类主动作按钮的 icon 表达
- 把这次已有改动沉淀成可验证的 change 文档
- 降低后续维护者在相近 detail footer 上重复决策的成本

**Non-Goals:**

- 不重构全部 detail sheet 体系
- 不统一所有页面的 footer 视觉
- 不改动 review、today、scene 其他无关 CTA 的视觉语言

## Decisions

1. `SelectionDetailSheet` 与 `FocusDetailSheet` 的 footer 都以 `p-4` 作为当前统一基准。
2. `SelectionDetailActions` 作为 lesson 详情动作入口，负责封装按钮样式和 icon，减少 `selection-detail-sheet.tsx` 内联 UI。
3. 只对当前已确认的行为建立 capability spec，不提前扩展到其他 CTA 体系，避免规范过大。
4. 这次 change 同时作为“如何用 OpenSpec 维护已有 UI 细节约定”的示例。

## Risks / Trade-offs

- 统一到 `p-4` 是当前已确认基准，但未来如果出现安全区更敏感的底部场景，可能还需要分离更细的 token。
- lesson detail 与 chunks detail 在视觉上更接近后，后续改动如果只修一边，容易再次漂移，因此需要依靠 spec 和 changelog 持续约束。
