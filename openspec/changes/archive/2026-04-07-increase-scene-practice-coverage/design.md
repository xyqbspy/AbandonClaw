设计说明：提升场景练习题覆盖率

Status

approved

Current Flow

当前入口：
- `generateScenePracticeSet` 负责从场景生成练习集

当前处理链路：
- 场景先经 `/api/practice/generate` 请求 AI 出题
- 返回结果经 `normalizePracticeExercisesForScene` 规范化
- `cloze` 模块只保留 `chunk_cloze`
- 如果没有可用 `chunk_cloze`，才回退到 `buildExerciseSpecsFromScene`
- 半句复现由 `buildGuidedRecallModule` 本地按句子切分生成

当前回写 / 状态更新：
- 练习集组装成 `cloze -> guided_recall -> sentence_recall -> full_dictation`
- 前端保持按模块顺序解锁

当前回退路径：
- AI 返回结构非法时回退到本地 `buildExerciseSpecsFromScene`

Problem

当前设计问题：
- AI 返回的 `chunk_cloze` 偏少时，`cloze` 模块会直接变薄
- 现有本地回退只在“完全没有 cloze”时触发，无法修正“有，但太少”的情况
- `guided_recall` 只允许 6 词及以上句子进入，导致很多中短句被过滤

当前不稳定点 / 不一致点：
- 一个 scene 的句子数和首轮填空数之间没有稳定下限
- 维护者只能事后通过页面观察判断题量是否异常

Decision

设计决策1：
- 引入 `cloze` 题量目标值：按场景句子数计算目标覆盖，至少 5 题，最多 8 题

设计决策2：
- 先保留 AI 生成的 `chunk_cloze`
- 如果数量未达到目标值，再从本地 `buildExerciseSpecsFromScene` 生成的题集中补足
- 补足时按 `sentenceId + chunkId + displayText` 去重，避免重复题
- 本地补足允许同一句最多补 2 个高价值 chunk，优先 `grammarLabel / meaningInSentence / usageNote` 更明确、且多词更像完整表达的内容
- 高价值判断继续偏向短语动词、固定搭配、习语等表达学习目标，而不是只看长度

设计决策3：
- `guided_recall` 的最小词数阈值从 6 放宽到 5
- 模块题量上限从 4 调整到 5

设计决策4：
- 不调整四层题型顺序与解锁规则，只增加每层的候选覆盖

Risks

风险1：
- 本地补足题过多时可能让 AI 题与 fallback 题混合出现，需保持去重和顺序稳定
- 同一句允许第二个 chunk 后，需避免把句子切得过碎，因此继续限制为最多 2 个

风险2：
- 对 5 词句子切半后，后半句可能很短，需要继续保留“前后半句都不能为空”的守卫

Validation

验证方式：
- 补充生成层单测，覆盖“AI 题偏少时自动补足到目标数量”
- 补充 action 层单测，覆盖“5 词句子也能进入半句复现，且模块上限提高”
- 执行乱码检查，确认新增中文文档仍为 UTF-8

回归范围：
- scene 练习集生成
- 半句复现模块构造
- 维护文档入口

未覆盖风险：
- 暂未做整页交互回归，当前以生成层和 action 层测试为主
