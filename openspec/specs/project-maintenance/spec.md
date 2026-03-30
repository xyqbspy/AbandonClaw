## Purpose

定义这个仓库在长期维护中的基础规则，确保维护者能快速理解项目、稳定使用 OpenSpec，并在每次改动后留下可追踪记录。
## Requirements
### Requirement: 项目维护必须有统一入口文档
仓库 MUST 提供一份面向维护者的项目说明，覆盖产品主链路、核心目录职责、改动入口和回归检查点。

#### Scenario: 维护者首次接手项目
- **WHEN** 维护者第一次进入仓库
- **THEN** 他可以通过固定文档快速理解 `today`、`scene`、`chunks`、`review`、`progress` 的关系
- **AND** 他可以定位主要代码目录和服务入口
- **AND** 他可以知道修改某一条学习链路后应该回归哪些测试

### Requirement: 非微小改动应优先经过 OpenSpec
涉及功能行为、数据流、状态流、缓存策略、测试链路、维护规范或跨页面 UI 一致性的改动，维护流程 MUST 优先通过 OpenSpec 形成可审阅的 proposal/spec/tasks。

#### Scenario: 准备统一多个详情页的底部动作表现
- **WHEN** 维护者要统一多个页面之间的 footer、按钮、icon 或交互表达
- **THEN** 应先通过 OpenSpec 记录这次统一的目标、基准和影响范围
- **AND** 不应只把决策留在临时聊天记录中

### Requirement: 每次实际改动后必须维护 changelog
仓库 MUST 维护根目录 `CHANGELOG.md`，用于记录每次实际改动的日期、范围、说明与验证结果。

#### Scenario: 完成一次代码或文档变更
- **WHEN** 维护者完成一次实际改动
- **THEN** 必须同步更新 `CHANGELOG.md`
- **AND** 记录本次变更涉及的模块
- **AND** 记录已执行的验证或未验证风险

