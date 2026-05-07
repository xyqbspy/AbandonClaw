## MODIFIED Requirements

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
