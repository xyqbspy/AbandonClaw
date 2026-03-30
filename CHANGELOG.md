# Changelog

本文件用于记录仓库内每次实际改动，方便回看变更范围、验证情况和潜在风险。

记录约定：

- 每次实际改动后都要追加一条记录
- 记录最少包含日期、摘要、影响范围、验证情况
- 如果未完成验证，要明确写出剩余风险

## 2026-03-30

### OpenSpec 初始化与维护规范落地

- 初始化了本地 OpenSpec 结构，新增 `openspec/` 与 `.codex/skills/openspec-*`
- 补充 `openspec/config.yaml` 项目上下文，写入技术栈、主闭环、测试约定与 changelog 规则
- 新增 OpenSpec 稳定规范：
  - `openspec/specs/project-maintenance/spec.md`
  - `openspec/specs/learning-loop-overview/spec.md`
- 新增维护文档 `docs/project-maintenance-playbook.md`，梳理项目主逻辑、目录职责、回归点和 OpenSpec 用法
- 更新 `AGENTS.md`，要求每次实际改动后同步维护 `CHANGELOG.md`
- 新增脚本：
  - `pnpm run spec:list`
  - `pnpm run spec:validate`
- 新建 OpenSpec change：
  - `openspec/changes/unify-detail-footer-actions/`
  - 包含 `proposal.md`、`design.md`、`tasks.md` 和 delta spec
- 为 `unify-detail-footer-actions` 补充了 `project-maintenance` 的 modified delta
- 在 `README.md` 增加了 OpenSpec 维护工作流入口说明
- 新增 `docs/openspec-workflow.md`，补充建 change、delta spec、validate、archive 的完整流程
- 为 `unify-detail-footer-actions` 新增 `archive-checklist.md`，补齐归档前检查清单
- 在 `docs/project-maintenance-playbook.md` 中补充 archive 前检查入口
- 已归档 `unify-detail-footer-actions`，主 specs 新增 `detail-footer-actions`
- 补充 `openspec/specs/detail-footer-actions/spec.md` 的正式 Purpose 说明

影响范围：

- 维护流程
- OpenSpec 使用方式
- 项目文档与团队协作规则

验证情况：

- 已执行 `openspec init --tools codex --force`
- 已执行 `pnpm run spec:list`
- 已执行 `pnpm run spec:validate`
- 已执行 `openspec change validate unify-detail-footer-actions --strict --no-interactive`
- 已执行 `openspec archive unify-detail-footer-actions --yes`

备注：

- 仓库中已有部分文档存在编码异常，本次新增维护文档已使用 UTF-8 单独落地，后续建议以新文档为准继续维护
