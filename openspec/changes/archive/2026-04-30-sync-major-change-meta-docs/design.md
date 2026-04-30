# 设计说明：较大改动同步产品与技术总览

## Status
draft

## Current Flow
当前较大改动会按 `docs/README.md` 定位并同步 feature-flow、system-design、stable spec、CHANGELOG 或 dev-log。但 meta 层产品总览和技术总览不一定会被纳入收尾检查。

## Problem
- 用户可感知能力变化如果只写 CHANGELOG，产品总览会滞后。
- 技术链路变化如果只写 system-design，技术总览会滞后。
- 新模型或新维护者常从 meta 文档快速建立认知，meta 滞后会造成项目现状误读。

## Stability Closure
### In This Round
- 把 scenes 循环复习后台播放写入产品和技术总览。
- 把 meta 文档同步要求写入 stable spec。
- 把接需求模板补上 meta 同步判断。

### Not In This Round
- 不新增脚本自动判断 meta 是否应更新。
- 不重写完整 meta 文档结构。

## Decision
规则采用“触发条件 + 允许不更新但必须说明”的方式：

- 若变更影响产品亮点、用户可感知能力、主链路体验、架构能力、缓存/播放链路、平台治理或对外技术介绍，必须检查 `docs/meta/product-overview.md` 与 `docs/meta/technical-overview.md`。
- 若检查后确认不影响 meta 层描述，可以在最终说明或 dev-log 中写明无需更新原因。
- Fast Track 小修不默认触发 meta 同步。

## Risks
- 风险 1：过度维护导致小改动成本上升。
- 缓解：只对较大或高层现状变化触发。
- 风险 2：meta 文档和专项文档重复过多细节。
- 缓解：meta 只写产品/技术总览，细节继续放 system-design、feature-flow 或 stable spec。

## Validation
- OpenSpec validate 单 change 与全量校验。
- `pnpm run maintenance:check`。
- `git diff --check`。
