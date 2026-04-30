# 规范文档：project-maintenance

## ADDED Requirements

### Requirement: 较大改动必须同步产品与技术总览
当一轮改动改变用户可感知核心能力、产品亮点、主链路体验、架构能力、缓存/播放链路、平台治理能力或对外技术介绍口径时，维护流程 MUST 同轮检查并同步 `docs/meta/product-overview.md` 与 `docs/meta/technical-overview.md`。如果检查后确认 meta 层描述不受影响，维护者 MUST 在最终说明或 dev-log 中记录无需更新的原因。

#### Scenario: 用户可感知能力发生较大变化
- **WHEN** 本轮改动新增或显著改变一个用户可感知能力
- **THEN** 维护者必须检查产品总览是否需要更新当前亮点、关键能力、页面价值或产品边界
- **AND** 若需要，必须在同一轮更新 `docs/meta/product-overview.md`

#### Scenario: 技术链路或架构能力发生较大变化
- **WHEN** 本轮改动改变缓存策略、播放链路、数据流、服务端治理、预热策略或架构说明
- **THEN** 维护者必须检查技术总览是否需要更新技术亮点、优化项、典型方案或当前边界
- **AND** 若需要，必须在同一轮更新 `docs/meta/technical-overview.md`

#### Scenario: 改动属于微小局部修复
- **WHEN** 本轮改动明确属于 Fast Track 小修，且不改变产品现状或技术总览口径
- **THEN** 可以不更新 meta 文档
- **AND** 不得因此跳过受影响的专项文档同步判断
