## ADDED Requirements

### Requirement: 完成态维护检查必须可通过本地脚本执行
维护流程 MUST 提供一个本地可运行的维护检查入口，用于在完成态提交前发现常见 OpenSpec 和发布收尾遗漏。

#### Scenario: 存在 completed 但未归档的 active change
- **WHEN** 维护者运行完成态维护检查
- **AND** `openspec list --json` 返回 status 为 complete 的 active change
- **THEN** 检查 MUST 报告该 change 仍需 archive

#### Scenario: active change 仍有未完成任务
- **WHEN** 维护者运行完成态维护检查
- **AND** 某个 active change 的 `tasks.md` 中仍存在 `- [ ]`
- **THEN** 检查 MUST 报告该 change 仍有未完成任务

#### Scenario: OpenSpec 全量校验失败
- **WHEN** 维护者运行完成态维护检查
- **AND** `openspec validate --all --strict` 失败
- **THEN** 检查 MUST 失败并保留原始校验输出

### Requirement: 维护入口文档必须避免重复承载同一长规则
维护流程 MUST 保持 AGENTS、文档索引、stable spec、维护手册和接入模板之间的职责分层，避免多个入口重复展开同一长规则。

#### Scenario: 维护者需要判断任务类型
- **WHEN** 维护者阅读接需求入口
- **THEN** 文档 MUST 提供 Fast Track / Cleanup / Spec-Driven 的最小速查
- **AND** 详细流程 MUST 指向维护手册或 stable spec，而不是在多个入口重复展开

#### Scenario: 维护者需要确认长期稳定约束
- **WHEN** 维护者需要确认一条维护规则是否属于长期契约
- **THEN** 文档 MUST 指向 `openspec/specs/project-maintenance/spec.md`
- **AND** 不得要求维护者同时从多个入口拼接同一条规则

### Requirement: CHANGELOG 条件检查必须保守提示而非替代人工判断
维护检查 MUST 对当前分支为 `main` 且存在可能用户可感知文件变更的情况给出 CHANGELOG 保守提示，但不得把这种提示伪装成完整语义判断。

#### Scenario: main 分支存在可能用户可感知的变更
- **WHEN** 维护者运行完成态维护检查
- **AND** 当前分支为 `main`
- **AND** 工作区存在可能影响用户行为的文件变更
- **THEN** 检查 SHOULD 提示维护者确认是否需要更新 `CHANGELOG.md`
- **AND** 该提示不得替代维护者对“是否用户可感知”的最终判断
