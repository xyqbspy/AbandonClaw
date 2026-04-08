## Why

当前仓库已经有 `today`、`review`、`scene practice`、`chunks data`、`audio tts` 等专项维护文档，但仍有几条高频维护链路没有独立文档承接。维护者现在只能直接读代码或翻测试，缺少一份可持续更新的说明来回答：

- `scenes` 列表页的缓存、预热、导入、生成、删除和侧滑手势是怎么串起来的
- `progress` 页展示的学习概览字段来自哪里，失败回退时如何降级
- `chunks` 的 focus detail 与 expression map 分别负责什么、从哪里取数、怎样与保存 / 补全 / 复习联动

这些区域都已经承担明确用户功能，但目前没有专项维护文档，后续继续改动时容易只盯局部页面，忽略缓存、回退、预热和下游联动。

## What Changes

- 新增 `scenes` 列表与进入链路专项维护文档
- 新增 `progress` 学习概览聚合专项维护文档
- 新增 `chunks` focus detail / expression map 专项维护文档
- 在项目维护手册中补这些新文档的入口，形成稳定阅读路径

## Capabilities

### Modified Capabilities

- `project-maintenance`: 维护文档覆盖范围扩展到 `scenes`、`progress`、`chunks focus detail / expression map`

## Impact

- 受影响代码：
  - `docs/project-maintenance-playbook.md`
  - `docs/scenes-entry-flow.md`
  - `docs/progress-overview-mapping.md`
  - `docs/chunks-focus-detail-map.md`
- 受影响链路：
  - scenes 列表与进入预热
  - progress 学习概览展示
  - chunks 详情浮层与表达地图维护
