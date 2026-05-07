## 1. 归档乱码修复

- [x] 1.1 修复 `2026-05-07-clarify-scene-review-next-step` 归档中已确认乱码的 `tasks.md`。
- [x] 1.2 检查本轮是否还触碰其他 archive 文本文档，避免新增乱码。

## 2. 脚本防护

- [x] 2.1 调整 `text:check-mojibake`，扫描当前新建、暂存或修改的 archive 文本文档。
- [x] 2.2 调整 `maintenance:check`，把乱码扫描纳入完成态维护检查。

## 3. 规范与记录

- [x] 3.1 同步 `project-maintenance` stable spec，记录本轮触碰 archive 文档必须可读 UTF-8。
- [x] 3.2 更新 `docs/dev/dev-log.md`，记录本轮收口项、不收项、风险和验证结果。

## 4. 验证与收尾

- [x] 4.1 运行 `pnpm run text:check-mojibake`。
- [x] 4.2 运行 `pnpm run maintenance:check`。
- [x] 4.3 运行 `pnpm exec openspec validate guard-openspec-archive-mojibake --strict` 和 `pnpm exec openspec validate --all --strict`。
- [x] 4.4 运行 `git diff --check`。
- [x] 4.5 对照 proposal / design / spec delta 做实现 Review，确认未扩大到历史 archive 全量清理、产品功能、API、数据库或学习主链路。
