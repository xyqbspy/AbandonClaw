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
