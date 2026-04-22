## Context

当前维护体系已经拆出：

- `AGENTS.md`：项目根规则入口。
- `docs/README.md`：文档定位入口。
- `docs/dev/README.md`：维护流程入口。
- `docs/dev/project-maintenance-playbook.md`：日常维护手册。
- `openspec/specs/project-maintenance/spec.md`：长期稳定契约。

问题是 `AGENTS.md` 仍像完整手册，重复包含 Fast Track、OpenSpec、文档、测试、CHANGELOG、git、review、上下文预算等细节。这样会让核心入口过重，也让 dev 文档的职责变模糊。

## Goals / Non-Goals

**Goals:**

- `AGENTS.md` 只保留强约束和必须执行的红线。
- `docs/README.md` 用短表表达文档分层和常见查找路径。
- `project-maintenance-playbook.md` 承接被 AGENTS 移出的执行细节。
- `CHANGELOG.md` 清理成正式发布记录，保留用户可感知变化。
- 本轮改动仍可由 OpenSpec 和维护检查脚本完整收尾。

**Non-Goals:**

- 不改变业务行为。
- 不改 API、数据库、缓存、测试链路。
- 不清理所有历史归档文档。
- 不把 CHANGELOG 变成 dev-log。

## Decisions

### Decision 1: AGENTS 只保留强约束

AGENTS 保留：

- 所有输出中文。
- 任务分类和升级规则。
- 修改前必须输出的问题分析。
- 文档阅读入口顺序。
- OpenSpec 完成态红线。
- apply_patch / 不误改用户变更 / 最小测试 / 文档同步 / git 提交规则。

AGENTS 移出：

- 详细 OpenSpec 阶段说明。
- 长篇测试失败处理细则。
- 详细文档分类说明。
- 上下文预算细则。
- 完成态 Review 详细清单。

这些细节由 `docs/dev/project-maintenance-playbook.md` 和 stable spec 承接。

### Decision 2: docs/README 只做定位，不做长规范

`docs/README.md` 改为：

- 文档分层短表。
- 常见问题最小入口。
- 阅读规则。
- 禁止事项。

详细模块说明留在各子目录 README 或专项文档。

### Decision 3: CHANGELOG 保守清理

只清理顶部近期记录的可读性，不把历史所有记录重写为新文案。正式 CHANGELOG 仍只记录用户可感知变化。

## Risks / Trade-offs

- AGENTS 变短可能让某些细节不在首屏出现 → 通过 dev 文档和 stable spec 承接，并在 AGENTS 指向入口。
- 重写 docs/README 可能遗漏少量历史提示 → 保留常见 capability 映射，详细内容仍可由 `rg` 和子目录索引查找。
- CHANGELOG 清理过度可能改变发布记录语义 → 只整理可读性，不删除用户可感知条目。

## Stability Closure

本轮收口：
- 强约束入口瘦身。
- 核心阅读入口清晰化。
- CHANGELOG 与 dev-log 边界再确认。

明确不收：
- 全仓历史文档清理。
- 所有乱码显示问题自动化治理。
- 业务专项文档重排。
