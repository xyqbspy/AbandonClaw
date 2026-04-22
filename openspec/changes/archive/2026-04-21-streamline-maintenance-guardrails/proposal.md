## Why

当前 OpenSpec 和维护规则已经足够完整，但收尾动作仍依赖人工记忆：completed change 可能停留在 `openspec/changes/`，stable spec / CHANGELOG / tasks 状态也需要维护者手动逐项确认。继续增加规则会加重阅读负担，下一步应把高频收尾风险自动化，并把入口文档的职责边界再压清楚。

## What Changes

- 新增一个轻量维护检查脚本，用于发现 completed-but-unarchived change、未完成 tasks、OpenSpec 校验失败和 main 上用户可感知变更的 CHANGELOG 风险提示。
- 在 `package.json` 增加维护检查入口，供完成态提交前直接运行。
- 更新维护入口文档，明确“AGENTS 只放强约束，细节回到 dev 文档 / stable spec / playbook”，避免继续把同一规则复制到多个入口。
- 更新 `docs/dev/change-intake-template.md`，在顶部增加 Fast Track / Cleanup / Spec-Driven 速查表，降低小改动误套大流程的概率。
- 记录本轮不继续清理历史乱码文档、不重写全部维护文档、不引入复杂 CI。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `project-maintenance`: 增加维护检查脚本和规则入口去重约束，要求完成态前可用自动检查发现常见收尾遗漏。

## Impact

- 影响文件：`scripts/*`、`package.json`、`docs/dev/*`、`docs/README.md` 或 `AGENTS.md` 的最小入口说明、`openspec/specs/project-maintenance/spec.md`。
- 不影响业务页面、API、数据库、缓存和用户学习链路。
- 不新增外部依赖。
- 测试方式：脚本单测或直接运行维护检查脚本、`openspec validate --all --strict`、`text:check-mojibake`、`git diff --check`。

## Stability Closure

### In This Round

- 收口 completed change 未归档、tasks 未完成、OpenSpec 未校验这类高频收尾遗漏。
- 收口维护入口职责重复：AGENTS 放强制红线，docs/README 做定位，stable spec 放长期契约，playbook 放执行清单。
- 在接需求模板顶部补任务分流速查，降低 Fast Track 被过度升级的执行摩擦。

### Not In This Round

- 不重写全部历史维护文档：范围过大，容易引入语义漂移。
- 不系统清理历史乱码：这是独立可读性 cleanup，应单独做。
- 不建设完整 CI / PR bot：当前先提供本地脚本入口。
- 不修改业务流程、测试基线或发布策略本身。

### Risk Tracking

- 剩余风险记录在 `docs/dev/dev-log.md`。
- 如果后续发现脚本误报或漏报，再通过新的 Fast Track 或小型 Spec-Driven 调整检查规则。
