## Context

当前维护体系已经覆盖任务分流、文档阅读、OpenSpec、测试、CHANGELOG、上下文预算和完成态 Review。最近连续两个收尾暴露出同一类问题：规则本身写清楚了，但完成态动作仍需要人工记忆，尤其是 active change 归档、stable spec 同步、CHANGELOG 条件和 OpenSpec 全量校验。

本轮不是增加更多业务规则，而是把高频收尾检查做成可运行入口，并把入口文档的职责再压清楚，减少 AI 和维护者在小改动里读太多上下文。

## Goals / Non-Goals

**Goals:**

- 提供一个本地维护检查脚本，完成态提交前能快速发现 OpenSpec 收尾遗漏。
- 给 `package.json` 增加清晰入口，避免每次手动拼命令。
- 在 change intake 模板增加任务分流速查，降低 Fast Track 误升级。
- 对维护入口做最小减重说明，避免 AGENTS、docs/README、playbook、stable spec 继续承载重复细则。
- 在 dev-log 记录本轮自动化检查边界和剩余风险。

**Non-Goals:**

- 不重写 AGENTS 或全部维护文档。
- 不清理历史乱码文档。
- 不建设 CI bot、PR comment 或远端检查服务。
- 不改变业务代码、测试基线、OpenSpec schema 或发布流程本身。

## Decisions

### 1. 使用本地脚本而不是 CI

本轮先新增 `scripts/check-maintenance-guardrails.ts`，由 `pnpm run maintenance:check` 调用。

理由：
- 不引入新依赖。
- 可在完成态提交前本地运行。
- 后续如果稳定，再接入 CI 不需要改规则语义。

备选方案：
- 直接写 CI：当前仓库没有统一 CI 配置，本轮会扩大范围。
- 只写文档提醒：无法减少人工遗漏。

### 2. 检查项聚焦高频收尾

脚本优先检查：
- `openspec validate --all --strict` 是否通过。
- `openspec list --json` 是否仍存在 completed active change。
- active change 的 `tasks.md` 是否还有 `- [ ]`。
- 当前分支为 `main` 且存在 staged/unstaged 用户可感知文件变更时，提示检查 `CHANGELOG.md`。

脚本不尝试自动判断所有“用户可感知”语义，只做保守提示。

### 3. 文档减重只改入口提示

本轮只在 `docs/dev/change-intake-template.md` 顶部增加速查表，并在维护入口文档中强调职责边界。避免大规模重写导致规则漂移。

## Risks / Trade-offs

- 脚本误报 CHANGELOG 风险 -> 只作为 warning，不阻断。
- 脚本调用 OpenSpec 较慢 -> 作为完成态检查可接受，不放入每次小改动默认路径。
- 文档减重过少 -> 先收口入口提示，后续如果仍觉得厚，再单独做 Cleanup。

## Migration Plan

1. 新增脚本和 npm script。
2. 更新最小文档入口。
3. 补脚本验证。
4. 更新 dev-log。
5. 同步 stable spec 并归档 change。

Rollback：删除脚本和 npm script，回退文档入口补充即可，不影响业务运行。
