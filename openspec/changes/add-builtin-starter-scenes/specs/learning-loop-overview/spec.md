# 规范文档：learning-loop-overview

## ADDED Requirements

### Requirement: Scenes 必须为新用户提供可直接开始的内置入门场景
系统应在 `scenes` 主学习入口中，为没有自建内容的新用户提供一组可直接开始学习的内置日常入门场景，避免用户首次进入时只能看到极少内容或空内容。

#### Scenario: 新用户第一次进入 scenes
- **WHEN** 新用户首次进入 `/scenes`
- **THEN** 系统 MUST 返回一组可见的 builtin starter / daily scenes
- **AND** 这些场景 MUST 自带稳定 slug、标题、预计时长、学习目标与 starter 排序元信息
- **AND** 用户不需要先导入、生成或创建内容才能开始一轮场景学习

#### Scenario: today 没有 continue learning 时回退到 scene list
- **WHEN** `today` 没有进行中的 continue learning 且需要从 scene list 选择 fallback 场景
- **THEN** fallback MUST 能落到一条可直接学习的 builtin starter scene
- **AND** 系统不得把空列表或不适合入门的旧内容作为默认首个学习入口

### Requirement: 内置入门场景必须能进入表达沉淀闭环
系统应确保 builtin starter scenes 中的核心 chunks/phrases 继续通过现有场景正文结构进入表达沉淀与后续复习链路，而不是单独维护一套不可追踪的静态展示内容。

#### Scenario: 用户学习 builtin starter scene
- **WHEN** 用户打开并学习任一 builtin starter scene
- **THEN** 场景正文 MUST 继续承载可追踪的句子与 chunk 信息
- **AND** 用户后续保存表达、追踪 chunks 或进入 review 时，系统 MUST 复用现有主链路能力
- **AND** 本轮实现不得为了默认内容单独新增一套与现有 scene/chunks/review 脱节的数据模型
