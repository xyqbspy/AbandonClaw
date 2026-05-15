## ADDED Requirements

### Requirement: Chunks 顶层必须同时承接我的表达与必备表达
系统 MUST 让 `Chunks` 页面同时承接“个人表达资产工作台”和“系统内置高频表达库”两个入口，而不能只把新用户直接丢到空的用户资产列表。

#### Scenario: 新用户首次进入 Chunks
- **WHEN** 用户尚未保存任何个人表达
- **THEN** 页面 MUST 保留“我的表达”入口
- **AND** 页面 MUST 同时提供“必备表达”入口，让用户能立即浏览值得长期掌握的高频表达
- **AND** 不得把空页面渲染成纯后台式列表

### Requirement: 必备表达视图必须优先展示高频表达卡片与明确保存动作
系统 MUST 让“必备表达”更像高频表达库，而不是数据库表格。每张卡片至少需要展示英文表达、中文解释、来源 scene、level/category 与明确保存按钮。

#### Scenario: 用户浏览必备表达
- **WHEN** 用户停留在“必备表达”视图
- **THEN** 每个 expression card MUST 展示英文表达、中文解释、来源 scene、level badge、category badge 与保存 CTA
- **AND** 保存成功后按钮 MUST 切换到“已保存”或等价已加入复习状态

### Requirement: 必备表达视图必须支持移动端优先筛选与安全降级
系统 MUST 为“必备表达”提供移动端可用的最小筛选能力，并在缺少 builtin phrase 或 starter 数据时安全降级。

#### Scenario: 用户按 level 或 category 筛选必备表达
- **WHEN** 用户在“必备表达”切换 level 或 category
- **THEN** 系统 MUST 基于真实 builtin/core phrase 数据筛选结果
- **AND** 不得依赖硬编码 mock 卡片

#### Scenario: 系统没有可用 builtin/core phrase
- **WHEN** 当前环境没有 starter scene 或 builtin/core phrase 数据
- **THEN** “必备表达”视图 MUST 显示友好空状态
- **AND** 页面 MUST 继续允许用户返回“我的表达”或前往 `/scenes`
