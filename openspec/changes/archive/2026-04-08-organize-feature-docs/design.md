# 设计说明：organize-feature-docs

## Status

draft

## Current Situation

当前 docs 目录里已经同时存在：

- 顶层维护文档
  - `dev-log.md`
  - `testing-policy.md`
  - `project-maintenance-playbook.md`
- 模块 / 链路型文档
  - `feature-map/README.md`
  - `feature-flows/README.md`

但还没有真正固定“模块地图”和“功能链路”两层的目录结构。

## Decision

### 1. `feature-map` 只放模块地图

这个目录只回答“这个功能模块是什么、负责什么、边界在哪”。

首批固定为：

- `today.md`
- `scene.md`
- `session.md`
- `expression-item.md`
- `review.md`

### 2. `feature-flows` 只放关键链路

这个目录只回答“这条链路从哪里触发、怎样流转、怎样回写、怎样恢复或降级”。

首批固定为：

- `today-recommendation.md`
- `scene-training-flow.md`
- `session-resume.md`
- `review-writeback.md`

### 3. 顶层文档继续保留

以下文档不并入上述两个目录：

- `dev-log.md`
- `testing-policy.md`
- `project-maintenance-playbook.md`

它们分别承担：

- 开发日志
- 测试策略
- 维护入口

### 4. 不覆盖用户现有未提交内容

当前工作区里 `docs/feature-flows/` 已存在未提交内容，因此本次实施要：

- 复用已有 `README.md`
- 只补缺失文件
- 若发现与用户当前内容直接冲突，先停下来确认

## Risks

- 如果 `feature-map` 和 `feature-flows` 的边界写不清，后续文档还会继续混放
- 如果把顶层策略文档也塞进子目录，会让维护入口反而更分散
- 如果直接重写用户当前未提交 README，可能覆盖用户正在整理的内容

## Validation

- `docs/feature-map/` 和 `docs/feature-flows/` 必须形成完整固定结构
- README 必须说明各自目录职责和子文档索引
- `project-maintenance-playbook.md` 或相关入口文档必须能引导到这套结构
- 运行 `pnpm run text:check-mojibake`
