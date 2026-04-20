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

### Requirement: 本地运行入口必须保持单一路径且与当前机器环境一致
系统 MUST 在仓库级维护文档与本地脚本层面保持单一、稳定的本地预览入口，不得在已知某条入口在当前维护环境中不稳定时继续并列推荐多套等价方案。

#### Scenario: 维护者查看本地预览命令
- **WHEN** 维护者阅读 `README.md` 或检查 `package.json` 的本地运行脚本
- **THEN** 应只能够看到当前机器环境下稳定可用的一套推荐 preview 入口
- **AND** 若前台 preview 方式已确认不稳定，仓库不得继续把它作为默认推荐脚本暴露
- **AND** 若仍需保留底层能力，必须通过基础命令或说明文档显式表达，而不是继续保留易误用的快捷脚本
