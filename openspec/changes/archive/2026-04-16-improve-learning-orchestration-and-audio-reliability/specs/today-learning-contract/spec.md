## ADDED Requirements

### Requirement: Today 任务优先级必须可解释且稳定
系统 MUST 为 `today` 页面定义稳定的任务优先级规则，明确 continue learning、review、其他今日任务与兜底入口之间的排序顺序，并确保同一组后端学习状态在没有新输入时得到一致的首页任务编排结果。

#### Scenario: 同一学习状态重复进入 today
- **WHEN** 用户在学习状态未发生新变化的情况下重复进入 `today`
- **THEN** 系统 MUST 给出一致的首要任务类型与排序结果
- **AND** 不得因临时前端状态或偶发缓存顺序变化而改变首要推荐

### Requirement: Today 首要任务必须提供来源解释
系统 MUST 为 `today` 首要任务提供可追溯的解释文案来源，解释内容必须绑定到稳定的学习聚合字段或任务状态，而不是直接依赖瞬时页面状态。

#### Scenario: 首要任务来自 continue learning
- **WHEN** `today` 将 continue learning 作为首要任务展示
- **THEN** 系统 MUST 提供基于稳定学习状态的解释文案
- **AND** 解释必须能够区分“继续上次中断内容”与“开始新的今日任务”

#### Scenario: 首要任务来自 review
- **WHEN** `today` 将 review 作为首要任务展示
- **THEN** 系统 MUST 提供基于 review 聚合结果的解释文案
- **AND** 不得直接暴露临时训练事件或页面内部状态作为解释来源
