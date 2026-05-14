# 规范文档：learning-loop-overview

## ADDED Requirements

### Requirement: Scenes 必须作为移动端优先的学习入口呈现 starter 路径与学习主 CTA
系统 MUST 在 `/scenes` 中优先呈现新用户可直接开始的 starter 路径、继续学习入口与推荐场景，而不是把生成、导入或管理动作置于同级主入口。

#### Scenario: 新用户首次进入 scenes
- **WHEN** 新用户首次打开 `/scenes`
- **THEN** 页面 MUST 展示可直接开始学习的 starter 路径入口
- **AND** 页面 MUST 基于真实 scene list 数据给出至少一个可执行的开始学习 CTA
- **AND** 生成 / 导入等辅助动作 MUST 保留，但不得压过主学习 CTA

#### Scenario: 用户已有继续学习场景
- **WHEN** 用户存在继续学习或可恢复的场景
- **THEN** `/scenes` 页面 MUST 优先展示继续学习 CTA
- **AND** 该 CTA MUST 指向现有 scene detail 学习链路
- **AND** 页面不得为了新的入口展示重新定义一套与既有学习状态冲突的完成语义

### Requirement: Scenes 必须允许用户按基础学习元字段浏览和筛选默认场景
系统 MUST 允许用户在 `/scenes` 中基于现有 scene list 元字段浏览、筛选和排序内置默认场景，以便快速找到适合自己的日常入门内容。

#### Scenario: 用户按 level/category/source_type 筛选场景
- **WHEN** 用户在 `/scenes` 中切换 level、category 或 source_type
- **THEN** 页面 MUST 立即基于当前 scene list 更新结果
- **AND** 筛选逻辑 MUST 兼容字段缺失的旧数据，不得导致页面报错
- **AND** 无结果时 MUST 给出清晰空状态与清除筛选入口

#### Scenario: 页面展示 starter packs
- **WHEN** `/scenes` 渲染推荐路径或 pack 卡片
- **THEN** pack 组合 MUST 基于真实 scenes 数据，而不是硬编码静态 mock
- **AND** Start Here MUST 优先由 starter 类 builtin scenes 组成
- **AND** pack CTA MUST 指向该 pack 内第一个未完成或排序最靠前的场景
