# scene-practice-generation Specification

## Purpose
TBD - created by archiving change increase-scene-practice-coverage. Update Purpose after archive.
## Requirements
### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: 用户手动重新生成题目
- **WHEN** 用户在 scene 练习页主动点击“重新生成题目”
- **THEN** 系统必须展示统一的 loading 反馈
- **AND** 文案必须明确表示当前正在生成中
- **AND** 该 loading 展示必须复用公共组件，而不是在页面局部单独实现

### Requirement: 半句复现必须覆盖更多中短句
系统 MUST 让 `guided_recall` 覆盖更多仍有练习价值的中短句，而不是只保留偏长句。

#### Scenario: 句子长度刚达到放宽后的阈值
- **WHEN** 某句词数达到当前半句复现最小阈值，且前后半句都非空
- **THEN** 系统必须为该句生成半句复现题

#### Scenario: 场景存在多条可做半句复现的句子
- **WHEN** 场景里可用的半句复现句子多于单轮上限
- **THEN** 系统应保留不超过当前上限的题量
- **AND** 该上限必须高于旧版的 4 题限制

