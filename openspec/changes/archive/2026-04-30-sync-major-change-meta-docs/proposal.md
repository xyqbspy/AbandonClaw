# 变更提案：较大改动同步产品与技术总览

## Status
draft

## Why
本轮 scenes 循环复习后台播放已经同步到 CHANGELOG、dev-log、音频 system-design 与 audio stable spec，但它属于用户可感知且技术链路较大的能力变化，也应该同步到 `docs/meta/product-overview.md` 与 `docs/meta/technical-overview.md`。否则后续对外介绍、技术说明或新模型读取项目时，会继续看到旧的产品与技术现状。

当前维护规则已有“较大改动必须同步 docs 现状文档”，但没有明确要求影响产品亮点、技术亮点或架构能力的变更必须同步 meta 层总览，容易漏掉这类高层文档。

## What Changes
- 将 scenes 循环复习后台播放同步到产品说明总览。
- 将 deterministic review pack、浏览器音频缓存和后台预准备同步到技术方案总览。
- 在 project-maintenance stable spec 中新增规则：较大用户能力、架构能力、缓存/播放链路、主链路体验或平台治理变化，必须同轮检查并同步产品与技术总览。
- 在接需求模板中增加 meta 文档同步检查项。

## Stability Closure
### In This Round
- 收口本轮音频后台播放能力没有进入 meta 产品/技术总览的问题。
- 收口后续较大改动只更新局部文档、漏更新高层总览的问题。

### Not In This Round
- 不重写整份产品总览或技术总览。
- 不清理历史 dev-log 和历史 archive。
- 不为 meta 文档同步新增自动脚本；先通过 stable spec 和模板约束。

### Risk Tracking
- 延后原因：全量重写会引入大量无关文档 churn。
- 风险记录位置：本 change、stable spec 和 dev-log。

## Scope
### In Scope
- `docs/meta/product-overview.md`
- `docs/meta/technical-overview.md`
- `docs/dev/change-intake-template.md`
- `openspec/specs/project-maintenance/spec.md`

### Out of Scope
- 业务代码。
- 音频播放实现再次调整。
- 全量文档重写或历史清理。

## Impact
影响的规范：project-maintenance。
影响的模块：meta 文档、维护规则、接需求模板。
是否涉及 API 变更：否。
是否涉及前端交互变化：否。
是否影响缓存策略：否，本轮仅记录现状。
是否影响测试基线：否。
兼容性：向后兼容。
风险点：规则过宽会增加小改动维护成本，因此限定为较大改动或高层现状变化。
