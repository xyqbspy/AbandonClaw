## ADDED Requirements

### Requirement: Today 必须为新用户提供稳定的 starter recommendation
系统 MUST 在 `today` 聚合结果中为没有可继续场景的用户返回一个可解释的新手路径推荐，并且该推荐必须基于真实 scenes 数据中的 starter 元字段，而不是页面写死文案或写死 slug。

#### Scenario: 新用户首次进入 Today
- **WHEN** 用户没有进行中的 scene、没有已完成 scene，且系统能查询到至少一个 `source_type = builtin` 且 `is_starter = true` 或 `category = starter` 的可见场景
- **THEN** `today` 聚合 MUST 返回一个 starter recommendation
- **AND** 推荐场景 MUST 优先按 `level` 的 `L0 -> L1 -> L2 -> unknown`、`sort_order asc`、`is_featured desc` 选择第一个可见 starter scene
- **AND** 推荐结果 MUST 包含标题、理由、CTA 文案、目标 href、场景标题、level、estimatedMinutes 与 learningGoal/说明的稳定字段

#### Scenario: 用户完成部分 starter 场景
- **WHEN** 用户已完成至少一个 starter scene，且仍有未完成的 starter scene
- **THEN** `today` 聚合 MUST 推荐下一个未完成 starter scene
- **AND** 推荐理由 MUST 说明已完成 starter 数量与继续新手路径的语义

#### Scenario: 用户完成全部 starter 场景
- **WHEN** 用户已完成所有可见 starter scene
- **THEN** `today` 聚合 MUST 从 `daily_life`、`time_plan`、`social` 中推荐下一个 builtin 入门场景
- **AND** 推荐排序 MUST 优先 `L0/L1`，再按 `sort_order asc`、`is_featured desc`

#### Scenario: 系统没有可用 builtin starter 场景
- **WHEN** 可见 scenes 中不存在可用于 starter recommendation 的 builtin 场景
- **THEN** `today` 聚合 MUST 返回安全的 empty recommendation
- **AND** empty recommendation MUST 提供友好的空状态文案与 `/scenes` 浏览入口
- **AND** 页面不得因场景缺失而崩溃

### Requirement: Today 首要推荐优先级必须兼容 continue learning 与 review
系统 MUST 在产出 Today 首要推荐时保持既有 continue learning 的优先级，并且不得用新手 starter recommendation 覆盖已有 review 汇总与任务数据。

#### Scenario: 用户有进行中的学习场景
- **WHEN** 用户存在 `in_progress` 或 `paused` 的 continue learning 场景
- **THEN** `today` 首要推荐 MUST 返回 continue 类型
- **AND** starter recommendation 不得覆盖该 continue 场景

#### Scenario: 用户存在 review 汇总
- **WHEN** dashboard 能提供 due review summary 或 today review task
- **THEN** `today` 页面 MUST 继续显示既有 review 汇总 / 任务信息
- **AND** 新手 starter recommendation 只能补充首要入口，不得删除或破坏既有 review 逻辑

#### Scenario: 推荐场景缺失或字段不完整
- **WHEN** progress 中引用的 scene 已被删除，或 scene 缺少 `level` / `category` / `learning_goal`
- **THEN** `today` 聚合 MUST 跳过无效候选并继续寻找下一个可用候选
- **AND** 若没有可用候选则返回 empty recommendation，而不是返回 500

## MODIFIED Requirements

### Requirement: Today 页面数据来源与优先级必须可追踪
系统 MUST 在 `/today` 页面给出可被真实验收的主链路承接结果，至少让维护者能确认 `today -> scene -> review -> return today` 的反馈仍遵守稳定聚合字段边界，并且首要任务推荐必须来自服务端稳定聚合，而不是前端临时推断。

#### Scenario: 维护者执行真实闭环验收
- **WHEN** 维护者按验收清单走完整主链路
- **THEN** `today` 页面 MUST 能基于稳定聚合字段展示结果摘要
- **AND** 首要任务推荐 MUST 来自服务端 dashboard 聚合输出的稳定字段
- **AND** 不得因为前端临时状态丢失而出现与主链路不一致的反馈

#### Scenario: 前端消费 starter recommendation 字段
- **WHEN** `today` 页面收到包含 starter recommendation 的 dashboard 响应
- **THEN** 前端 MUST 只消费该稳定字段来渲染新用户首要任务卡片
- **AND** 老前端未消费该字段时，原有 dashboard 字段仍必须保持兼容
