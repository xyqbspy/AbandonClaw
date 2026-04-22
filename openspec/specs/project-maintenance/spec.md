## Purpose

定义项目维护流程中的 OpenSpec、文档、收尾与验收同步要求，确保复杂链路改动在实现前后都有可审阅的边界、任务、验证记录和完成定义。

## Requirements

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

### Requirement: 本地运行入口必须保持单一路径且与当前机器环境一致
系统 MUST 在仓库级维护文档与本地脚本层面保持单一、稳定的本地预览入口，不得在已知某条入口在当前维护环境中不稳定时继续并列推荐多套等价方案。

#### Scenario: 维护者查看本地预览命令
- **WHEN** 维护者阅读 `README.md` 或检查 `package.json` 的本地运行脚本
- **THEN** 应只能够看到当前机器环境下稳定可用的一套推荐 preview 入口
- **AND** 若前台 preview 方式已确认不稳定，仓库不得继续把它作为默认推荐脚本暴露
- **AND** 若仍需保留底层能力，必须通过基础命令或说明文档显式表达，而不是继续保留易误用的快捷脚本

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
维护流程 MUST 提供一个本地可运行的维护检查入口，用于在完成态提交前发现常见 OpenSpec 和发布收尾遗漏。

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
