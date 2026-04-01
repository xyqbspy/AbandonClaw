# Chunks 页面数据映射与维护说明

## 1. 目标

这份文档用于维护 `chunks` 页面里“页面动作 -> 前端 API -> 后端 service -> 数据副作用 -> 页面刷新”的稳定契约。

重点覆盖这些高频链路：

- 手动新建表达
- 手动新建句子
- 从句子卡片提取表达
- 生成同类表达
- 生成对照表达
- Quick Add 直接挂接关联表达
- expression cluster 维护
- expression map 批量导入
- review 入口

维护原则：

- `page.tsx` 负责编排、反馈、刷新与视图状态
- hook 负责稳定的动作语义，不在多个入口重复拼 payload
- `/api/phrases/*` 负责前端协议
- `src/lib/server/phrases/service.ts` 负责 phrase / relation / cluster / stats 的真实写入语义
- `src/lib/server/expression-clusters/service.ts` 只负责 cluster 结构维护，不负责 phrase 保存

## 2. 关键后端实体

### 2.1 `phrases`

- 保存标准化后的表达或句子实体
- 负责 `normalized_text`、翻译、usage note、tags 等基础信息

### 2.2 `user_phrases`

- 保存用户维度的学习条目
- `learning_item_type` 区分 `expression` / `sentence`
- `source_*` 字段记录来源句子、来源场景、来源片段
- review 状态、AI enrich 状态、学习附加信息也落在这里

### 2.3 `user_phrase_relations`

- 维护 `similar` / `contrast`
- 由 `phrases/service.ts` 对称写入双向 relation
- 新 relation 写入前会删除相反类型的旧 relation，避免同一对表达同时既相似又对照

### 2.4 `user_expression_clusters` / `user_expression_cluster_members`

- 表达簇与成员关系
- `phrases/service.ts` 决定“这次保存是否应该同步 cluster”
- `expression-clusters/service.ts` 负责 `ensure / set main / merge / move / detach`

### 2.5 `user_daily_learning_stats`

- 新保存 phrase 时递增 `phrases_saved`
- `chunks` 页不自己算统计，统一依赖后端落表

## 3. 前端入口与职责

### 3.1 页面编排层

- 文件：[page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/page.tsx)
- 负责 sheet 开关、toast、列表刷新、focus detail 交互、map / cluster / review 入口

### 3.2 动作 hook

- [use-manual-expression-composer.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-manual-expression-composer.ts)
- [use-manual-sentence-composer.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-manual-sentence-composer.ts)
- [use-focus-assist.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-focus-assist.ts)
- [use-generated-similar-sheet.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-generated-similar-sheet.ts)
- [use-expression-cluster-actions.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-expression-cluster-actions.ts)
- [use-saved-relations.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-saved-relations.ts)

### 3.3 保存契约 helper

- 文件：[chunks-save-contract.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-save-contract.ts)
- 统一收口这些字段的拼装：
  - `sourceNote`
  - `relationType`
  - `relationSourceUserPhraseId`
  - `expressionClusterId`
  - `sourceSentenceText`
  - `sourceChunkText`

如果未来改动这几项语义，优先改这里，再改文档和回归测试。

## 4. 核心动作链路

### 4.1 手动新建表达

入口：

- `chunks` 页面手动录入 sheet
- [use-manual-expression-composer.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-manual-expression-composer.ts)

前端行为：

- 无 assist 时直接 `savePhraseFromApi`
- 保存成功后尝试 `enrichSimilarExpressionFromApi`

后端写入：

- `phrases`
- `user_phrases`
- `user_daily_learning_stats.phrases_saved`
- 若为 expression，会确保至少存在 singleton cluster

页面反馈：

- 关闭 sheet
- 重新加载 `chunks` 列表
- 如选择“保存并复习”，进入 review session

### 4.2 手动新建表达 + AI assist

入口：

- `loadManualExpressionAssist`
- `saveManualExpression`

保存规则：

- base expression 使用 `buildManualBaseExpressionSavePayload`
- `similar` 候选使用 `manual-similar-ai`
- `contrast` 候选使用 `manual-contrast-ai`
- 只有 `similar` 会携带 `expressionClusterId`
- 只有在存在 base 表达时，similar / contrast 才会带 `relationSourceUserPhraseId`

后端语义：

- similar 可能创建或并入 cluster
- contrast 只写 relation，不应并入同类 cluster
- 成功保存的候选会再走批量 enrich

### 4.3 手动新建句子

入口：

- [use-manual-sentence-composer.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-manual-sentence-composer.ts)

前端行为：

- 先请求 manual sentence assist，抽取翻译、usage note、extracted expressions
- 再以 `learningItemType: "sentence"` 保存

后端语义：

- 句子条目写到 `user_phrases`
- review 默认归档，不进入 expression review 流
- `source_chunk_text` 记录抽取出的表达列表，供后续页面提取使用

### 4.4 Focus Assist 保存同类 / 对照表达

入口：

- [use-focus-assist.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-focus-assist.ts)

保存规则：

- `focus-similar-ai`：带 relation，继承当前 `expressionClusterId`
- `focus-contrast-ai`：带 relation，不继承 cluster

后端语义：

- similar 写 relation 后可继续并入 cluster
- contrast 写 relation 后不会触发同类 cluster 合并

页面反馈：

- 保存成功后刷新 focus detail
- 相关 relations cache 需要失效

### 4.5 生成同类表达

入口：

- [use-generated-similar-sheet.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-generated-similar-sheet.ts)

