变更提案：提升场景练习题覆盖率

Status

approved

Why

业务背景：
当前 scene 练习已经具备填空、半句复现、整句复现、全文默写四层结构，但首轮出题覆盖偏保守。

当前问题：
- 一个场景即使有 10 句左右，首轮填空有时也只有 2 题
- 半句复现对短句过滤过严，很多本可练的句子没有进入第二层
- 维护者很难从 UI 直接判断这是出题策略问题还是渲染问题

用户价值：
- 提高首轮填空题覆盖，避免练习入口过薄
- 让半句复现覆盖更多中短句，提升句子骨架训练密度
- 保持现有四层练习结构不变，只优化题量和覆盖率

What Changes

- 为 scene `cloze` 模块增加最少题量与按句数补足的收口逻辑
- 当 AI 返回的 `chunk_cloze` 数量偏少时，使用本地 chunk 挖空补足覆盖
- 放宽 `guided_recall` 的最小句长阈值，并适度提高其题量上限
- 同步更新专项维护文档，明确新的题量规则

Scope

In Scope
- `scene-detail-generation-logic` 中的填空题收口逻辑
- `scene-detail-actions` 中的半句复现生成规则
- 相关单测、维护文档与 CHANGELOG

Out of Scope
- 新增新的练习题型
- 调整四层题型顺序或解锁语义
- 改动判题算法、学习状态字段或 review 调度

Impact

影响的规范：
- `scene-practice-generation`

影响的代码模块：
- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`

是否涉及数据库迁移：否
是否涉及 API 变更：否
是否影响前端交互：是
是否影响缓存策略：否
是否影响测试基线或回归范围：是
兼容性：向后兼容

风险点：
- 题量增加后，个别短场景仍可能无法达到 5 题，需要保守兜底
- 半句复现阈值放宽后，过短句子可能带来质量较弱的后半句题面
