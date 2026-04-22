## 1. 自动检查脚本

- [x] 1.1 新增 `scripts/check-maintenance-guardrails.ts`，封装 OpenSpec 全量校验、active change 状态检查和 tasks 未完成检查。
- [x] 1.2 为脚本增加保守 CHANGELOG 提示：仅在当前分支为 `main` 且存在可能用户可感知文件变更时 warning。
- [x] 1.3 在 `package.json` 增加 `maintenance:check` 脚本入口。

## 2. 文档减重与入口提示

- [x] 2.1 更新 `docs/dev/change-intake-template.md`，增加 Fast Track / Cleanup / Spec-Driven 速查表。
- [x] 2.2 更新维护入口文档的职责边界说明，强调 AGENTS / docs README / stable spec / playbook / intake template 分工。
- [x] 2.3 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项和剩余风险。

## 3. 稳定规范同步

- [x] 3.1 将本轮新增维护检查和入口去重要求同步到 `openspec/specs/project-maintenance/spec.md`。
- [x] 3.2 检查本轮不收项已记录：历史乱码清理、全量文档重写、CI bot、业务流程变更。

## 4. 验证与收尾

- [x] 4.1 运行 `pnpm run maintenance:check`。
- [x] 4.2 运行 `pnpm exec openspec validate --all --strict`。
- [x] 4.3 运行 `pnpm run text:check-mojibake` 与 `git diff --check`。
- [x] 4.4 完成实现 Review，确认没有改业务代码、API、数据库或用户学习链路。
- [x] 4.5 完成 archive；本轮只改维护能力，不更新正式 `CHANGELOG.md`。
