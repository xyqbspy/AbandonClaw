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

### Requirement: Today 页面数据来源与优先级必须可追踪
系统 MUST 在 `today` 页面中同时提供“当前为什么先做这一步”和“完成这一步后下一步是什么”的稳定解释，且这些解释必须绑定到已存在的学习聚合字段、任务状态或正式 review 摘要，而不能依赖前端临时状态或未落库的局部结果。

#### Scenario: today 展示首要任务后的下一步提示
- **WHEN** 用户在 `today` 页面查看当前首要任务
- **THEN** 系统 MUST 给出当前任务的来源解释
- **AND** 系统 MUST 给出完成当前任务后的下一步方向提示
- **AND** 这些说明 MUST 与现有任务排序结果一致

### Requirement: Today 页面必须记录后端学习态到展示态的映射
系统 MUST 允许 `today` 页面在不扩大学习证据边界的前提下，展示“今日进展摘要”或“刚完成一轮后的结果反馈”，但这些反馈只能消费稳定聚合字段，而不能把页面临时动作直接解释成正式学习完成。

#### Scenario: today 展示今日结果反馈
- **WHEN** 用户完成今日首要学习动作并返回 `today`
- **THEN** 页面 MAY 展示简洁的结果反馈或摘要
- **AND** 反馈内容 MUST 来自稳定聚合字段
- **AND** 不得把未正式回写的局部 UI 状态当作完成证据
