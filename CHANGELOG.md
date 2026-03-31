# Changelog

本文档用于记录仓库内每次实际改动，方便回看变更范围、验证情况和潜在风险。

记录约定：
- 每次实际改动后都要追加一条记录
- 记录至少包含日期、摘要、影响范围、验证情况
- 如果未完成验证，要明确写出剩余风险

## 2026-03-31

### 前置原则沉淀到维护规范

- 将 `AGENTS.md` 中的三条工作前置原则沉淀进 `openspec/specs/project-maintenance/spec.md`
- 补充稳定要求：实施前评估完整功能链路、评估功能连续性、评估测试影响
- 更新 `docs/openspec-workflow.md`，把三条前置原则并入 OpenSpec 日常流程
- 更新 `docs/project-maintenance-playbook.md` 的改动前后检查清单
- 新增 `docs/change-intake-template.md`，作为非微小改动的通用接入模板
- 为 `openspec/changes/consolidate-detail-composition` 新增 `implementation-intake-template.md`
- 更新 `openspec/changes/consolidate-detail-composition/tasks.md`，把实施前检查模板纳入任务

影响范围：
- 项目维护规范
- OpenSpec 使用流程
- 改动前后检查清单

验证情况：
- 已执行 `pnpm run spec:validate`
- 已执行 `openspec change validate consolidate-detail-composition --strict --no-interactive`

备注：
- 本次为规范层更新，没有引入业务逻辑或交互行为变更

### Lesson 详情底部动作样式收敛

- 在 `src/features/lesson/components/selection-detail-primitives.tsx` 抽出底部 footer action 共享样式：`selectionFooterButtonClassName`、`selectionFooterSecondaryButtonClassName`、`selectionFooterPrimaryButtonClassName`
- 让 `SelectionDetailActions` 的按钮层级与现有详情 footer 动作样式保持一致，减少后续 lesson/chunks 详情页分叉
- 为“加入复习”按钮补充 `RotateCcw` 图标，保证动作识别一致性
- 修复同文件内受编码影响的中文文案异常，统一回到 UTF-8 可维护状态

影响范围：
- lesson 详情页底部动作样式
- `SelectionDetailActions` 视觉一致性
- `selection-detail-primitives.tsx` 文案可维护性

