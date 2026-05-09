## Purpose

定义项目维护流程中的 OpenSpec、文档、收尾与验收同步要求，确保复杂链路改动在实现前后都有可审阅的边界、任务、验证记录和完成定义。
## Requirements

### Requirement: 公网开放 P0-B 完成态必须记录防护与剩余风险
当变更完成每日 quota、账号状态降级、学习时长 delta 防污染或 admin 今日用量摘要时，维护流程 MUST 同步记录验证结果、未覆盖边界和后续 P1/P2 风险。

#### Scenario: 维护者完成公网开放 P0-B 变更
- **WHEN** 维护者完成 daily quota、usage 预占、账号访问状态、学习时长 delta 防污染和 admin usage 摘要
- **THEN** tasks、stable spec、开发文档和 dev-log MUST 记录已完成防护
- **AND** MUST 明确完整运营后台、复杂风控、注册 IP 频控、长期成本趋势和 session heartbeat 仍不在本轮范围
- **AND** 完成态收尾前 MUST 运行最小相关测试和 `maintenance:check`，或记录无法运行的原因
### Requirement: AI 协作输出必须默认使用中文
系统 MUST 要求 AI 协作过程中的阶段性更新、问题分析、最终答复、OpenSpec proposal、design、tasks、spec delta 和普通维护文档默认使用中文。系统 MUST 禁止 AI 在未被用户明确要求时输出纯英文回答。

英文 MAY 出现在代码、命令、路径、文件名、API 名、类型名、错误原文、外部专有名词、引用标题、英语学习素材或用户明确要求保留英文的内容中，但这些内容周围的解释、结论、风险说明和任务描述 MUST 使用中文。

#### Scenario: AI 回答用户的问题
- **WHEN** AI 在本项目中回复用户、汇报进度或给出最终结论
- **THEN** 回答主体必须使用中文
- **AND** 不得在用户没有明确要求英文时给出纯英文回答

#### Scenario: AI 生成 OpenSpec 或维护文档
- **WHEN** AI 新建或更新 proposal、design、tasks、spec delta、dev 文档或维护说明
- **THEN** 标题、任务项、问题分析、决策、风险和验证说明必须默认使用中文
- **AND** 代码标识、命令、API 名、错误原文和英语学习素材可以保留英文

### Requirement: 产品能力需求必须先对齐产品北极星
当维护者接入涉及产品能力、页面主流程、学习体验或优先级判断的需求时，维护流程 MUST 先用 `docs/meta/product-overview.md` 中的产品北极星做第一层过滤，确认该需求是否服务“让每一次场景学习，都沉淀为用户在未来真实场景中能回忆、能使用、能迁移的表达资产”。

#### Scenario: 维护者接入新的产品能力需求
- **WHEN** 维护者开始分析一个会影响用户学习体验、页面主流程或能力优先级的新需求
- **THEN** 必须在问题分析或接入模板中记录北极星判断
- **AND** 必须说明该需求如何帮助用户进入学习、理解语境、沉淀表达资产，并提高表达在未来被回忆、使用或迁移的概率
- **AND** 若需求只是增加入口、堆叠功能或偏离表达资产闭环，必须明确风险、调整范围或记录不收项

#### Scenario: 维护者处理纯局部工程修复
- **WHEN** 本轮任务只是 lint、类型、局部样式、局部测试或不改变用户学习体验的小修复
- **THEN** 可以不展开北极星分析
- **AND** 仍需按任务规模完成最小问题定位、测试和必要文档同步判断

### Requirement: 学习反馈与业务可观测性改动必须同步更新维护说明
当变更涉及真实主链路验收或业务事件可回看能力时，维护流程 MUST 同步补齐验收清单与验证说明。

#### Scenario: 维护者补业务事件回看能力
- **WHEN** 维护者为学习主链路补充业务事件可回看能力
- **THEN** 必须同步补齐真实闭环验收清单
- **AND** 必须记录最小验证方式与剩余边界

