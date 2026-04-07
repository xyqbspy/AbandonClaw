## ADDED Requirements

### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: AI 返回的 chunk_cloze 数量偏少
- **WHEN** 某个场景有足够多的可练句子，但 AI 返回的 `chunk_cloze` 数量低于当前题量目标
- **THEN** 系统必须使用本地 scene chunk 挖空结果补足填空题
- **AND** 最终 `cloze` 模块题量不得低于当前配置的最少覆盖目标，除非场景本身可用句子不足

#### Scenario: AI 返回的 chunk_cloze 已足够
- **WHEN** AI 返回的 `chunk_cloze` 已经达到当前题量目标
- **THEN** 系统应直接使用这些填空题
- **AND** 不得额外混入重复的 fallback 题目

### Requirement: 半句复现必须覆盖更多中短句
系统 MUST 让 `guided_recall` 覆盖更多仍有练习价值的中短句，而不是只保留偏长句。

#### Scenario: 句子长度刚达到放宽后的阈值
- **WHEN** 某句词数达到当前半句复现最小阈值，且前后半句都非空
- **THEN** 系统必须为该句生成半句复现题

#### Scenario: 场景存在多条可做半句复现的句子
- **WHEN** 场景里可用的半句复现句子多于单轮上限
- **THEN** 系统应保留不超过当前上限的题量
- **AND** 该上限必须高于旧版的 4 题限制
