## Status

implementation

## Implementation

- [x] 盘点当前 `review` 页面普通表达复习、场景练习回补、session review、cache 刷新与下一题推进的完整链路。
- [x] 设计并落地新的 review 舞台模型，把普通复习与场景回补统一映射为阶段式 UI。
- [x] 参考 `newApphtml/review.html` 重构复习页主界面、进度区、主卡片、底部 CTA 与渐进 reveal 交互。
- [x] 为暂时缺少后端支持的交互定义 TODO 占位策略，并在 UI 与 selector 中明确标识。
- [x] 评估目标交互是否需要新增后端支持；本次实现复用现有 `review-api` 与 `learning-api`，未引入新的后端契约。
- [x] 收紧页面级 selector/helper 边界，把阶段文案、进度模型和来源提示从页面编排层抽离。

## Validation

- [x] 更新 `review-page-selectors` 单测，覆盖普通表达、场景回补、TODO 占位和主舞台映射。
- [x] 更新 `review/page.interaction.test.tsx`，覆盖阶段切换、参考展开、提交与下一题推进。
- [x] 评估 `features/review/components/*` 是否需要额外回归；本次改造集中在 `src/app/(app)/review/*`，未新增独立 review 组件。
- [x] 评估是否需要补后端与缓存刷新回归测试；因未新增后端契约，本次以页面交互测试覆盖缓存刷新与现有 API 调用链路。

## Documentation

- [x] 更新 change spec delta，明确新的复习页体验约束和 TODO 占位规则。
- [x] 确认实施阶段无需新增后端支持，因此无需回补 proposal / design / specs 的后端扩展计划。
