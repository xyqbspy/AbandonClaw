## ADDED Requirements

### Requirement: Docs 目录必须采用固定 taxonomy
系统 MUST 为项目文档采用固定的六层 taxonomy：`feature-map`、`feature-flows`、`domain-rules`、`system-design`、`dev`、`meta`。维护者在新增或迁移文档时，必须先判断文档语义属于哪一层，再决定目录与命名。

#### Scenario: 维护者新增一份文档
- **WHEN** 维护者需要新增模块说明、链路说明、规则说明、系统设计说明、开发规则或项目认知文档
- **THEN** 必须将该文档归入固定 taxonomy 下的对应目录
- **AND** 不得继续在 `docs/` 顶层散落同类文档
- **AND** 必须在 `docs/README.md` 或对应目录 README 中登记

### Requirement: Docs taxonomy 迁移时必须同步修正文档互链
系统 MUST 在迁移或重命名 docs 文件时，同步修正文档内互链、维护入口与规则入口，避免目录结构已经更新但路径引用仍停留在旧位置。

#### Scenario: 维护者重命名或迁移一份 docs 文件
- **WHEN** 一份已有文档从旧路径迁移到 taxonomy 下的新目录或采用新文件名
- **THEN** 必须同步修正所有直接引用该文档的入口说明与索引
- **AND** 不得留下继续指向旧路径的稳定入口