保存规则：

- 先确保种子表达属于某个 cluster
- 候选使用 `similar-ai-mvp`
- 候选统一带 `relationType: "similar"` 与 `expressionClusterId`

后端语义：

- 写 relation
- 并入种子 cluster
- 再做批量 enrich

页面反馈：

- 立即加载 cluster
- 应用 cluster filter
- 关闭 sheet

### 4.6 Quick Add 直接添加关联表达

入口：

- `page.tsx` 里的 `handleSaveQuickAddRelated`

保存规则：

- `manual-similar-direct`
- `manual-contrast-direct`
- 一律带 `relationSourceUserPhraseId`
- 只有 similar 才允许后端继续做 cluster 同步

后端语义：

- 如果表达已存在，会复用现有 `phrase`
- relation 仍按新的用户条目写入
- 保存后递增当日 `phrases_saved`

页面反馈：

- reload phrases
- `invalidateSavedRelations`
- 切到对应 tab

### 4.7 从句子卡片提取表达

入口：

- `page.tsx` 里的 `saveExpressionFromSentence`

前端行为：

- 从句子条目的 `sourceChunkText` 解析表达候选
- 单条表达走 `savePhraseFromApi`

后端语义：

- 写 expression 类型 `user_phrase`
- 自动确保 cluster
- 进入 expression review 语义

### 4.8 Expression Map 批量加入当前 cluster

入口：

- `page.tsx` 里的 `handleAddClusterToReview`

前端行为：

- 若当前主表达还没有 cluster，先用 `create-cluster:*` 建种子
- 再批量保存 map cluster 里的其它表达

后端语义：

- 批量保存的表达会并入指定 cluster
- 这是 cluster 扩容链路，不写 explicit similar/contrast relation

## 5. `phrases/service.ts` 与 `expression-clusters/service.ts` 的边界

### 5.1 `phrases/service.ts`

负责：

- phrase entity upsert
- user phrase upsert
- relation 对称写入
- opposite relation 清理
- 是否同步 cluster 的判断
- AI enrich 状态回写
- daily stats 与 scene saved phrase 计数

不负责：

- 用户主动 set main / merge / move / detach 的 UI 操作决策

### 5.2 `expression-clusters/service.ts`

负责：

- cluster singleton ensure
- set main
- merge
- move member
- detach member

不负责：

- phrase 基础保存
- relation 语义
- daily stats
- review 语义

## 6. 稳定约束

### 6.1 source note 约束

当前固定值：

- `manual-similar-ai`
- `manual-contrast-ai`
- `focus-similar-ai`
- `focus-contrast-ai`
- `manual-similar-direct`
- `manual-contrast-direct`
- `similar-ai-mvp`

如果新增 `sourceNote`，必须同步检查：

- `src/lib/server/phrases/service.ts` 中的 similar / contrast 判定
- 本文档
- `chunks-save-contract.test.ts`

### 6.2 cluster 约束

- expression 保存后最终都会被 `ensureExpressionClusterForPhrase` 收进某个 cluster
- 但只有 similar 链路允许把候选并入已有 cluster
- contrast 不得因为 UI 传了关联关系就并入 similar cluster

### 6.3 刷新约束

这些动作完成后必须至少触发其一：

- `loadPhrases(..., { preferCache: false })`
- `invalidateSavedRelations(...)`
- `onLoadCluster(...)`
- 应用 cluster filter 或切换 focus detail tab

## 7. 回归测试建议

每次改 `chunks` 保存语义时，至少检查：

- [use-manual-expression-composer.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-manual-expression-composer.test.tsx)
- [use-focus-assist.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-focus-assist.test.tsx)
- [use-generated-similar-sheet.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/use-generated-similar-sheet.test.tsx)
- [chunks-save-contract.test.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-save-contract.test.ts)
- 受影响时补充 [page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/page.interaction.test.tsx)

## 8. 维护清单

如果你准备改 `chunks` 保存链路，按这个顺序做：

1. 先判断是 expression、sentence、similar、contrast、cluster 还是 review 入口变化。
2. 先看 [chunks-save-contract.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-save-contract.ts) 是否需要改。
3. 再看 [service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/phrases/service.ts) 的 relation / cluster / stats 语义是否要改。
4. 如影响 cluster 结构操作，再看 [service.ts](/d:/WorkCode/AbandonClaw/src/lib/server/expression-clusters/service.ts)。
5. 最后同步更新本文档、测试和 OpenSpec spec delta。

### 4.9 删除当前表达的稳定契约（2026-04-01 追加）

入口：
- `useExpressionClusterActions.deleteFocusDetailExpression`
- `DELETE /api/phrases/[userPhraseId]`
- `deleteUserPhraseForUser`

后端规则：
- 删除的是当前 cluster 主表达，且 cluster 还有剩余成员时，后端必须先补位新的 `main_user_phrase_id`，再删除当前 `user_phrase`。
- 删除后 cluster 已无成员时，后端必须删除空 cluster，并在返回值里明确 `clusterDeleted = true`。
- 前端不得自行猜测补位结果，只消费后端返回的 `nextMainUserPhraseId` / `nextFocusUserPhraseId` / `clusterDeleted`。

详情回退：
- `clusterDeleted = true` 时，详情必须关闭，避免停留在已删除的空簇。
- `nextMainUserPhraseId` 或 `nextFocusUserPhraseId` 有值时，详情应切换到新的可用表达。
- 删除的如果不是当前主表达，则主表达保持不变，只刷新受影响的 related rows 和计数。
