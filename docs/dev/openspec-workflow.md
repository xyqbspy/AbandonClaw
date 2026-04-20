# OpenSpec Workflow

本文档用于说明项目在进入 Spec-Driven Change 时的标准流程、文件结构、阶段约束与模板。
默认情况下，三层分工如下：

- `AGENTS.md`
  - 负责任务分流、默认执行顺序、阅读入口和修改前输出要求
- `openspec/specs/project-maintenance/spec.md`
  - 负责项目维护流程的长期稳定约束
- `docs/dev/openspec-workflow.md`
  - 只负责 Spec-Driven 阶段的流程细化、目录结构和模板

如果出现重复口径：
- 任务分流与日常执行规则，以 `AGENTS.md` 为准
- 长期稳定维护约束，以 `openspec/specs/project-maintenance/spec.md` 为准
- 当前文档不重复定义总纲，只补充 OpenSpec 阶段细节

---

## 0. 适用范围

进入 OpenSpec 的判断口径以 `AGENTS.md` 和 `openspec/specs/project-maintenance/spec.md` 为准。
当前文档只保留一份便于执行的摘要：

- 改变业务行为或用户能力定义
- 改变主链路、状态流、数据流
- 新增或修改 API / 数据模型 / 数据库 / 缓存 / 埋点契约
- 改动权限、校验、安全策略
- 影响多个页面/模块/团队约定
- 新增公共能力、通用组件、设计规范
- 修复会改变系统外部行为的 Bug
- 用户明确要求先出 proposal / design / tasks / spec

若任务属于局部修复、样式调整、局部测试、类型修复、无行为变化的小重构，请按 `AGENTS.md` 走 Fast Track 或 Cleanup。

---

## 1. 流程阶段

OpenSpec 标准流程：

Proposal -> Approval -> Implementation -> Archive -> Update specs -> Update CHANGELOG

规则：
- 只执行当前阶段
- 不自动推进下一阶段
- 未满足进入条件时，不得越级执行

---

## 2. 阶段进入条件

以下内容只补充各阶段允许做什么、不允许做什么，不重复展开 `AGENTS.md` 中的总规则。

### Proposal
触发条件：
- 新功能
- 行为变更
- 影响外部契约的 Bug 修复
- 用户明确要求提案

允许：
- 建议 change-id
- 产出 proposal.md / design.md / tasks.md 草稿
- 产出 spec delta 草稿
- 做“稳定性收口检查”，识别本次需求顺带暴露的既有不稳定点

不允许：
- 正式实施
- 修改主 specs
- 更新正式 CHANGELOG

---

### Approval
进入条件：
- 用户明确表示：
  - approved
  - 提案通过
  - 可以进入实施
  - 进入实施阶段

审批前不允许正式实施。

---

### Implementation
进入条件：
- 已有 change-id
- 已有 proposal.md
- 已有 tasks.md
- 用户已明确批准

允许：
- 按 tasks 实施
- 更新任务勾选状态
- 必要时补充测试说明与风险
- 同步记录开发过程与验证结论到 `docs/dev/dev-log.md`
- 若存在用户可感知变化，可先明确需要写入 CHANGELOG 的稳定条目；只有在变更已进入或本次完成态收尾后将直接进入 `main` 时，才更新正式 `CHANGELOG.md`
- 对 proposal / tasks 中已标记为“本轮收口项”的不稳定点一并完成最小必要收口

不允许：
- 归档
- 更新主 specs
- 更新正式 CHANGELOG

若实施中发现范围变化：
- 先更新 proposal / design / tasks / specs
- 再继续

若实施中新增发现既有不稳定点：
- 先判断它是否会直接导致当前需求后续返工、语义冲突、测试失真或文档继续漂移
- 会的话，纳入本轮最小必要收口，并同步更新 proposal / tasks / dev-log
- 不会的话，也要明确记入“不收项”和延后理由，避免后续再次以补丁形式反复修补

---

### Archive
进入条件：
- 用户明确说明代码已合并主分支
- 或用户明确要求执行归档

允许：
- 归档 change 目录
- 准备 specs 同步内容

不允许：
- 跳过归档直接宣称完成
- 跳过后续 spec 同步

---

### Update specs
进入条件：
- 对应 change 已归档
- 用户明确要求更新 specs，或已进入该阶段

允许：
- 将归档中的 delta spec 合并入主 specs
- 去除临时性表述，形成稳定规范

---

### Update CHANGELOG
进入条件：
- 代码已合并 `main`，或本次完成态收尾后将直接进入 `main`
- 用户明确要求更新 CHANGELOG，或已进入该阶段
- 本轮存在用户可感知变化

允许：
- 更新正式 CHANGELOG
- 只记录用户可感知变更

---

## 3. change-id 规则

格式要求：
- 动词-名词
- 全小写
- 短横线连接

示例：
- add-2fa
- fix-login-error
- unify-toolbar-actions
- remove-legacy-player

若需求明确但用户未提供 change-id：
- 可先建议一个 change-id，待确认后再正式使用

若需求模糊：
- 先索取最小必要信息，不生成正式 change-id

---

## 4. 目录结构

```text
openspec/
├── changes/
│   └── <change-id>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/
│           └── <capability>/spec.md
├── archive/
│   └── <period>/
│       └── <change-id>/
└── specs/
    └── <capability>/spec.md
```

period 推荐格式：

