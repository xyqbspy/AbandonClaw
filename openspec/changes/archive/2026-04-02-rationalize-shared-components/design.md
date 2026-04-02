## Context

当前组件分层已经有一部分基础：

- `src/components/ui` 放通用 UI primitives
- `src/components/shared` 放跨页面可复用的业务无关组件
- `src/components/audio` 放音频动作组件
- `src/features/*/components` 放 feature 自己的界面与组装

但随着功能扩展，已经出现一些边界模糊的情况：

- `src/features/lesson/components/selection-detail-primitives.tsx` 直接依赖 `src/features/chunks/components/detail-info-blocks.tsx`
- `src/features/lesson/components/selection-detail-primitives.tsx` 也直接依赖 `src/features/chunks/components/example-sentence-cards.tsx`
- 这说明至少有一批组件已经不再是 `chunks` feature 私有，而是跨 `lesson/chunks` 共享
- 同时，仓库缺少一份明确的组件分层说明，新组件是否该进入公共层，更多依赖即时判断而不是稳定规则

问题不在于“公共组件太少”，而在于“哪些组件其实已经是公共组件，但还待在 feature 目录里”。如果不处理，后续会越来越容易出现 feature 间互相 import 组件，逐步把组件树拉成横向耦合网。

## Goals / Non-Goals

**Goals:**

- 为仓库建立明确的组件分层规则
- 迁移已经被跨 feature 复用的组件到公共层
- 消除明显的 feature-to-feature 组件依赖
- 新增组件库说明文档，帮助后续维护者快速判断组件归属

**Non-Goals:**

- 不追求把所有相似组件都抽象到公共层
- 不重写整套设计系统或样式 token
- 不为了“看起来统一”而牺牲 feature 语义，feature 私有组件仍应保留在 feature 内

## Decisions

### 1. 只迁移“已经跨 feature 复用”的组件，不做大面积预防性抽象

决策：这次优先迁移已经被多个 feature 直接 import 的组件，而不是扫一遍所有相似组件并强行统一。

原因：

- 已发生的跨 feature 复用最能说明“这个组件已经是公共职责”
- 这样能控制改动面，避免把 feature 语义过早抽空

初步候选：

- `src/features/chunks/components/detail-info-blocks.tsx`
- `src/features/chunks/components/example-sentence-cards.tsx`

### 2. 组件公共化优先进入 `src/components/shared`，特殊领域组件进入专门命名空间

决策：迁移后的组件优先放在 `src/components/shared`；如果某类组件已经形成稳定子域，例如音频动作、管理台、布局，再进入对应公共目录。

原因：

- 当前仓库已经有 `shared/audio/layout/admin/ui` 的基本结构
- 继续沿用现有结构，比新建大量目录更稳定

### 3. 组件库说明文档既要列目录规则，也要列“不要抽公共”的反例

决策：组件库说明不能只写“什么是公共组件”，还要明确：

- 页面组装组件继续留在 page / feature
- 强 feature 语义容器不要因为复用一处就急着抽
- 只有当组件语义、输入输出和视觉职责都稳定时，才适合进公共层

原因：

- 仓库真实风险不是“没人知道公共层怎么用”，而是“什么都想抽”
- 反例规则能更有效地控制未来的抽象膨胀

## Risks / Trade-offs

- [迁移路径过大] → 只处理已经确认跨 feature 复用的组件，避免本轮变成全仓库重构
- [公共层继续膨胀] → 文档中明确“何时不该抽公共”，限制公共化范围
- [导入路径回归] → 对受影响组件补交互测试或导入回归测试，迁移后优先跑相关链路
