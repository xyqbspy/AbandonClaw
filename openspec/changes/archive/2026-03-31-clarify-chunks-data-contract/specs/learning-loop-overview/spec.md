## MODIFIED Requirements

### Requirement: Chunks 必须承担表达沉淀与整理职责
系统 MUST 允许用户把来自场景或手动录入的表达沉淀为可管理资产，并支持后续扩展、聚类、对比或复习组织，同时保证列表内容可以先展示缓存再继续刷新，不因缓存命中而长期隐藏服务端最新变化。系统 MUST 同时为 `chunks` 页面中的新建表达、同类/对照生成、关系保存、expression cluster 维护和复习入口提供稳定的数据契约，确保前端动作与后端保存、副作用统计和后续学习链路保持一致。

#### Scenario: 用户保存并整理表达
- **WHEN** 用户把一个表达加入个人资产
- **THEN** 该表达后续应能在 `chunks` 或相关详情流中继续被查看、补全、组织或加入复习
- **AND** `chunks` 列表在命中本地缓存时仍必须继续执行后端刷新
- **AND** 若服务端结果已变化，页面与本地缓存都必须更新到最新状态
- **AND** 若该动作同时涉及 relation、expression cluster、AI enrich、daily stats 或 review 入口，系统必须按稳定契约完成对应副作用
