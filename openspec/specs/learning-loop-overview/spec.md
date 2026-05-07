## Purpose

定义项目当前稳定的学习闭环，确保 `today`、`scene`、`chunks`、`review` 与学习状态同步之间保持一致，不会因为局部改动破坏整条学习链路。

这条学习闭环服务于产品北极星：让每一次场景学习，都沉淀为用户在未来真实场景中能回忆、能使用、能迁移的表达资产。`today -> scene -> chunks -> review` 是实现机制，不应替代这个用户结果导向。
## Requirements
### Requirement: Today 必须作为每日学习入口
系统 MUST 提供 `today` 入口，把继续学习、复习任务和学习概览聚合成当日可执行入口。涉及 continue 入口优先级、任务解释文案、聚合字段映射与 fallback 语义的专项规则，MUST 遵守 `today-learning-contract` capability，而不是在学习闭环总览中重复展开 today 聚合契约。

#### Scenario: 用户进入今日页
- **WHEN** 用户打开 `today`
- **THEN** 页面应展示继续学习入口、复习相关信息或学习概览中的至少一类核心信息
- **AND** 这些信息应来自学习链路的聚合结果，而不是孤立静态展示
- **AND** `today` 的继续学习卡片、今日任务与相关解释必须遵守稳定的 today 聚合契约
- **AND** 当服务端聚合结果缺失时，前端不得自行重新定义新的学习完成语义

### Requirement: Scene 必须作为主学习流程工作台
系统 MUST 允许用户在 `scene` 中完成语境阅读、句子交互、表达提取、练习推进与变体扩展等核心学习行为，并保证用户从其他页面进入场景时，在等待路由或首屏数据期间仍能看到稳定的结构化占位，而不是整页空白。涉及对话气泡下方翻译入口、朗读按钮形态与音频交互编排的专项规则，MUST 分别遵守 `audio-action-button-consistency` 与 `audio-playback-orchestration` capability，而不是在学习闭环总览中重复展开页面交互细节。

#### Scenario: 用户在对话气泡下方切换翻译
- **WHEN** 用户查看 lesson reader 中的对话气泡或移动端分组气泡
- **THEN** 气泡对应的翻译默认应保持隐藏
- **AND** 翻译入口、朗读按钮与相关动作分组必须遵守稳定的音频与翻译交互规范
- **AND** 其它非气泡句子组件不得因为局部交互调整而被额外新增不一致的同类入口

### Requirement: Scene 显式步骤必须与当前产品链路一致
系统 MUST 让用户在场景内看到与当前产品一致的显式步骤，不得继续暴露已经并入练习流程的旧前置步骤。涉及练习内部题型推进、句子里程碑与场景完成语义的专项规则，MUST 遵守 `sentence-progression` capability，而不是在学习闭环总览中重复定义内部练习状态机。

#### Scenario: 用户查看场景训练步骤
- **WHEN** 用户打开场景详情页中的训练浮层、继续学习卡片或其他用户可见学习路径入口
- **THEN** 显式步骤应围绕“听熟这段 -> 看重点表达 -> 开始练习 -> 解锁变体”组织
- **AND** 已兼容保留的 `practice_sentence` / `sentence_practice` 状态只能作为内部里程碑或兼容状态存在
- **AND** 用户侧不得再被要求执行独立的“练核心句”前置步骤
- **AND** 具体练习阶段、题型完成和句子里程碑之间的关系必须遵守稳定的句子推进契约

### Requirement: Chunks 必须承担表达沉淀与整理职责
系统 MUST 允许用户把来自场景或手动录入的表达沉淀为可管理资产，并支持后续扩展、聚类、对比或复习组织。涉及 `chunks` 页面动作副作用、relation / cluster 语义、review 入口契约的专项规则，MUST 遵守 `chunks-data-contract` capability；涉及列表或详情缓存命中后的后台刷新与缓存职责边界时，MUST 遵守 `runtime-cache-coherence` capability，而不是在学习闭环总览中重复展开实现层契约。

#### Scenario: 用户保存并整理表达
- **WHEN** 用户把一个表达加入个人资产
- **THEN** 该表达后续应能在 `chunks` 或相关详情流中继续被查看、补全、组织或加入复习
- **AND** 若该动作同时涉及 relation、expression cluster、AI enrich、daily stats 或 review 入口，系统必须遵守稳定的 chunks 数据契约
- **AND** 若页面命中本地缓存，后续刷新与缓存一致性必须遵守专项缓存治理能力

### Requirement: 学习行为必须可被服务端学习链路消费
系统 MUST 将关键学习行为映射为可持续追踪的学习状态，而不是只停留在前端瞬时 UI。涉及“进入句子练习”“句子达到 complete 里程碑”“场景练习完成”“场景 done”等细粒度定义时，系统 MUST 遵守 `sentence-progression` 与 `sentence-completion-tracking` capability，而不是在学习闭环总览中重复定义另一套完成语义。