验证情况：
- 已执行 `pnpm run test:interaction -- "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- 当前项目脚本会触发整套 interaction 测试，实测 `196` 项通过、`0` 失败

备注：
- 本次未调整底部动作的业务行为，只收敛样式与文案编码，功能链路保持不变

### 场景详情移除不可达的核心句前置步骤

- 将场景详情页里 `practice_sentence` 的主 CTA 从旧的“去练核心句”提示改为直接进入场景练习，不再要求用户先执行已下线的训练条步骤
- 将训练浮层步骤展示从显式的“练核心句”收敛为“开始练习”，保留服务端 `practice_sentence` 状态兼容，但不再把它当成用户侧独立流程
- 统一更新 `scene-detail-messages`、`scene-training-copy`、today continue learning 与今日学习路径文案，避免不同入口继续暴露旧步骤
- 删除已无入口的 `notifySceneSentenceStepHint` 提示逻辑，并补齐相关单测与场景详情页回归测试

影响范围：
- 场景详情页训练浮层 CTA
- 场景训练步骤展示与 continue learning 文案
- today 学习路径与继续学习卡片

验证情况：
- 已执行 `pnpm run test:interaction:scene-detail`
- 已执行 `pnpm run test:unit -- src/lib/shared/scene-training-copy.test.ts src/features/today/components/today-page-selectors.test.ts`
- 由于当前脚本会跑全量 unit 集合，实测 `151` 项通过、`0` 失败
- 已执行 `pnpm run spec:validate`

备注：
- 本次保留后端 `practice_sentence` 状态字段，仅移除用户侧不可达前置步骤，避免影响旧学习记录与服务端兼容性

### 场景详情统计文案去除旧的核心句命名

- 将场景详情训练浮层统计里的“核心句 x 句”改为“已记录练习句数 x 句”，避免用户侧继续看到旧流程术语
- 同步更新相关场景详情回归测试标题，使测试语义与当前产品流程保持一致

影响范围：
- 场景详情训练浮层统计文案
- scene detail 回归测试可维护性

验证情况：
- 已执行 `pnpm run test:interaction:scene-detail`
- 实测 `21` 项通过、`0` 失败

备注：
- 本次仅调整展示层与测试描述，未改动学习状态字段或流程推进逻辑

### 测试命名继续收口旧流程术语

- 将 today continue learning 测试名中的“练核心句”旧表述更新为“已并入练习的旧步骤”
- 让测试描述与当前产品流程保持一致，减少后续排查时被旧命名误导

影响范围：
- today continue learning 单测可读性

验证情况：
- 已执行 `pnpm run test:unit -- src/features/today/components/today-page-selectors.test.ts`
- 由于当前脚本会跑全量 unit 集合，实测 `151` 项通过、`0` 失败

备注：
- 本次仅调整测试命名，不涉及业务逻辑或展示行为变化

### OpenSpec 学习闭环规范同步当前步骤定义

- 重写 `openspec/specs/learning-loop-overview/spec.md` 为干净 UTF-8 版本，避免继续在乱码规范上叠加维护
- 在稳定规范中明确当前用户可见学习步骤应为“听熟这段 -> 看重点表达 -> 开始练习 -> 解锁变体”
- 明确 `practice_sentence` / `sentence_practice` 仅作为内部兼容状态保留，用户侧不得再暴露独立“练核心句”前置步骤

影响范围：
- OpenSpec 稳定规范
- 学习闭环维护基线

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅同步规范定义，不改动业务代码或学习状态字段

### 维护手册同步当前学习链路并修复编码

- 重写 `docs/project-maintenance-playbook.md` 为干净 UTF-8 版本
- 在维护手册中补齐当前稳定学习链路、“练核心句已并入开始练习”的说明、维护重点、测试策略与 OpenSpec 使用入口
- 保持维护手册与当前代码、测试、OpenSpec 主规范的一致性，降低新维护者理解成本

影响范围：
- 项目维护文档
- 新维护者入门路径

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅更新维护文档，不涉及业务逻辑、状态字段或交互行为变化

### OpenSpec 工作流与变更接入模板修复编码

- 重写 `docs/openspec-workflow.md` 为干净 UTF-8 版本，统一记录建 change、validate、archive 和仓库实践约定
- 重写 `docs/change-intake-template.md` 为干净 UTF-8 版本，保留完整链路、功能连续性、测试影响和 OpenSpec 判断四类检查
- 让维护文档入口与当前 OpenSpec 主规范、维护手册保持同一套表述

影响范围：
- OpenSpec 维护文档
- 非微小改动的接入流程

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅更新文档，不涉及业务逻辑、状态字段或交互行为变化

## 2026-03-30

### OpenSpec 初始化与维护规范落地

- 初始化本地 OpenSpec 结构，新增 `openspec/` 与 `.codex/skills/openspec-*`
- 补充 `openspec/config.yaml` 项目上下文，写入技术栈、主链路、测试约定与 changelog 规则
- 新增 OpenSpec 稳定规范：
- `openspec/specs/project-maintenance/spec.md`
- `openspec/specs/learning-loop-overview/spec.md`
- 新增维护文档 `docs/project-maintenance-playbook.md`，梳理项目主逻辑、目录职责、回归点和 OpenSpec 用法
- 更新 `AGENTS.md`，要求每次实际改动后同步维护 `CHANGELOG.md`
- 新增脚本：
- `pnpm run spec:list`
- `pnpm run spec:validate`
- 新建 OpenSpec change：`openspec/changes/unify-detail-footer-actions/`
- 为该 change 补齐 `proposal.md`、`design.md`、`tasks.md` 和 delta spec
- 为 `unify-detail-footer-actions` 补充 `project-maintenance` 的 modified delta
- 在 `README.md` 增加 OpenSpec 维护工作流入口说明
- 新增 `docs/openspec-workflow.md`，补充建 change、delta spec、validate、archive 的完整流程
- 为 `unify-detail-footer-actions` 新增 `archive-checklist.md`
- 在 `docs/project-maintenance-playbook.md` 中补充 archive 前检查入口
- 归档 `unify-detail-footer-actions`，并在主 specs 中新增 `openspec/specs/detail-footer-actions/spec.md`
- 完善 `openspec/specs/detail-footer-actions/spec.md` 的正式 Purpose
- 新建第二条 OpenSpec change：`consolidate-detail-composition`
- 围绕 lesson/chunks 详情组件的共享基元边界与领域差异边界补充 `proposal.md`、`design.md`、`tasks.md` 与 delta specs

影响范围：
- 维护流程
- OpenSpec 使用方式
- 项目文档与团队协作规则

验证情况：
- 已执行 `openspec init --tools codex --force`
- 已执行 `pnpm run spec:list`
- 已执行 `pnpm run spec:validate`
- 已执行 `openspec change validate unify-detail-footer-actions --strict --no-interactive`
- 已执行 `openspec archive unify-detail-footer-actions --yes`
- 已执行 `openspec change validate consolidate-detail-composition --strict --no-interactive`

备注：
- 仓库中已有部分文档存在编码异常；本次新增维护文档均使用 UTF-8 独立落地，后续以新文档为准持续维护