### Requirement: 非微小改动应优先经过 OpenSpec
涉及功能行为、数据流、状态流、缓存策略、测试链路、维护规范、跨页面 UI 一致性或详情组件结构性复用边界的改动，维护流程 MUST 优先通过 OpenSpec 形成可审阅的 proposal、spec 和 tasks。

#### Scenario: 准备收敛 detail 组件结构
- **WHEN** 维护者要统一或拆分 lesson detail 与 chunks detail 的组件边界
- **THEN** 应先通过 OpenSpec 记录共享基元、领域差异和实施范围
- **AND** 不应先做代码迁移再补规范

### Requirement: 需求接入阶段必须显式记录稳定性收口项
当维护者开始处理非微小改动时，维护流程 MUST 先判断本次需求是否同时暴露旧规则漂移、重复语义、缺失文档、缺失测试、边界不清或旧兼容语义未收口，并显式记录“本轮收口项”与“明确不收项”，避免已识别的不稳定点在需求落地后再以零散补丁形式反复修补。

#### Scenario: 维护者开始接入一项新的非微小需求
- **WHEN** 维护者开始梳理 proposal、design、tasks 或需求接入模板
- **THEN** 必须同步检查本次需求是否暴露既有稳定性缺口
- **AND** 必须明确记录哪些缺口要在本轮最小必要收口，哪些明确不在本轮处理
- **AND** 若存在延后项，必须同时记录延后原因与风险去向

### Requirement: 开发过程记录与正式 CHANGELOG 必须分离
维护流程 MUST 将开发过程中的验证结论、范围说明与剩余风险优先记录在 `docs/dev/dev-log.md`，而不得默认直接写入正式 `CHANGELOG.md`。只有当变更收尾结果已进入或将直接进入 `main`，且该变更属于用户可感知变化时，系统才应更新正式 `CHANGELOG.md`。

#### Scenario: 维护者完成一轮已落地但未合并 main 的实现
- **WHEN** 维护者完成实现、测试与文档同步，但代码尚未合并 `main`
- **THEN** 必须先把验证结果与剩余风险记录到 `docs/dev/dev-log.md`
- **AND** 不得把这类过程性说明直接写进正式 `CHANGELOG.md`

#### Scenario: 维护者准备为进入 main 的用户可感知变更更新发布记录
- **WHEN** 相关代码已经合并 `main`，或本次完成态收尾后将直接进入 `main`，且本轮存在用户可感知变化
- **THEN** 系统 MUST 更新正式 `CHANGELOG.md`
- **AND** 正式 CHANGELOG 只记录稳定的用户可感知变化，而不是开发过程细节

### Requirement: 归档或同步主 specs 时必须回查稳定规范是否已承接变更
当维护流程进入 archive 或 update specs 阶段时，系统 MUST 回查本次 change 中涉及的稳定规则是否已经同步到 `openspec/specs/*`，而不能只归档 change 目录或只保留在临时 delta spec 中。

#### Scenario: 维护者准备归档已完成 change
- **WHEN** 维护者准备归档一个已完成的 OpenSpec change
- **THEN** 必须检查该 change 涉及的稳定规则是否已同步到主 `openspec/specs/*`
- **AND** 若稳定规范尚未承接，不得只完成归档而宣称规范同步已经结束

### Requirement: 较大改动必须同轮同步 docs 现状文档
当一轮改动达到非微小规模，或改变用户可见能力、跨页面 UI 一致性、主链路、数据流、状态流、缓存、权限、维护流程、测试链路或模块边界时，维护流程 MUST 在同一轮检查并同步 `docs/` 下受影响的现状文档，不得把已知文档漂移留给用户事后手动补。

#### Scenario: 较大 UI 或能力改动影响现有文档描述
- **WHEN** 维护者完成一轮较大 UI、能力或跨模块一致性改动
- **AND** `docs/README.md` 定位到的 feature-map、feature-flows、domain-rules、system-design、dev 或 meta 文档存在相关现状描述
- **THEN** 必须在本轮同步更新这些已有文档，或明确说明为何不受影响
- **AND** 不得只更新代码、测试和 CHANGELOG 后把 `docs/` 同步留给后续人工处理

