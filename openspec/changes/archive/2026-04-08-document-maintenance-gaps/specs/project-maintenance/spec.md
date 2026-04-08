## ADDED Requirements

### Requirement: 高维护成本页面必须有专项维护文档入口
系统 MUST 为已经承接稳定用户功能、但同时包含聚合字段解释、缓存 / 预热 / 回退策略或复杂详情交互的高维护成本页面提供专项维护文档入口。至少应覆盖 `scenes` 列表进入链路、`progress` 学习概览聚合，以及 `chunks` 的 focus detail / expression map 维护说明。

#### Scenario: 维护者需要调整 scenes、progress 或 chunks 详情链路
- **WHEN** 维护者需要修改 `scenes/page.tsx`、`progress/page.tsx` 或 `chunks` 的 focus detail / expression map
- **THEN** 仓库中必须存在对应的专项维护文档
- **AND** 文档必须说明关键状态来源、主要动作链路、失败回退和回归点
- **AND** `docs/project-maintenance-playbook.md` 必须能直接指向这些文档入口
