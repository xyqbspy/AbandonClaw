## Why

当前 `review` 页对“待复习表达来自哪里、是否要求场景已完成、原场景失效时如何降级”缺少稳定契约。代码现状是普通表达复习直接来自 `user_phrases` 的待复习项，但页面又暴露了“查看原场景”入口，导致当历史 `sourceSceneSlug` 已失效时，用户会直接落到“场景不存在”，同时团队也缺少一份专门的维护文档来解释这些关系。

## What Changes

- 明确 `review` 普通表达复习的数据来源规则，写清它来自“已保存且到期的表达”，而不是默认来自“已完成场景”。
- 定义 `review` 页“查看原场景”入口的稳定行为，包括来源场景可访问、不可访问、为空时的展示与降级策略。
- 为 `review` 页补充专项维护文档，梳理前端展示数据、后端查询、来源字段、场景关系和跳转兜底规则。
- 约束后续若要把 `review` 来源改成“仅已完成场景”或引入更强过滤，必须作为显式行为变更处理，而不是在现有 bugfix 中隐式漂移。

## Capabilities

### New Capabilities
- `review-source-contract`: 约束 `review` 页面普通表达与场景回补的来源、场景关联和失效降级规则。

### Modified Capabilities
- `learning-loop-overview`: 补充 `review` 作为学习闭环入口时的数据来源解释和原场景跳转约束。
- `review-experience`: 明确“查看原场景”入口何时可用、何时降级，以及 TODO/空来源场景的展示规则。

## Impact

- 受影响代码主要在 `src/app/(app)/review/*`、`src/lib/server/review/service.ts`、`src/lib/server/scene/service.ts` 和相关 API/selector。
- 受影响文档包括新的 `review` 专项维护文档，以及对应 OpenSpec delta / 主 specs。
- 这次提案阶段不要求数据库迁移；是否需要后端查询增强取决于实施时选择的降级方式。
- 这次不会默认把 `review` 来源策略改成“仅已完成场景”，除非后续在 implementation 中被明确批准为行为变更。
