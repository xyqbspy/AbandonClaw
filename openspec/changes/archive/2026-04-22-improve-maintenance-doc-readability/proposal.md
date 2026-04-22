## Why

维护规则已经有 OpenSpec、收尾脚本和入口职责分层，但维护入口文档仍偏长：新任务开始时容易从 `docs/dev/project-maintenance-playbook.md` 读到大量模块说明、历史经验和执行细节，Fast Track 的实际阅读成本仍然偏高。

本轮把“文档可读性”作为单独收口项处理：不新增业务能力，不重写全仓文档，只让维护入口更像入口，详细规则继续留给 stable spec 和专项文档。

## What Changes

- 重排 `docs/dev/README.md`，把“先看哪一个文件”压缩为短路径，减少重复解释。
- 精简 `docs/dev/change-intake-template.md`，保留任务分流、上下文预算、稳定性收口和收尾判断的填写骨架。
- 给 `docs/dev/project-maintenance-playbook.md` 增加“快速入口”和“深读边界”，把它从默认必读长文改成按风险选择阅读。
- 同步 `project-maintenance` stable spec，明确维护入口文档必须优先提供短路径、职责边界和深读触发条件。
- 更新 `docs/dev/dev-log.md`，记录本轮收口项、不收项和验证结果。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-maintenance`: 增加维护入口文档可读性要求，要求入口文档提供短路径、分层阅读边界和深读触发条件。

## Impact

- 影响文档：
  - `docs/dev/README.md`
  - `docs/dev/change-intake-template.md`
  - `docs/dev/project-maintenance-playbook.md`
  - `docs/dev/dev-log.md`
  - `openspec/specs/project-maintenance/spec.md`
- 影响 OpenSpec：
  - 新增并归档 `improve-maintenance-doc-readability`
  - 修改 `project-maintenance` stable spec
- 不影响业务代码、API、数据库、缓存或 UI。

## Stability Closure

本轮收口：
- 维护入口可读性：入口文档先给短路径，再指向深读文档。
- Fast Track 阅读成本：小改动不再默认被引导去通读长 playbook。
- 规则去重：同一长规则不在 README / playbook / template 中重复展开。

明确不收：
- 不重写 `AGENTS.md`，它仍是外部注入的强约束入口。
- 不清理历史 archive、旧 proposal 或 dev-log 的全部历史记录。
- 不重排业务模块文档，如 scene / review / chunks 等专项文档。
- 不做自动中文乱码修复器，本轮只保证改动后的入口文档为干净 UTF-8。

延后原因与风险记录：
- 历史文档体量大，混在本轮会把维护入口收口变成全仓文档重写。
- 剩余风险记录在本 change 的 `design.md`、`tasks.md` 和 `docs/dev/dev-log.md`。
