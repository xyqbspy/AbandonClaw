## 1. 入口文档可读性

- [x] 1.1 重排 `docs/dev/README.md`，将维护入口压缩为短路径、职责边界和常用命令。
- [x] 1.2 重排 `docs/dev/change-intake-template.md`，在详细问题前增加最小填写块。
- [x] 1.3 更新 `docs/dev/project-maintenance-playbook.md`，增加快速入口和深读触发条件，明确 Fast Track 不默认通读全文。

## 2. 规则同步与记录

- [x] 2.1 将维护入口短路径和深读触发要求同步到 `openspec/specs/project-maintenance/spec.md`。
- [x] 2.2 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项、剩余风险和验证结果。
- [x] 2.3 确认本轮不更新正式 `CHANGELOG.md`：维护文档可读性不属于用户可感知产品变化。

## 3. 验证与收尾

- [x] 3.1 运行 `pnpm exec openspec validate improve-maintenance-doc-readability --strict`。
- [x] 3.2 运行 `pnpm exec openspec validate --all --strict`。
- [x] 3.3 运行 `pnpm run text:check-mojibake`、`git diff --check` 和 `pnpm run maintenance:check`。
- [x] 3.4 完成实现 Review，确认未改业务代码、API、数据库或用户学习链路。
- [x] 3.5 完成 archive，并在归档后再次确认 active changes 为空。
