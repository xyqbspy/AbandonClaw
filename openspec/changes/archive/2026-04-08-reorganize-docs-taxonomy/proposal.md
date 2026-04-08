## Why

当前 `docs/` 目录已经逐步引入了 `feature-map`、`feature-flows`、维护手册、规则文档、系统设计文档等多种资产，但整体分层还不稳定，主要问题是：

- 同类文档仍散落在顶层，目录语义不统一
- 一部分文件名延续了早期的 `mapping / signals / generation` 命名，难以一眼判断它是规则、链路还是实现说明
- 后续新增文档时，维护者仍容易把“模块地图”“功能链路”“规则说明”“系统设计”混写到一起
- 已有 `feature-map / feature-flows` 目录还没有和其它文档形成完整 taxonony

这次希望把 `docs/` 固定成一套正式的分层结构，明确每类文档放在哪里、已有文件怎样迁移、哪些文件需要重命名。

## What Changes

- 固定 `docs/` 最终结构为：
  - `feature-map/`
  - `feature-flows/`
  - `domain-rules/`
  - `system-design/`
  - `dev/`
  - `meta/`
- 定义现有文档的迁移与重命名映射
- 规范各目录 README 与 docs 根索引的职责
- 要求后续新增文档必须按该 taxonomy 分类，避免重复语义文档继续增长

## Capabilities

### Modified Capabilities

- `project-maintenance`: 项目维护文档必须遵循固定的 docs 分层 taxonomy

## Impact

- 受影响代码：
  - `docs/README.md`
  - `docs/feature-map/*`
  - `docs/feature-flows/*`
  - `docs/domain-rules/*`
  - `docs/system-design/*`
  - `docs/dev/*`
  - `docs/meta/*`
  - `AGENTS.md`
  - 文档内所有互链路径
- 受影响链路：
  - 文档阅读路径
  - 文档维护规则
  - 新文档归类方式