#### Scenario: 改动只属于微小局部修复
- **WHEN** 本轮改动明确属于 Fast Track 小修，且不改变文档中描述的现状、流程、模块边界或维护口径
- **THEN** 可以说明无需更新 `docs/`
- **AND** 该说明必须基于已检查的相关入口，而不是默认跳过文档同步判断

### Requirement: 较大改动必须同步产品与技术总览
当一轮改动改变用户可感知核心能力、产品亮点、主链路体验、架构能力、缓存/播放链路、平台治理能力或对外技术介绍口径时，维护流程 MUST 同轮检查并同步 `docs/meta/product-overview.md` 与 `docs/meta/technical-overview.md`。如果检查后确认 meta 层描述不受影响，维护者 MUST 在最终说明或 dev-log 中记录无需更新的原因。

#### Scenario: 用户可感知能力发生较大变化
- **WHEN** 本轮改动新增或显著改变一个用户可感知能力
- **THEN** 维护者必须检查产品总览是否需要更新当前亮点、关键能力、页面价值或产品边界
- **AND** 若需要，必须在同一轮更新 `docs/meta/product-overview.md`

#### Scenario: 技术链路或架构能力发生较大变化
- **WHEN** 本轮改动改变缓存策略、播放链路、数据流、服务端治理、预热策略或架构说明
- **THEN** 维护者必须检查技术总览是否需要更新技术亮点、优化项、典型方案或当前边界
- **AND** 若需要，必须在同一轮更新 `docs/meta/technical-overview.md`

#### Scenario: 改动属于微小局部修复
- **WHEN** 本轮改动明确属于 Fast Track 小修，且不改变产品现状或技术总览口径
- **THEN** 可以不更新 meta 文档
- **AND** 不得因此跳过受影响的专项文档同步判断

### Requirement: Spec-Driven 完成态提交前必须先完成收尾
当维护者处理 Spec-Driven Change 且本次提交被视为“完成态提交”或用户明确要求“收尾提交”时，维护流程 MUST 先完成收尾动作，再提交代码；不得先提交实现代码，再手动补 tasks、文档、stable spec 或 archive。

#### Scenario: 维护者准备提交一个已完成的 Spec-Driven 变更
- **WHEN** 维护者准备把一项 Spec-Driven Change 作为“已完成”进行提交
- **THEN** 必须先完成 tasks 状态更新、相关文档同步、stable spec 同步与 change archive
- **AND** 若本次收尾结果将直接进入 `main` 且存在用户可感知变化，必须同步更新正式 `CHANGELOG.md`
- **AND** 若代码尚未进入 `main`，不得提前更新正式 `CHANGELOG.md`
- **AND** 只有在这些收尾动作完成后，才可将该提交表述为完成态提交

#### Scenario: 维护者进行开发中的中间提交
- **WHEN** 维护者在 Spec-Driven Change 尚未完成收尾前进行中间提交
- **THEN** 允许提交当前实现进度
- **AND** 不得将该提交表述为变更已完成
- **AND** 不得把中间提交视为替代后续收尾流程

### Requirement: 微小改动不应默认套用 Spec-Driven 大收尾
当维护者处理明确属于 Fast Track 或 Cleanup 的微小改动时，维护流程 MUST 采用与改动规模匹配的最小收尾标准，而不应默认要求 archive、stable spec sync、dev-log 补记或正式 `CHANGELOG.md` 更新这类 Spec-Driven 完成态动作。

#### Scenario: 维护者修复一个局部 UI 回归或小范围样式问题
- **WHEN** 本轮改动明确属于 Fast Track 或 Cleanup，且只是局部 UI、文案、样式、局部测试或不改变业务语义的小修复
- **THEN** 收尾标准应为代码修正完成、最小相关测试通过、必要文档已做最小同步后即可提交
- **AND** 不得仅因为仓库存在较重的 Spec-Driven 流程，就把这类小改动默认升级为完整 archive、stable spec sync 或正式发布收尾
- **AND** 只有当该小改动同时被明确提升为规范变更、发布收尾或跨模块稳定契约调整时，才应进入完整收尾流程

