## Why

当前归档后的 OpenSpec 文档可能出现乱码，但 `text:check-mojibake` 对 `openspec/changes/archive/` 整体跳过，导致完成态检查给出“通过”的假象。归档是后续追溯业务与维护决策的证据链，必须至少保证本轮新建或修改的归档产物可读。

## What Changes

- 修复 `2026-05-07-clarify-scene-review-next-step` 归档中的乱码 `tasks.md`。
- 调整 `text:check-mojibake`：常规扫描仍覆盖核心目录，同时额外扫描当前工作区、暂存区和未跟踪文件中被新建或修改的 archive 文本文档。
- 调整 `maintenance:check`：完成态维护检查中纳入乱码扫描，避免 OpenSpec 校验通过但文本不可读。
- 同步 `project-maintenance` stable spec，明确归档产物的 UTF-8 可读性和本轮触碰 archive 的检查要求。
- 不全量清理历史 archive 目录，避免把历史遗留文档修复扩大成本轮主题之外。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `project-maintenance`：完成态维护检查必须覆盖本轮新建或修改的 OpenSpec archive 文本文档，防止乱码归档进入完成态。

## Impact

- 影响脚本：`scripts/check-mojibake.ts`、`scripts/check-maintenance-guardrails.ts`。
- 影响规范：`openspec/specs/project-maintenance/spec.md`。
- 影响归档：修复当前已发现的 `openspec/changes/archive/2026-05-07-clarify-scene-review-next-step/tasks.md`。
- 不影响产品页面、API、数据库、缓存、学习状态流或用户学习主链路。
