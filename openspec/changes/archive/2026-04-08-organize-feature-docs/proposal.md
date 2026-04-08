## Why

当前仓库已经开始引入 `docs/feature-map/`、`docs/feature-flows/`、`docs/dev-log.md`、`docs/testing-policy.md` 这类新的维护资产，但目录结构还没有固定下来。现在存在的问题是：

- `feature-map` 和 `feature-flows` 只有 README，子文档还没补齐
- 目录级索引、模块级说明、链路级说明还没有形成稳定层次
- 如果不先固定目录，后续文档会继续散落，AI 和维护者都容易把内容写到不一致的位置
- 当前工作区里 `docs/feature-flows/` 还是未提交状态，需要在不覆盖现有内容的前提下完成结构落位

这次希望把 docs 目录固定成一套可持续维护的结构：

- `feature-map/` 用于模块级功能地图
- `feature-flows/` 用于跨模块或核心行为链路

## What Changes

- 固定 `docs/feature-map/` 目录结构，并补齐：
  - `README.md`
  - `today.md`
  - `scene.md`
  - `session.md`
  - `expression-item.md`
  - `review.md`
- 固定 `docs/feature-flows/` 目录结构，并补齐：
  - `README.md`
  - `today-recommendation.md`
  - `scene-training-flow.md`
  - `session-resume.md`
  - `review-writeback.md`
- 在现有维护文档中补这些目录的入口和使用边界
- 保持 `dev-log.md`、`testing-policy.md` 继续作为并列顶层文档，不并入这两个目录

## Capabilities

### Modified Capabilities

- `project-maintenance`: 补充稳定的功能地图与功能链路文档目录结构

## Impact

- 受影响代码：
  - `docs/feature-map/*`
  - `docs/feature-flows/*`
  - `docs/project-maintenance-playbook.md`
  - `docs/testing-policy.md`
- 受影响链路：
  - 文档组织结构
  - 模块级理解路径
  - 主链路维护入口