### Requirement: 本地运行入口必须避免保留不稳定 preview 管理入口
系统 MUST 在仓库级维护文档与本地脚本层面保持单一、稳定的本地运行入口，不得在已知 preview 管理入口不稳定时继续暴露 `preview:*` 快捷脚本或并列推荐多套等价方案。

#### Scenario: 维护者查看本地运行命令
- **WHEN** 维护者阅读 `README.md` 或检查 `package.json` 的本地运行脚本
- **THEN** 应只能够看到当前机器环境下稳定可用的本地开发入口 `pnpm run dev`
- **AND** 若需要生产模式验证，应通过 `pnpm run build` 与 `pnpm run start` 显式组合完成
- **AND** 仓库不得继续保留易误用的后台 preview 管理脚本、状态文件说明或 `preview:*` npm scripts

### Requirement: Spec-Driven 完成态提交前必须完成实现 Review
当维护者准备把 Spec-Driven Change 作为“完成态提交”或“收尾提交”时，维护流程 MUST 先完成一次实现 Review，再提交代码。

#### Scenario: 维护者准备完成一个 Spec-Driven 变更
- **WHEN** 维护者准备把一项 Spec-Driven Change 作为已完成变更提交
- **THEN** 必须对照 proposal、tasks 与 spec delta 检查实际实现是否一致
- **AND** 必须确认 tasks、测试、文档、stable spec、archive 与必要的 CHANGELOG 状态已经完成或明确说明不适用
- **AND** 必须记录已识别但本轮不收的事项、剩余风险与后续入口
- **AND** 只有实现 Review 通过后，才可将该提交表述为完成态提交

#### Scenario: 维护者处理微小改动
- **WHEN** 本轮改动明确属于 Fast Track 或 Cleanup，且未升级为 Spec-Driven 完成态收尾
- **THEN** 不应默认套用完整实现 Review
- **AND** 只需要完成与改动规模匹配的最小检查、测试与必要文档同步

### Requirement: 维护流程必须按任务规模控制上下文预算
维护流程 MUST 按任务类型和风险等级控制阅读范围，避免在小改动中加载无关上下文，也避免在复杂变更中跳过必要的主链路、稳定规则或实现文档。

#### Scenario: 维护者处理 Fast Track 小改动
- **WHEN** 本轮改动明确属于 Fast Track，且不改变业务语义、主链路、状态流、数据流或稳定规则
- **THEN** 维护者 MUST 只读取入口规则、相关文件、必要索引和最小测试上下文
- **AND** 不得默认通读 feature-flows、domain-rules、system-design、OpenSpec archive 或 dev-log

#### Scenario: 维护者处理 Spec-Driven 变更
- **WHEN** 本轮改动属于 Spec-Driven Change
- **THEN** 维护者 MUST 先通过 `docs/README.md` 和相关索引定位上下文，再按 feature-flow、domain-rules、stable spec、system-design、代码的顺序递进阅读
- **AND** 不得用批量通读目录替代入口定位
- **AND** 若阅读历史 archive、旧 proposal 或 dev-log，只能作为历史参考，不得替代当前 stable spec 和维护文档

#### Scenario: 维护者发现主链路风险
- **WHEN** Fast Track 或 Cleanup 处理中暴露了主链路、状态流、数据流、缓存、权限或稳定规则风险
- **THEN** 维护者 MUST 补读对应链路文档、稳定规则和必要实现上下文
- **AND** 必须重新判断是否需要升级为 Spec-Driven Change

### Requirement: 维护入口之间必须保持上下文职责分层
项目维护规则 MUST 明确 AGENTS、文档索引、stable spec、维护手册和变更接入模板之间的职责，避免多个入口重复承载同一长规则导致智能体默认上下文膨胀。

#### Scenario: 智能体开始处理需求
- **WHEN** 智能体读取项目维护规则
- **THEN** `AGENTS.md` MUST 只提供入口级强约束和分流规则
- **AND** `docs/README.md` MUST 负责文档定位顺序
- **AND** `openspec/specs/project-maintenance/spec.md` MUST 负责长期稳定契约
- **AND** `docs/dev/project-maintenance-playbook.md` MUST 负责执行清单
- **AND** `docs/dev/change-intake-template.md` MUST 负责接需求阶段的问题分析骨架

