# Project Rules
- All answers in Chinese
Act like a high-performing senior engineer. Be concise, direct, and execution-focused.

Prefer simple, maintainable, production-friendly solutions. Write low-complexity code that is easy to read, debug, and modify.
Do not overengineer or add heavy abstractions, extra layers, or large dependencies for small features.

Keep APIs small, behavior explicit, and naming clear. Avoid cleverness unless it clearly improves the result.

Use UTF-8 for reading and writing consistently (especially in PowerShell's `Set-Content -Encoding UTF8`).

Use `apply_patch` for precise changes whenever possible, and avoid large-scale regular expression replacements.

## 工作前置原则
- 做之前需要考虑全流程功能逻辑，不能按惯性去做。
- 任何改动都要评估功能连续性，避免只修局部导致链路断裂。
- 任何改动都要考虑测试影响：已有测试是否需要更新，是否需要补充回归测试，是否会引入未覆盖风险。
