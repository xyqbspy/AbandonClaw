## Context

`chunks` 页面当前是表达资产的核心工作台，承接从 scene 学习沉淀后的表达、句子、关系、cluster、expression map 和 review 入口。它的价值明确，但页面已经同时暴露太多同级动作，容易让普通用户在“我现在该复习、查看、整理还是生成？”之间犹豫。

现有正式契约主要覆盖数据副作用：保存表达、保存句子、relation、cluster、AI enrich、review session 和缓存刷新。此次设计不改变这些后端语义，而是把用户可见动作重新分层，保证 `chunks` 更像“表达资产使用入口”，而不是一组维护工具的平铺。

## Goals / Non-Goals

**Goals:**

- 让 `chunks` 首页主路径聚焦表达资产的查看、筛选、详情、复习和来源场景回流。
- 将 relation、cluster、expression map、AI 候选生成等高级整理能力收进详情上下文或更多操作中。
- 明确 sentence 条目不是 expression review 条目，避免展示“待开放”或未完成能力口吻。
- 降低 `chunks/page.tsx` 的持续复杂度，优先按动作域拆分页面私有逻辑和组装组件。
- 保留既有数据副作用契约，避免 UI 收口引起 relation / cluster / review 写入漂移。

**Non-Goals:**

- 不改变 `phrases`、`user_phrases`、`user_phrase_relations`、`user_expression_clusters` 等数据模型。
- 不改变 review 调度、review session 协议或表达复习评分。
- 不删除 AI 候选、expression map、cluster 维护、move / detach / merge 等高级能力。
- 不把 `FocusDetailSheet`、`ExpressionMapSheet`、`MoveIntoClusterSheet` 抽到 `src/components/shared`。
- 不处理 scene 循环复习内部命名。

## Decisions

### Decision 1: 主页面只承载“资产使用”动作

`chunks` 首页保留搜索、筛选、表达列表、进入详情、开始/继续复习、打开来源场景等直接服务用户学习闭环的动作。高级整理动作不在首页作为同级主按钮出现。

原因：产品北极星关注表达能否被回忆、使用、迁移；首页主路径应降低决策成本。

备选方案：继续保留所有能力同级展示。该方案实现成本最低，但会继续放大工作台噪音，不解决本次问题。

### Decision 2: 高级整理能力保留，但进入详情上下文

relation、cluster、expression map、AI 生成候选、移动到 cluster、删除/完成等动作仍然存在，但应围绕当前表达详情、当前关系 tab 或更多操作出现。

原因：这些能力依赖当前表达、当前 relation 或 cluster 上下文，放在详情里比放在首页更符合用户意图，也更容易保留数据副作用边界。

备选方案：删除高级能力。该方案会损害表达资产维护能力，不符合本轮“不删能力，只调层级”的边界。

### Decision 3: 句子条目使用“来源场景巩固 / 表达提取”路径

sentence 条目不进入 expression review 主按钮语义，不展示“句子复习待开放”。如果用户点击句子主动作，应得到明确下一步：回到来源场景巩固，或在句子详情里提取表达。

原因：稳定数据契约中句子默认不进入 expression review。UI 必须反映这一点，避免把未实现能力伪装为主路径。

备选方案：为句子强行接入 review session。该方案会改变 review 语义和调度，不属于本轮。

### Decision 4: 先做页面内动作域拆分，不做公共化

实现时优先把 `chunks/page.tsx` 的列表加载、详情动作、manual composer、relation/cluster 操作、sheet 组装等动作域拆到页面私有 hook / selector / view-model / subcomponent。只有已经稳定跨 feature 复用的展示语义才考虑 shared。

原因：当前复杂度来自业务动作混杂，不是缺少公共组件。贸然 shared 会把 feature 内部状态泄漏成通用 props。

备选方案：先抽通用 panel / card / action row。该方案容易得到空泛组件，并增加未来语义漂移风险。

## Risks / Trade-offs

- [Risk] 收起高级整理入口后，熟练用户可能觉得操作变深 → Mitigation: 高级入口必须从详情上下文稳定可达，保留键路径和测试覆盖。
- [Risk] UI 层级调整可能破坏 relation / cluster / review 副作用 → Mitigation: 实现任务必须跑现有 chunks unit / interaction，并对核心动作保留或补充断言。
- [Risk] 页面拆分过程中误把业务容器抽到 shared → Mitigation: tasks 明确禁止公共化强业务容器，必要时同步 `component-library.md`。
- [Risk] 句子条目路径改动可能影响用户从句子沉淀表达 → Mitigation: 不移除句内表达提取入口，只改主 CTA 和提示口径。
- [Risk] `chunks/page.tsx` 一次性拆分过大 → Mitigation: 先按最小动作域拆分，保留路由、筛选和最终组装在 page 层。

## Migration Plan

1. 先实现主路径文案和动作层级调整，确保核心入口仍可达。
2. 再按动作域拆分页面私有逻辑，避免一次性重写。
3. 同步测试断言和必要维护文档。
4. 如发现数据副作用漂移，优先修正实现而不是扩大本轮范围。

回滚策略：由于不涉及数据库和 API 协议，若交互风险过高，可以回退 UI 层级改动，保留文案和测试收口。

## Open Questions

- expression map 在首页是否保留一个轻量入口，还是完全放入详情/更多操作，需要实现前结合当前 UI 确认。
- 句子条目的默认主 CTA 是“回到来源场景”还是“查看句内表达”，需要根据现有来源字段可用性决定。

## Stability Closure

### 不稳定点

- `chunks` 工作台主路径和高级整理路径没有 stable spec 约束。
- 句子条目、表达条目、cluster 整理的用户动作层级混在一起。
- 页面复杂度被文档识别但缺少本轮可执行拆分边界。

### 本轮收口

- 新增 `chunks-workbench-user-path` spec。
- 为 `chunks-data-contract` 增加 UI 层级变化不得破坏副作用契约的要求。
- tasks 中要求实现时同步测试与维护文档。

### 明确延后

- 数据模型、review 算法、AI 生成策略、scene 循环播放命名均延后，风险分别由已有 stable spec 和后续单独 change 承接。