#### Scenario: 用户开始、推进或结束学习
- **WHEN** 用户进入学习、停留推进、完成或离开学习流程
- **THEN** 系统应能把这些行为纳入学习状态同步或统计链路
- **AND** `today`、`review`、`progress` 等聚合页面可以消费这些结果
- **AND** 句子推进、句子完成和场景练习完成必须作为可区分的学习结果被稳定消费
- **AND** 服务端不得继续把“已进入句子练习”直接近似为“句子已完成”

### Requirement: Review 必须承担学习回顾与再练入口职责
系统 MUST 允许 `review` 页面同时承担普通表达复习和来自场景练习的继续回补、参考展开、再作答与下一题推进职责；当复习体验需要新的前端阶段式工作台或后续增强能力时，必须用稳定的数据契约和清晰的 TODO 占位来维护学习链路一致性。`review` 在学习闭环中的角色 MUST 进一步覆盖从识别、主动提取到输出巩固的递进式训练，而不只是简单复习打分。涉及阶段式工作台、正式后端信号、排序节奏与来源契约的专项规则，MUST 分别遵守 `review-progressive-practice`、`review-practice-signals`、`review-scheduling-signals` 与 `review-source-contract` capability，而不是在学习闭环总览里重复展开。

#### Scenario: 用户通过 review 继续学习
- **WHEN** 用户进入 `review`
- **THEN** 页面必须能清晰区分当前任务来源、当前阶段和下一步动作
- **AND** 普通表达复习与场景回补不得因为 UI 改造而断开既有学习统计、提交或回到场景的主链路
- **AND** 若某个新交互暂未接通后端，页面必须明确标识为 TODO 占位，而不是伪造成正式完成信号
- **AND** `review` 必须允许用户从识别提示逐步进入主动回忆、变体迁移和完整输出等更高强度训练
- **AND** 若后端已为这些训练阶段提供正式信号，聚合入口只能通过稳定摘要字段消费
- **AND** 这些正式信号对排序、节奏和来源解释的影响必须遵守对应专项 capability

### Requirement: Review 数据来源解释必须与学习闭环一致
系统 MUST 在学习闭环层面明确 `review` 的普通表达复习来自已保存且到期的表达集合，并把“来源场景”视为辅助回看关系，而不是默认的完成门槛。

#### Scenario: 维护学习闭环中的 review 入口
- **WHEN** 维护者调整 `today`、`chunks`、`review` 或场景学习链路
- **THEN** 必须把 `review` 普通表达来源解释为已保存且到期的表达
- **AND** 不得在未显式变更契约的情况下，把来源场景完成度隐式提升为进入 review 的前置条件

### Requirement: Scene 主学习视图必须暴露当前下一步
系统 MUST 在 Scene 主学习视图中提供用户可见的当前下一步入口，使用户不依赖浮动进度入口也能理解当前训练动作。该入口 MUST 与现有场景训练步骤一致，不得定义一套新的学习状态流。

#### Scenario: 用户进入 Scene 主学习视图
- **WHEN** 用户打开 Scene detail 的主学习视图
- **THEN** 页面 MUST 展示当前训练步骤或下一步训练动作
- **AND** 该展示 MUST 围绕“听熟这段 / 看重点表达 / 开始练习 / 解锁变体”等稳定训练步骤组织
- **AND** 浮动训练入口可以继续展示完整进度、步骤列表、统计摘要和已完成步骤的辅助快捷入口
- **AND** 浮动训练入口不得重复承载当前步骤主 CTA 或“下一步”行动指令

#### Scenario: 当前步骤存在可执行动作
- **WHEN** 当前场景训练步骤存在主 CTA
- **THEN** Scene 主学习视图的下一步入口 MUST 提供与该步骤一致的主行动入口
- **AND** 浮动训练入口不得同时展示同一当前步骤主 CTA
- **AND** 该主行动入口不得绕过现有 practice set、variant set、learning sync 或 route state 语义

### Requirement: Scene 辅助和管理动作不得抢占学习主路径
系统 MUST 在 Scene 学习页面中区分学习主动作与辅助 / 管理动作。删除、管理生成结果、查看详情等动作不得与当前学习主动作处于同等主层级。

#### Scenario: 用户查看变体学习页
- **WHEN** 用户进入某个变体的学习视图
- **THEN** 页面 MUST 优先展示继续学习或基于该变体继续练习的动作
- **AND** 删除变体等管理动作 MUST 降级为辅助或危险次级动作
- **AND** 降级不得移除现有管理能力，只调整用户可见层级

#### Scenario: 用户在 Scene 页面看到多个动作
- **WHEN** 页面同时存在学习、查看、删除、返回或管理类动作
- **THEN** 系统 MUST 让当前训练步骤主动作成为唯一主 CTA
- **AND** 其它动作 MUST 以辅助入口、次按钮或更低视觉层级呈现
