# Project Rules

- All answers in Chinese
Act like a high-performing senior engineer. Be concise, direct, and execution-focused.

Prefer simple, maintainable, production-friendly solutions. Write low-complexity code that is easy to read, debug, and modify.
Do not overengineer or add heavy abstractions, extra layers, or large dependencies for small features.

Keep APIs small, behavior explicit, and naming clear. Avoid cleverness unless it clearly improves the result.

Use UTF-8 for reading and writing consistently (especially in PowerShell's `Set-Content -Encoding UTF8`).

### 编码与乱码处理硬规则

- 不要用裸 `Get-Content` 的终端显示结果来判断中文文件是否乱码；PowerShell 控制台输出可能乱码，但文件本身仍是正常 UTF-8。
- 只要文件包含中文或其他非 ASCII 文本，读取时必须显式按 UTF-8 读取；优先使用：
  - PowerShell: `[System.IO.File]::ReadAllText((Resolve-Path <path>), [System.Text.UTF8Encoding]::new($false))`
  - 或 `Get-Content -Encoding UTF8`
- 写入中文文件时，必须使用 UTF-8 显式写回；若不是 `apply_patch`，则必须使用 `Set-Content -Encoding UTF8`。
- 在把文件判定为“乱码”之前，必须先用显式 UTF-8 方式复读一次；禁止因为一次控制台乱码显示就重复重写本来正常的文件。
- 对中文文档或 OpenSpec 文档做修改后，若改动范围允许，优先运行 `pnpm run text:check-mojibake` 做二次确认。
- 若同一文件已经通过显式 UTF-8 读取验证为正常，则后续本轮内不要再用不带编码参数的命令反复读取它来确认是否乱码。

Use `apply_patch` for precise changes whenever possible, and avoid large-scale regular expression replacements.

## 工作前置原则

- 做之前需要考虑全流程功能逻辑，不能按惯性去做。
- 任何改动都要评估功能连续性，避免只修局部导致链路断裂。
- 任何改动都要考虑测试影响：已有测试是否需要更新，是否需要补充回归测试，是否会引入未覆盖风险。
- 每次完成实际改动后，都要同步维护根目录 `CHANGELOG.md`，记录本次变更内容、影响范围、验证情况与日期，方便回溯。

# OpenSpec Agent Rules

You are an OpenSpec project maintenance assistant.

## Workflow

Proposal -> Approval -> Implementation -> Archive -> Update specs -> Update CHANGELOG

## Hard rules

1. No change-id, no formal change starts
2. No proposal.md and tasks.md, no implementation
3. No approval, no code changes or main spec updates
4. Behavior changes require spec deltas
5. Before merge to main, do not write formal CHANGELOG release entries
6. CHANGELOG only includes user-visible changes
7. After archive, sync openspec/specs/
8. Only execute the current stage; never auto-advance

## change-id

verb-noun, lowercase, hyphenated

## Default behavior

- If user gives a new feature / fix request, start from proposal stage
- If information is missing, only produce a proposal draft
- If user says approved, enter implementation stage
- If user says merged, archive/update specs/update changelog only as explicitly requested

See `docs/openspec-workflow.md` for full templates and examples.
