## Context

当前 `chunks` 页面不是简单的收藏页，而是一个表达资产工作台。它至少包含以下几条链路：

- 手动新建 expression / sentence
- 从句子里提取 expression
- 手动输入后请求 AI 生成同类/对照表达，再批量保存
- 在 focus detail 中基于当前表达生成同类/对照候选并保存
- 写入 `user_phrase_relations`
- 维护 `user_expression_clusters` / `user_expression_cluster_members`
- 将保存结果纳入 daily stats、scene saved phrase 统计与 review 入口

这些链路目前都能工作，但职责分布在 `chunks/page.tsx`、多个 hooks、`phrases-api.ts` 和 `phrases/service.ts` 中。前端知道很多业务细节，后端也隐式承担 cluster / relation / review / stats 侧效果，没有一份稳定说明把“页面动作 -> API -> service -> 数据表 -> 页面反馈”的对应关系串起来。维护者一旦只改局部，就很容易影响 `today -> scene -> chunks -> review` 主链路。

## Goals / Non-Goals

**Goals:**

- 定义 `chunks` 页面各项核心动作与后端数据写入之间的关系，包括 relation、cluster、AI enrich、daily stats 和 review 入口。
- 明确 `chunks` 页面编排层、hooks、API 调用层与 service 层的职责边界。
- 输出一份可维护的 chunks 专项映射文档，便于后续维护和回归。
- 明确受影响测试边界，减少只改前端或只改 service 导致的链路断裂。

**Non-Goals:**

- 不在这次提案里重做 `chunks` 页面 UI 布局或视觉样式。
- 不默认新增新的 AI 能力、cluster 模型或 review 策略。
- 不扩大到 scene / today / review 全量文档重写，只覆盖它们和 chunks 直接相连的数据与动作关系。

## Decisions

### 1. 以“动作链路”为主线梳理 chunks，而不是只按页面组件分块

原因：

- `chunks` 问题不在于某个组件太复杂，而在于一条动作会跨越页面、hook、API、service 和多个数据表。
- 用“手动新建 / focus assist / quick add / cluster / review”来组织文档和契约，更贴合实际维护入口。

备选方案：

- 按文件树梳理：能覆盖文件，但难解释跨层行为。
- 只按数据表梳理：能覆盖持久化，但不利于前端维护者理解入口。

### 2. 把 `phrases/service.ts` 视为 chunks 数据语义主来源，前端 hooks 只负责动作编排与页面反馈

原因：

- `savePhrase`、批量保存、relation 对称写入、cluster 合并、daily stats 增量和 enrich 状态最终都在 service 层落地。
- 前端如果继续隐式承担 cluster / relation 语义判断，后续很容易和服务端真实规则脱节。

备选方案：

- 在 hooks 里继续分散保存规则：开发快，但维护边界继续模糊。

### 3. 单独输出 chunks 数据映射文档，覆盖“页面动作 -> API -> service -> 表结构副作用 -> 页面刷新”

原因：

- chunks 的维护问题是典型的跨层问题，仅靠 spec 不够适合快速查动作和字段。
- 文档能直接回答“保存一个 similar 候选后到底发生了什么”这类维护问题。

备选方案：

- 只补注释：分散且不利于跨层阅读。
- 只补测试：能证明行为，但不能代替维护说明。

### 4. 把 relation / cluster / review 副作用明确列为受影响变更的强校验点

原因：

- `chunks` 的改动最容易在“主功能可用，但副作用丢了”这种地方出问题。
- 必须把关系写入、cluster 同步、缓存失效、review 入口、daily stats 一起纳入维护清单。

## Risks / Trade-offs

- [风险] 文档只写概念，不足以指导维护 -> [缓解] 文档必须按动作链路列出 API、service、关键字段和副作用。
- [风险] chunks 实现历史较散，梳理后暴露更多职责混杂问题 -> [缓解] 提案先聚焦契约和维护边界，不预先承诺大重构。
- [风险] 只补文档不收边界，后续仍然漂移 -> [缓解] 同步要求补测试，并在实现阶段尽量提炼统一 helper 或边界说明。
- [风险] 过度把所有逻辑收回 service，影响前端交互灵活度 -> [缓解] 保留前端 hooks 的编排职责，但把业务语义主判断固定在后端与契约层。
