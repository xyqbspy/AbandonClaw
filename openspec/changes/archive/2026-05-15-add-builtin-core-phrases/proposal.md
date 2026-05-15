# Proposal: 为 Chunks 增加必备表达与 builtin core phrase 体系

## Why

P0 已经补了 builtin starter scenes，P1 让 `/scenes` 能呈现新手路径，P2 让 `/today` 能推荐下一步，但 `Chunks` 仍然主要消费 `user_phrases`。这让新用户即使完成了 starter scene，也很容易在表达资产层看到空状态，无法理解“哪些表达值得长期掌握、如何把它们保存成自己的资产”。

当前缺口有三层：

1. 资产层缺口
   - 系统没有清晰区分“内置推荐表达库”和“用户主动保存后的个人表达资产”。
   - `Chunks` 仍偏后台式列表，缺少适合新用户进入的只读推荐层。

2. 数据与链路缺口
   - `savePhraseForUser` 已具备 `phrase -> user_phrase -> review` 的闭环，但没有 builtin phrase 浏览能力，也没有 `isSaved` 这种用户态映射。
   - starter scenes 与 chunk 数据已经存在，但没有被聚合成面向 Chunks 的高频表达库。

3. 页面与体验缺口
   - `Chunks` 顶层结构没有“我的表达 / 必备表达”分层。
   - 新用户在未主动保存任何表达前，看不到“先从这些高频表达开始”的明确入口。

## What Changes

本轮要做：

1. 为 `phrases` / builtin phrase 数据增加最小元字段或等价复用字段，支持：
   - builtin / core 标记
   - level / category / phraseType
   - source scene 关联
   - frequency / tags

2. 新增 builtin phrase 读接口：
   - `GET /api/phrases/builtin`
   - 支持 `level / category / search / limit`
   - 返回 `isSaved`

3. 复用现有 `POST /api/phrases/save`
   - 支持从 builtin phrase 保存到 `user_phrases`
   - 保持幂等，不重复创建
   - 保存后继续进入现有 review 闭环

4. 改造 `Chunks` 页面为两个入口：
   - `我的表达`
   - `必备表达`
   并按 `newChunks.html` 的移动端方向收口视觉。

5. 补一批 starter / builtin scenes 驱动的 core phrases
   - 第一阶段目标 80-120 条
   - 不自动污染 `user_phrases`

## 本轮收口项

- Builtin phrase 与 user phrase 的职责边界。
- Chunks 新用户空状态的最小闭环。
- `Chunks -> save -> user_phrases -> review -> today/progress` 的现有链路复用。
- 只读 builtin 库的筛选、已保存状态和移动端展示。

## 明确不收项

- 不重构 review 调度算法。
- 不重构 expression cluster 数据结构。
- 不做复杂词典产品、全文词库搜索或 AI 推荐模型。
- 不自动把 builtin phrase 批量塞进 `user_phrases`。
- 不修改 Supabase Auth。

## 风险与延后

- 第一批 builtin phrases 的覆盖范围会偏 starter / daily conversation，不做全品类扩张。
- 如果线上还没有 starter scene / builtin scene 数据，页面会安全降级为友好空状态，而不是强行造假数据。
- 历史 `phrases` 数据模型较轻，本轮只做最小扩展，不顺手做完整 phrase taxonomy。

## 风险记录位置

- 本轮 deferred scope 与验证记录写入 `docs/dev/dev-log.md`
- 稳定契约沉淀到：
  - `openspec/specs/chunks-data-contract/spec.md`
  - `openspec/specs/chunks-workbench-user-path/spec.md`
