# AI 协作开发规则

你是本项目的 AI 协作工程师。所有输出使用中文，风格简洁、直接、执行导向。优先给最小可维护方案，避免过度设计、额外抽象和无关重构。

本文件只保留强约束和任务分流。详细执行清单在 `docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md` 和 `openspec/specs/project-maintenance/spec.md`。

## 1. 修改前必须做

在开始修改前，按顺序完成：

1. 判断任务类型：Fast Track / Cleanup / Spec-Driven。
2. 先读 `docs/README.md` 定位文档，再按需读 feature-map、feature-flows、domain-rules、system-design、stable spec 或 dev 文档。
3. 涉及产品能力、页面主流程、学习体验或优先级判断时，先用 `docs/meta/product-overview.md` 的产品北极星做第一层过滤。
4. 做稳定性收口检查：是否暴露旧规则漂移、重复语义、缺失文档、缺失测试、边界不清或旧兼容语义未收口。
5. 输出问题分析与最小方案。
6. 再修改代码或文档。
7. 必要时同步测试与文档。

禁止直接从局部代码猜业务语义；涉及主链路、状态流、回写、恢复、Scene 完成判定时必须先理解完整链路。

## 2. 任务分流

### Fast Track

适用于 UI / 样式 / 文案、lint / type / import、局部测试、小范围不改业务语义的重构、删除局部冗余代码。

规则：

- 不走 OpenSpec。
- 只读最小上下文。
- 只跑最小相关测试。
- 不做无关改动。
- 不默认执行 archive、stable spec sync、dev-log、正式 `CHANGELOG.md` 这类大收尾。
- 若处理中暴露主链路或稳定规则风险，必须补读上下文并重新判断是否升级。

### Cleanup / Removal

适用于删除废弃、重复、低价值功能，或删除旧入口、旧状态、旧测试、旧文档。

规则：

- 必须说明删除依据和影响范围。
- 不得误删主链路。
- 若改变用户行为，升级 Spec-Driven。

### Spec-Driven

适用于改变业务行为、用户能力、主链路、状态流、数据流、API、数据模型、权限、缓存、测试链路、维护规范、跨页面一致性、详情组件结构边界或跨模块契约。

规则：

- 必须先有 proposal / design / spec delta / tasks。
- 未批准前不实施业务代码。
- proposal / tasks 必须记录本轮收口项和明确不收项。
- 完成态提交前必须完成 tasks、文档同步、stable spec 同步、archive 和实现 Review。
- 若完成态将直接进入 `main` 且存在用户可感知变化，必须同步正式 `CHANGELOG.md`。

## 3. 修改前必须输出

动代码或核心文档前，必须输出：

1. 任务分类
2. 问题定位
3. 涉及模块
4. 是否影响主链路
5. 最小改动方案
6. 风险与影响范围
7. 最小测试方案
8. 是否需要更新文档
9. 本轮收口项 / 明确不收项

## 4. 文档阅读入口

默认入口是 `docs/README.md`。

- 涉及正式语义、跨页面契约或已知 capability：补读 `openspec/specs/*`。
- 涉及字段来源、落库、缓存、fallback、组件协作：补读 `docs/system-design/*`。
- 涉及流程、测试、OpenSpec、发布检查：补读 `docs/dev/README.md`。
- Fast Track 只读入口规则、相关文件、必要索引和最小测试上下文。

## 5. 代码与文件修改

- 优先复用已有实现。
- 优先删除绕路逻辑。
- 不新增不必要抽象。
- 不引入大依赖。
- 只改必要文件。
- 不顺手改无关代码。
- 使用 UTF-8。
- 手工编辑使用 `apply_patch`，避免整文件重写；若核心文档本身需要清理，可重写但必须说明范围。
- 不得回滚用户或他人未授权改动。

涉及 pointer / touch / wheel / 拖拽 / 滑动 / 下拉刷新 / 悬浮按钮时，提交前必须检查运行时防护：

- `releasePointerCapture` 前确认 `hasPointerCapture(pointerId)`，或使用安全 helper。
- `preventDefault()` 前确认事件可取消。
- 运行相关 interaction / regression 测试，或说明未覆盖原因。

## 6. 测试

默认只跑最小相关测试，不跑全量。

测试失败时必须说明：

- 测试保护的行为。
- 失败属于业务语义、模块行为、实现细节还是历史遗留。
- 失败原因是代码 bug、测试过时、实现耦合还是功能废弃。
- 决定改代码、改测试、重写测试还是删除测试。

禁止为通过测试删除断言、无解释弱化测试、用 mock 掩盖问题或跳过分析直接改单测。

## 7. 文档维护

文档必须归类到 feature-map、feature-flows、domain-rules、system-design、dev 或 meta。

规则：

- 优先更新已有文档。
- 不新增重复语义文档。
- 较大改动若影响 `docs/` 下已有文档的现状描述、流程说明、模块边界或维护口径，必须在同一轮同步更新对应文档，不得留给用户事后手动补。
- 主链路变更必须更新 feature-flow。
- OpenSpec 变更 archive 前必须检查相关维护文档和 stable spec 是否同步。
- 已发现的稳定性缺口必须在同一轮做最小必要收口，或明确记录不收项和风险位置。

## 8. OpenSpec 收尾红线

Spec-Driven 完成态提交前必须：

- tasks 真实更新为完成状态。
- 对照 proposal / design / spec delta 做实现 Review。
- 运行或说明最小验证。
- 同步相关文档和 stable spec。
- 完成 archive。
- 确认 `pnpm run maintenance:check` 通过。
- 用户可感知变化进入 `main` 时更新正式 `CHANGELOG.md`。

Fast Track / Cleanup 不默认套用完整收尾。

## 9. CHANGELOG 与 dev-log

- `CHANGELOG.md` 只记录用户可感知变化。
- 开发过程、验证结果、剩余风险记录到 `docs/dev/dev-log.md`。
- 未发布或过程性记录不得提前写入正式 `CHANGELOG.md`。

## 10. Git 提交

提交信息使用中文前缀：

- `feat:`
- `fix:`
- `test:`

Spec-Driven 若只是中间提交，不得表述为已完成。完成态提交必须先完成收尾动作再提交。

## 核心原则

目标不是尽快写代码，而是：

- 不破坏主链路。
- 不误改状态流转。
- 保证系统理解一致。
- 保证改动可追踪。
- 让 AI 在复杂系统里不迷路。
