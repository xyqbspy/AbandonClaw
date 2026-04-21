## ADDED Requirements

### Requirement: 维护流程必须按任务规模控制上下文预算
维护流程 MUST 按任务类型和风险等级控制阅读范围，避免在小改动中加载无关上下文，也避免在复杂变更中跳过必要的主链路、稳定规则或实现文档。

#### Scenario: 维护者处理 Fast Track 小改动
- **WHEN** 本轮改动明确属于 Fast Track，且不改变业务语义、主链路、状态流、数据流或稳定规则
- **THEN** 维护者 MUST 只读取入口规则、相关文件、必要索引和最小测试上下文
- **AND** 不得默认通读 feature-flows、domain-rules、system-design、OpenSpec archive 或 dev-log

#### Scenario: 维护者处理 Spec-Driven 变更
- **WHEN** 本轮改动属于 Spec-Driven Change
- **THEN** 维护者 MUST 先通过 `docs/README.md` 和相关索引定位上下文，再按 feature-flow、domain-rules、stable spec、system-design、代码的顺序递进阅读
- **AND** 不得用批量通读目录替代入口定位
- **AND** 若阅读历史 archive、旧 proposal 或 dev-log，只能作为历史参考，不得替代当前 stable spec 和维护文档

#### Scenario: 维护者发现主链路风险
- **WHEN** Fast Track 或 Cleanup 处理中暴露了主链路、状态流、数据流、缓存、权限或稳定规则风险
- **THEN** 维护者 MUST 补读对应链路文档、稳定规则和必要实现上下文
- **AND** 必须重新判断是否需要升级为 Spec-Driven Change

### Requirement: 维护入口之间必须保持上下文职责分层
项目维护规则 MUST 明确 AGENTS、文档索引、stable spec、维护手册和变更接入模板之间的职责，避免多个入口重复承载同一长规则导致智能体默认上下文膨胀。

#### Scenario: 智能体开始处理需求
- **WHEN** 智能体读取项目维护规则
- **THEN** `AGENTS.md` MUST 只提供入口级强约束和分流规则
- **AND** `docs/README.md` MUST 负责文档定位顺序
- **AND** `openspec/specs/project-maintenance/spec.md` MUST 负责长期稳定契约
- **AND** `docs/dev/project-maintenance-playbook.md` MUST 负责执行清单
- **AND** `docs/dev/change-intake-template.md` MUST 负责接需求阶段的问题分析骨架

### Requirement: 完成态 Review 必须检查上下文污染
Spec-Driven 完成态实现 Review MUST 检查本轮使用的上下文是否与任务范围匹配，避免无关历史材料、旧规则或跨模块噪音影响最终实现判断。

#### Scenario: 维护者准备完成态提交
- **WHEN** 维护者准备把 Spec-Driven Change 作为完成态提交或收尾提交
- **THEN** 实现 Review MUST 确认本轮关键依据来自当前 stable spec、维护文档、相关链路文档和实际代码
- **AND** 若引用历史 archive、旧 proposal 或 dev-log，必须确认其没有覆盖或替代当前稳定规则
- **AND** 若存在刻意未读取的相关上下文，必须记录原因、风险和后续入口
