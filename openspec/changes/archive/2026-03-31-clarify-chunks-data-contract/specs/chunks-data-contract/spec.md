## ADDED Requirements

### Requirement: Chunks 核心动作与后端数据写入必须可追踪
系统 MUST 为 `chunks` 页面定义稳定的数据契约，明确手动新建表达、句子提取表达、生成同类表达、生成对照表达、快速添加关系、expression cluster 操作和进入复习等动作分别会调用哪些接口、写入哪些后端数据，以及需要触发哪些页面刷新或缓存失效。

#### Scenario: 维护者追踪 chunks 动作副作用
- **WHEN** 维护者调整 `chunks` 页面任一核心动作
- **THEN** 必须能够通过契约或文档直接查到该动作对应的 API、service、数据写入和页面反馈
- **AND** 不得只修改局部页面行为而忽略 relation、cluster、review 或统计副作用

### Requirement: Similar / Contrast 保存语义必须稳定
系统 MUST 明确区分 `similar` 与 `contrast` 在保存表达时的后端语义，包括 relation 写入、cluster 同步、AI enrich 与 source note 的差异。

#### Scenario: 用户保存同类或对照表达
- **WHEN** 用户在 `chunks` 页面保存一个 similar 或 contrast 候选
- **THEN** 系统必须按关系类型写入稳定的 relation 语义
- **AND** similar 链路在需要时必须同步 expression cluster，而 contrast 不得被错误并入同类 cluster
- **AND** 页面反馈与后端数据副作用必须保持一致

### Requirement: Chunks 维护文档必须随数据语义变更同步
系统 MUST 把 chunks 数据映射文档视为需要维护的正式资产；凡是变更保存接口语义、relationType、expressionClusterId、AI enrich、副作用统计或 review 入口逻辑时，必须同步更新文档与回归测试。

#### Scenario: chunks 数据契约发生变化
- **WHEN** 任一影响 `chunks` 页面数据解释或副作用链路的字段、接口或聚合逻辑发生变化
- **THEN** 对应 change 必须同步更新 chunks 映射文档
- **AND** 对应测试必须覆盖更新后的保存、关系、cluster 和页面反馈结果
