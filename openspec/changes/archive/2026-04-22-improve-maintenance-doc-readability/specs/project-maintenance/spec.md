## ADDED Requirements

### Requirement: 维护入口文档必须提供短路径阅读入口
维护流程 MUST 让维护入口文档先提供可快速执行的短路径，再提供详细规则或深读入口，避免维护者在 Fast Track 或低风险 Cleanup 中默认通读长文档。

#### Scenario: 维护者处理 Fast Track 小改动
- **WHEN** 维护者进入 `docs/dev/README.md` 或 `docs/dev/change-intake-template.md`
- **THEN** 文档 MUST 在靠前位置提供 Fast Track 的最小阅读与收尾路径
- **AND** 文档不得要求维护者默认通读 `project-maintenance-playbook.md` 全文

#### Scenario: 维护者处理 Spec-Driven 变更
- **WHEN** 维护者判断任务属于 Spec-Driven
- **THEN** 文档 MUST 指向 proposal / design / spec / tasks / archive 的详细流程入口
- **AND** 文档 MUST 保留稳定性收口项和明确不收项的填写位置

### Requirement: 维护手册必须显式标注深读触发条件
维护手册 MUST 区分快速入口和深读内容，并明确只有在任务触发主链路、状态流、数据流、缓存、权限、稳定规则或完成态收尾时才需要继续深读对应章节。

#### Scenario: 维护者只处理局部文案或样式
- **WHEN** 本轮任务明确属于 Fast Track 且不改变业务语义
- **THEN** 维护手册 MUST 允许维护者只读取快速入口、相关文件和最小测试上下文
- **AND** 深读模块说明、OpenSpec 阶段细节或历史记录不得作为默认前置要求

#### Scenario: 维护者发现稳定性风险
- **WHEN** Fast Track 或 Cleanup 处理中暴露主链路、状态流、数据流、缓存、权限或稳定规则风险
- **THEN** 维护手册 MUST 指示维护者升级阅读范围并重新判断任务类型