### Requirement: 完成态维护检查必须可通过本地脚本执行
维护流程 MUST 提供一个本地可运行的维护检查入口，用于在完成态提交前发现常见 OpenSpec、归档文本可读性和发布收尾遗漏。

#### Scenario: 存在 completed 但未归档的 active change
- **WHEN** 维护者运行完成态维护检查
- **AND** `openspec list --json` 返回 status 为 complete 的 active change
- **THEN** 检查 MUST 报告该 change 仍需 archive

#### Scenario: active change 仍有未完成任务
- **WHEN** 维护者运行完成态维护检查
- **AND** 某个 active change 的 `tasks.md` 中仍存在 `- [ ]`
- **THEN** 检查 MUST 报告该 change 仍有未完成任务

#### Scenario: OpenSpec 全量校验失败
- **WHEN** 维护者运行完成态维护检查
- **AND** `openspec validate --all --strict` 失败
- **THEN** 检查 MUST 失败并保留原始校验输出

#### Scenario: 本轮新建或修改的归档文档存在高置信度乱码
- **WHEN** 维护者运行完成态维护检查
- **AND** 当前工作区、暂存区或未跟踪文件中存在新建或修改的 `openspec/changes/archive/` 文本文档
- **AND** 这些文档包含高置信度乱码片段
- **THEN** 检查 MUST 失败并报告具体文件与行号
- **AND** 不得因为 archive 目录属于历史归档而跳过本轮触碰的归档文档

### Requirement: 维护入口文档必须避免重复承载同一长规则
维护流程 MUST 保持 AGENTS、文档索引、stable spec、维护手册和接入模板之间的职责分层，避免多个入口重复展开同一长规则。

#### Scenario: 维护者需要判断任务类型
- **WHEN** 维护者阅读接需求入口
- **THEN** 文档 MUST 提供 Fast Track / Cleanup / Spec-Driven 的最小速查
- **AND** 详细流程 MUST 指向维护手册或 stable spec，而不是在多个入口重复展开

#### Scenario: 维护者需要确认长期稳定约束
- **WHEN** 维护者需要确认一条维护规则是否属于长期契约
- **THEN** 文档 MUST 指向 `openspec/specs/project-maintenance/spec.md`
- **AND** 不得要求维护者同时从多个入口拼接同一条规则

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

### Requirement: AGENTS 必须只承载强约束入口
维护流程 MUST 将 `AGENTS.md` 保持为强约束和任务分流入口，不得让它重复承载完整执行手册、OpenSpec 阶段细则或长篇文档维护说明。

#### Scenario: 维护者读取 AGENTS
- **WHEN** 维护者开始一次改动并读取 `AGENTS.md`
- **THEN** `AGENTS.md` MUST 提供任务分流、修改前检查、OpenSpec 红线、测试/文档/提交强约束
- **AND** 详细执行步骤 MUST 指向 `docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md` 或 stable spec

#### Scenario: 维护规则需要补充细节
- **WHEN** 新增的是执行清单、阶段说明、测试策略或文档维护细则
- **THEN** 该细节 MUST 优先写入 `docs/dev/*` 或 `openspec/specs/project-maintenance/spec.md`
- **AND** 不得默认继续扩写 `AGENTS.md`

### Requirement: 核心文档入口必须保持干净可读
维护流程 MUST 保持 `docs/README.md`、`docs/dev/project-maintenance-playbook.md`、`CHANGELOG.md`、当前 active OpenSpec change 文档和本轮新建或修改的 OpenSpec archive 文档为可读 UTF-8 文档，避免核心入口、临时变更记录或归档证据被乱码、重复规则或过程性记录污染。

#### Scenario: 维护者定位文档
- **WHEN** 维护者打开 `docs/README.md`
- **THEN** 文档 MUST 先提供文档分层、最小阅读路径和常见入口
- **AND** 不得在入口页重复展开所有专项规则

