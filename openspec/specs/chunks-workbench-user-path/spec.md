## Purpose
定义 Chunks 工作台的用户动作层级，确保表达资产的查看、复习、来源回流和句中表达提取优先于高级整理动作。

## Requirements

### Requirement: Chunks 工作台必须优先呈现表达资产使用主路径
系统 MUST 在 Chunks 工作台优先呈现表达资产查看、搜索/筛选、进入详情、开始或继续复习、回到来源场景等面向学习闭环的主动作。relation、cluster、expression map、AI 候选生成、移动、合并等高级整理动作不得与主路径同级竞争。

#### Scenario: 用户从表达列表进入常用动作
- **WHEN** 用户打开 Chunks 工作台并查看表达列表
- **THEN** 系统 MUST 让搜索/筛选、进入详情、开始或继续复习、来源场景回流保持直接可见或在当前表达条目的主动作中可达
- **AND** 系统 MUST 将高级整理动作放在详情上下文、更多操作或二级入口中

#### Scenario: 用户需要整理表达资产
- **WHEN** 用户需要查看 relation、cluster、expression map 或执行移动、合并等整理动作
- **THEN** 系统 MUST 从当前表达或详情上下文提供入口
- **AND** 系统 MUST 避免让整理动作抢占表达学习、复习和来源回流的主 CTA 位置

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

### Requirement: Sentence 条目必须使用明确的巩固或提取路径
系统 MUST 将 sentence 条目和 expression 条目的复习语义区分展示。sentence 条目不得显示为未完成的 expression review 入口，也不得使用“待开放”“待接入”等开发态文案作为用户下一步。

#### Scenario: 用户查看 sentence 条目主动作
- **WHEN** 用户在 Chunks 工作台看到 learning_item_type 为 sentence 的条目
- **THEN** 系统 MUST 给出回到来源场景巩固、查看句内表达或提取表达的明确下一步
- **AND** 系统 MUST NOT 将 sentence 条目直接伪装成可进入 expression review 的条目

#### Scenario: 用户查看 expression 条目主动作
- **WHEN** 用户在 Chunks 工作台看到 learning_item_type 为 expression 的条目
- **THEN** 系统 MUST 提供表达详情、表达复习或来源场景回流等与表达资产一致的下一步
- **AND** 系统 MUST 让 expression 与 sentence 的动作文案可被用户区分

### Requirement: Chunks 页面拆分必须保留 feature 私有边界
系统 MUST 在收口 Chunks 页面复杂度时优先按动作域拆分页面私有 hook、selector、view-model 或 feature 组件。强依赖 Chunks 语义的详情、relation、cluster、map 容器不得仅因视觉相似而上移到 shared。

#### Scenario: 维护者拆分 Chunks 页面
- **WHEN** 维护者为降低 page.tsx 复杂度拆分 Chunks 页面
- **THEN** 拆分后的模块 MUST 保留清晰的 Chunks 业务命名和输入输出
- **AND** 不得把 FocusDetailSheet、ExpressionMapSheet、MoveIntoClusterSheet 等强业务容器抽成 shared 组件

#### Scenario: 维护者发现可复用视觉组件
- **WHEN** 某个 Chunks 子组件只有视觉壳或基础控件逻辑可复用
- **THEN** 系统 MAY 抽取无业务语义的 shared primitive
- **AND** 抽取后的 shared primitive MUST NOT 承载 Chunks 数据写入、review session、relation、cluster 或 source scene 语义
