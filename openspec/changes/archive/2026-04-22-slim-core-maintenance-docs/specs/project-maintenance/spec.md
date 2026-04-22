## ADDED Requirements

### Requirement: AGENTS 必须只承载强约束入口
维护流程 MUST 将 `AGENTS.md` 保持为强约束和任务分流入口，不得让它重复承载完整执行手册、OpenSpec 阶段细则或长篇文档维护说明。

#### Scenario: 维护者读取 AGENTS
- **WHEN** 维护者开始一次改动并读取 `AGENTS.md`
- **THEN** `AGENTS.md` MUST 提供任务分流、修改前检查、OpenSpec 红线、测试/文档/提交强约束
- **AND** 详细执行步骤 MUST 指向 `docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md` 或 stable spec

#### Scenario: 维护规则需要补充细节
- **WHEN** 新增的是执行清单、阶段说明、测试策略或文档维护细则
- **THEN** 该细节 MUST 优先写入 `docs/dev/*` 或 `openspec/specs/project-maintenance/spec.md`
- **AND** 不得默认继续扩写 `AGENTS.md`

### Requirement: 核心文档入口必须保持干净可读
维护流程 MUST 保持 `docs/README.md`、`docs/dev/project-maintenance-playbook.md` 和 `CHANGELOG.md` 的核心入口为可读 UTF-8 文档，避免核心入口被乱码、重复规则或过程性记录污染。

#### Scenario: 维护者定位文档
- **WHEN** 维护者打开 `docs/README.md`
- **THEN** 文档 MUST 先提供文档分层、最小阅读路径和常见入口
- **AND** 不得在入口页重复展开所有专项规则

#### Scenario: 维护者查看正式发布记录
- **WHEN** 维护者打开 `CHANGELOG.md`
- **THEN** 文档 MUST 只记录用户可感知变化
- **AND** 开发过程、验证记录或维护收口过程 MUST 记录到 `docs/dev/dev-log.md`
