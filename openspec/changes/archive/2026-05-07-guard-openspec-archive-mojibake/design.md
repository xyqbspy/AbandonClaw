## Context

`text:check-mojibake` 当前扫描 `src`、`scripts`、`docs`、`openspec` 和部分根文件，但通过 `IGNORED_RELATIVE_PREFIXES` 跳过了 `openspec/changes/archive/`。这可以避免历史 archive 遗留问题阻塞日常开发，却也让新归档或本轮修改的 archive 文档没有任何自动防护。

`maintenance:check` 当前只封装 OpenSpec validate、active change 收尾状态和 CHANGELOG 保守提示，不会主动运行乱码检查。因此即使完成态要求人工跑 `text:check-mojibake`，脚本入口仍不能自己兜住这类问题。

## Goals / Non-Goals

**Goals:**

- 本轮新建、暂存、修改或未跟踪的 archive 文本文档必须参与乱码检查。
- `maintenance:check` 必须把乱码扫描作为完成态检查的一部分。
- 修复当前已发现的归档乱码文件，恢复可读 UTF-8。
- stable spec 明确记录这条长期维护约束。

**Non-Goals:**

- 不扫描并修复全部历史 archive。
- 不引入新的编码检测依赖。
- 不改变 OpenSpec CLI 的归档行为。
- 不改变产品功能、学习主链路、数据库或 API。

## Decisions

1. 采用“常规目录全量扫描 + 当前触碰 archive 文件扫描”的策略。

   原因：直接全量扫描历史 archive 会把旧遗留问题一次性暴露出来，容易扩大范围；继续完全跳过 archive 又无法防止新乱码。通过 `git diff --name-only`、`git diff --name-only --cached` 和 `git ls-files --others --exclude-standard` 收集当前触碰的 archive 文本文档，可以覆盖本轮新建、暂存和修改产物。

2. `maintenance:check` 直接调用 `scripts/check-mojibake.ts`。

   原因：完成态检查需要一个可执行入口承接稳定规则，而不是只依赖人工记忆。脚本直接调用可复用现有检查逻辑，也避免维护两套乱码规则。

3. 当前只修复已确认乱码的归档 `tasks.md`。

   原因：用户当前发现的问题集中在该归档文件；历史 archive 中可能还存在旧乱码，但不应在本轮无边界清理。后续若触碰旧 archive，新规则会覆盖对应文件。

## Risks / Trade-offs

- 历史 archive 中未触碰的乱码不会被本轮自动发现。缓解：stable spec 明确这是“本轮新建或修改 archive”检查，历史清理可单独开 change。
- 乱码模式无法覆盖所有编码损坏。缓解：沿用高置信度片段策略，避免误报过多；若后续发现新模式，再按最小范围补充模式。
- `maintenance:check` 会多跑一次文本扫描。缓解：扫描范围小，且完成态检查本来就偏收尾质量门。
