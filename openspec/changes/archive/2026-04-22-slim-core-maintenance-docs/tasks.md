## 1. 核心入口瘦身

- [x] 1.1 精简 `AGENTS.md`，只保留强约束、任务分流、修改前输出、OpenSpec 红线、测试/文档/提交约束。
- [x] 1.2 重写 `docs/README.md` 为干净 UTF-8 短入口，保留文档分层、最小阅读路径和常见 capability 映射。
- [x] 1.3 更新 `docs/dev/project-maintenance-playbook.md`，承接从 `AGENTS.md` 移出的执行细则入口。
- [x] 1.4 清理 `CHANGELOG.md` 顶部近期记录可读性，确认不写入过程性维护记录。

## 2. 规则同步与记录

- [x] 2.1 将 AGENTS 瘦身和核心文档可读性要求同步到 `openspec/specs/project-maintenance/spec.md`。
- [x] 2.2 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项、风险和验证结果。
- [x] 2.3 确认本轮不改业务代码、API、数据库、缓存或用户学习链路。

## 3. 验证与收尾

- [x] 3.1 运行 `pnpm exec openspec validate slim-core-maintenance-docs --strict`。
- [x] 3.2 运行 `pnpm exec openspec validate --all --strict`。
- [x] 3.3 运行 `pnpm run text:check-mojibake`、`git diff --check` 和 `pnpm run maintenance:check`。
- [x] 3.4 完成实现 Review，确认 proposal / design / spec / tasks 一致。
- [x] 3.5 完成 archive，归档后确认 active changes 为空。
