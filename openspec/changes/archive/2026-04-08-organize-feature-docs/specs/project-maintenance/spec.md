## ADDED Requirements

### Requirement: 功能地图与功能链路文档必须有固定目录结构
系统 MUST 为模块地图与关键行为链路提供固定的 docs 目录结构，至少区分 `docs/feature-map/` 和 `docs/feature-flows/` 两层，并为每层提供 README 和稳定子文档索引。`feature-map` 用于描述模块目标、边界、输入输出与核心规则；`feature-flows` 用于描述入口、流转、回写、恢复和降级链路。

#### Scenario: 维护者新增或整理功能文档
- **WHEN** 维护者需要补充 Today、Scene、Session、Expression Item、Review 等模块说明，或补充 Today 推荐、Scene 训练、Session 恢复、Review 回写等链路说明
- **THEN** 必须写入固定目录结构下对应的子文档
- **AND** 不得继续把模块地图与链路说明散落在任意顶层 markdown 中
- **AND** 维护入口文档必须能指向这些目录与索引
