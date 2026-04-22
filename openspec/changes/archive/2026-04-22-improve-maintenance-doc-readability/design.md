## Context

当前维护规则体系已经有四层入口：

- `AGENTS.md`：强制执行规则。
- `docs/README.md`：文档定位入口。
- `docs/dev/README.md` 与 `project-maintenance-playbook.md`：维护流程入口和执行说明。
- `openspec/specs/project-maintenance/spec.md`：长期稳定契约。

上一轮已经补了 `maintenance:check` 和入口职责边界，但实际阅读体验仍有两个问题：

- `project-maintenance-playbook.md` 同时包含项目概览、模块维护重点、工程约定、OpenSpec 流程和上下文预算，容易被当成默认必读长文。
- `change-intake-template.md` 更像完整问卷，缺少“短填版”，Fast Track 的接入成本仍偏高。

## Goals / Non-Goals

**Goals:**

- 让 `docs/dev/README.md` 在首屏内回答“我现在该看哪个文档”。
- 让 `change-intake-template.md` 先给最小填写块，再把详细检查作为补充。
- 让 `project-maintenance-playbook.md` 明确哪些内容是快速入口，哪些内容只在深读触发时阅读。
- 把入口文档可读性沉淀为 `project-maintenance` stable spec。

**Non-Goals:**

- 不重写 `AGENTS.md`。
- 不改业务模块文档结构。
- 不清理历史 archive、旧 proposal 或整段 dev-log。
- 不新增文档生成工具或格式化工具。
- 不改变 Fast Track / Cleanup / Spec-Driven 的语义，只降低入口阅读成本。

## Decisions

### Decision 1: 入口文档先给短路径，再给详细说明

`docs/dev/README.md` 应保留目录导航职责。首屏只回答三件事：

- Fast Track 看哪里。
- Spec-Driven 看哪里。
- 收尾检查跑什么命令。

详细规则继续指向 `project-maintenance-playbook.md` 和 stable spec，不在 README 中重复展开。

替代方案：把 README 改成完整手册。放弃原因是会重新制造重复入口。

### Decision 2: intake template 增加“最小填写块”

`change-intake-template.md` 保留详细问题，但顶部先提供 9 行左右的最小填写块：

- 任务分类
- 问题定位
- 影响模块
- 是否影响主链路
- 最小方案
- 风险范围
- 最小测试
- 文档更新
- 本轮收口/不收项

替代方案：删除详细问题，只保留短块。放弃原因是复杂 Spec-Driven 仍需要完整问题骨架。

### Decision 3: playbook 标注深读触发条件，而不是删掉模块说明

`project-maintenance-playbook.md` 中的模块说明对新维护者仍有价值，但不应成为小改动默认上下文。最小做法是在顶部加入：

- 快速路径
- 深读触发条件
- 明确 Fast Track 不需要通读全文

替代方案：拆分 playbook 为多个文件。放弃原因是本轮目标是可读性收口，不做目录级重构。

## Risks / Trade-offs

- 入口过短可能漏掉关键规则 → README 只做导航，稳定规则仍回指 stable spec 和 playbook。
- 保留详细问题会继续显得长 → 顶部短块作为默认入口，详细问题只在非微小变更使用。
- 不清理历史乱码会继续影响旧段落阅读 → 本轮只处理维护入口的新增/重排内容；历史乱码风险记录到 dev-log。

## Stability Closure

本轮收口：
- 维护入口首屏可读性。
- Fast Track 最小阅读路径。
- intake template 的短填入口。

明确不收：
- 历史文档全量乱码清理。
- 业务文档重排。
- 文档自动化格式工具。

风险记录位置：
- `docs/dev/dev-log.md`
- 本 change 的 `tasks.md`