2026-Q1
2026-Q2

---

## 5. stable spec 与 change delta

### stable spec

位置：

`openspec/specs/*`

用途：

- 描述当前系统长期有效、可独立阅读的正式规则
- 表达当前真实行为，不保留临时增量措辞

### change delta

位置：

`openspec/changes/<change-id>/specs/*`

用途：

- 描述本次变更准备新增、修改、移除或重命名的规则

允许的段落：

- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`
- `## RENAMED Requirements`

---

## 6. 什么时候必须写 spec delta

是否必须写 spec delta，判断口径与 `AGENTS.md` 一致。常见必须写的场景：

- 新增用户可见功能
- 修改现有业务流程或行为
- 修改 API 行为
- 修改权限、校验、安全策略
- 修改跨页面/跨模块一致性规则
- 修复会改变实际行为或契约的 Bug

通常不写的场景：

- 纯重构（无行为变化）
- 性能优化（无行为变化）
- 测试补充
- 文档、注释、格式调整
- 构建脚本或 CI 调整（无用户可感知影响）

---

## 7. CHANGELOG 与 dev-log

CHANGELOG 与开发过程记录的分工以 `AGENTS.md` 和 `openspec/specs/project-maintenance/spec.md` 为准。
当前文档只保留执行摘要：

- 正式 `CHANGELOG.md` 只记录用户可感知变化
- 开发中的验证结论、范围说明、风险记录优先写入 `docs/dev/dev-log.md`
- 未进入 `main` 前，不把过程性说明写进正式 `CHANGELOG.md`

正式 CHANGELOG 常见分类：

- `Added`
- `Changed`
- `Fixed`
- `Deprecated`
- `Removed`
- `Security`

---

## 8. Proposal 阶段最小检查

在产出 proposal / design / spec 前，至少先检查：

- 这次改动的完整功能链路是什么
- 上游入口 / 当前承接 / 下游回写 / 回退路径是什么
- 是否会破坏功能连续性
- 测试影响是什么
- 有哪些潜在未覆盖风险
- 这次需求是否同时暴露旧规则漂移、重复语义、缺失测试、缺失文档或边界不清
- 哪些不稳定点必须本轮顺手收口，哪些明确不收，以及原因是什么

若仓库已有功能链路文档或模块说明，优先复用。

---

## 9. 输出格式

默认输出顺序：

- 当前阶段
- change-id（若未确认则说明建议值）
- 要创建/修改的文件
- 具体内容或操作步骤

若信息不足，只输出：

- 当前阶段
- 缺少的信息
- 一个可直接填写的最小模板

---

## 10. 模板

### proposal.md

# 变更提案：<标题>

## Status
draft

## Why
业务背景：
当前问题：
用户价值：

## What Changes
- 变更项 1
- 变更项 2

## Stability Closure
### In This Round
- 本轮顺手收口项 1
- 本轮顺手收口项 2

### Not In This Round
- 暂不处理项 1：原因
- 暂不处理项 2：原因

### Risk Tracking
- 延后原因：
- 风险记录位置：

## Scope

### In Scope
- 范围内项 1
- 范围内项 2

### Out of Scope
- 不在本次范围的内容

## Impact
影响的规范：
影响的模块：
是否涉及 API 变更：是 / 否
是否涉及前端交互变化：是 / 否
是否影响缓存策略：是 / 否
是否影响测试基线：是 / 否
兼容性：向后兼容 / 破坏性变更
风险点：

### design.md

# 设计说明：<标题>

## Status
draft

## Current Flow
当前入口：
当前处理链路：
当前回写：
当前回退路径：

## Problem
当前问题：
不一致点 / 不稳定点：

## Stability Closure
### In This Round
- 本轮顺手收口项 1
- 本轮顺手收口项 2

### Not In This Round
- 暂不处理项 1：原因
- 暂不处理项 2：原因

## Decision
设计决策 1：
设计决策 2：

## Risks
风险 1：
风险 2：
延后原因：
风险去向：

## Validation
验证方式：
回归范围：
未覆盖风险：
本轮已收口的不稳定点：
明确延后的不稳定点：

### tasks.md

# 任务清单

## Status
draft

## 实施
- [ ] 任务 1
- [ ] 任务 2
- [ ] 完成本轮已识别稳定性缺口的最小必要收口
- [ ] 明确记录本轮不收项、延后原因与风险去向

## 验证
- [ ] 测试任务 1
- [ ] 测试任务 2
- [ ] 检查本轮未收口项是否已记录原因与风险

## 文档
- [ ] 更新相关说明文档
- [ ] 更新 `docs/dev/dev-log.md` 或补充验证记录
- [ ] 在记录中写清本轮收口项 / 明确不收项
- [ ] 如本次完成态收尾结果已进入或将直接进入 `main`，且存在用户可感知变化，再更新正式 `CHANGELOG.md`

### spec delta

# 规范文档：<capability>

## ADDED Requirements

### Requirement: <名称>
系统应...

#### Scenario: <场景>
WHEN ...
THEN ...
AND ...

## MODIFIED Requirements

### Requirement: <名称>
修改后系统应...

#### Scenario: <场景>
WHEN ...
THEN ...
AND ...

## REMOVED Requirements

### Requirement: <名称>
移除原因：...

## RENAMED Requirements

### Requirement: <旧名称> -> <新名称>
重命名原因：...

---