#### Scenario: 维护者查看正式发布记录
- **WHEN** 维护者打开 `CHANGELOG.md`
- **THEN** 文档 MUST 只记录用户可感知变化
- **AND** 开发过程、验证记录或维护收口过程 MUST 记录到 `docs/dev/dev-log.md`

#### Scenario: 维护者归档或修改 OpenSpec archive 文档
- **WHEN** 维护者在本轮新建、归档或修改 `openspec/changes/archive/` 下的文本文档
- **THEN** 这些归档文档 MUST 保持可读 UTF-8
- **AND** 必须通过乱码检查或在验证记录中明确说明未覆盖原因

### Requirement: CHANGELOG 条件检查必须保守提示而非替代人工判断
维护检查 MUST 对当前分支为 `main` 且存在可能用户可感知文件变更的情况给出 CHANGELOG 保守提示，但不得把这种提示伪装成完整语义判断。

#### Scenario: main 分支存在可能用户可感知的变更
- **WHEN** 维护者运行完成态维护检查
- **AND** 当前分支为 `main`
- **AND** 工作区存在可能影响用户行为的文件变更
- **THEN** 检查 SHOULD 提示维护者确认是否需要更新 `CHANGELOG.md`
- **AND** 该提示不得替代维护者对“是否用户可感知”的最终判断

### Requirement: 完成态 Review 必须检查上下文污染
Spec-Driven 完成态实现 Review MUST 检查本轮使用的上下文是否与任务范围匹配，避免无关历史材料、旧规则或跨模块噪音影响最终实现判断。

#### Scenario: 维护者准备完成态提交
- **WHEN** 维护者准备把 Spec-Driven Change 作为完成态提交或收尾提交
- **THEN** 实现 Review MUST 确认本轮关键依据来自当前 stable spec、维护文档、相关链路文档和实际代码
- **AND** 若引用历史 archive、旧 proposal 或 dev-log，必须确认其没有覆盖或替代当前稳定规则
- **AND** 若存在刻意未读取的相关上下文，必须记录原因、风险和后续入口

### Requirement: 新增页面或跨页面 UI 改动必须先检查统一风格入口
当维护者处理新增页面、主要功能入口、跨页面 UI 一致性或通用组件相关改动时，维护流程 MUST 先检查 UI 风格指南、组件库说明和相关稳定 spec，确认本轮改动不会引入新的按钮层级、卡片结构、局部主色或组件归属漂移。

#### Scenario: 维护者接入新增页面或跨页面 UI 需求
- **WHEN** 维护者开始分析一个新增页面、主要功能入口或跨页面 UI 一致性需求
- **THEN** 必须在问题分析或接入模板中说明本轮将复用的 UI 风格入口、组件层级和按钮语义
- **AND** 若需要新增公共组件、设计规范或改变跨页面视觉层级，必须升级为 Spec-Driven
- **AND** 若只是局部文案、微小样式或不改变既有风格口径的小修，仍可按 Fast Track 处理

### Requirement: 公网开放 P0-A 必须记录真实 HTTP baseline
当变更会让注册入口或高成本接口进入公网小范围开放准备态时，维护流程 MUST 记录真实 HTTP baseline，且不能只依赖单元测试作为完成定义。

#### Scenario: 维护者完成公网注册 P0-A 变更
- **WHEN** 维护者完成注册模式、邀请码、邮箱验证拦截或高成本接口 user/IP 限流变更
- **THEN** 必须记录 closed、invite-only、邮箱验证、user/IP 限流、Redis 后端状态和 Origin 拒绝的 HTTP baseline
- **AND** 若当前环境无法执行完整真实 HTTP baseline，必须在 dev-log 和任务中记录未覆盖原因与后续验证入口

#### Scenario: P0-A 仍存在 P0-B 风险
- **WHEN** 维护者归档或收尾公网注册 P0-A 变更
- **THEN** 必须在公网开放计划中保留每日 quota、usage 预占、封禁状态、学习时长 delta 上限和运营后台的剩余风险
- **AND** 不得把 P0-A 完成描述为可无门槛公开开放
