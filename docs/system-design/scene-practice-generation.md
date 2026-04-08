# Scene 练习题生成链路维护说明

## 1. 文档目的

这份文档专门说明 `scene/[slug]` 里“开始练习”这一段的出题链路、题型收口规则，以及为什么当前会出现“一个句子通常只有一个挖空、整轮填空数量偏少、半句复现偏少”的现象。

它主要回答三类问题：

- 练习题是从哪里生成的
- 为什么当前题量和题型看起来偏保守
- 后续如果要增加填空密度或半句题量，应该改哪几层

## 2. 当前链路总览

当前 scene 练习题不是单一来源，而是两段式生成：

1. `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
   - 入口 `generateScenePracticeSet`
   - 先把 `Lesson` 转成 `ParsedScene`
   - 调 `/api/practice/generate` 请求 AI 生成练习题
2. `src/app/api/practice/generate/route.ts`
   - 用 prompt 让模型基于 `scene.sections[].blocks[].sentences[].chunks[]` 出题
   - 如果模型返回结构不合法，就回退到本地 `buildExerciseSpecsFromScene`
3. `src/lib/shared/scene-practice-exercises.ts`
   - 对 AI 生成的 `chunk_cloze` 做规范化
   - 尽量把答案、显示题面和场景里的真实 chunk 对齐
4. `src/app/(app)/scene/[slug]/scene-detail-actions.ts`
   - 把练习最终组装成固定四层模块：
   - `cloze -> guided_recall -> sentence_recall -> full_dictation`
5. `src/features/scene/components/scene-practice-view.tsx`
   - 前端按模块顺序展示
   - 只有上一模块全部 typing 题答对，下一模块才会解锁

## 3. 为什么当前填空题偏少

当前填空数量少，主要不是 UI 问题，而是生成策略本身比较保守。

### 3.1 首轮填空总题量有目标上限，但现在会先保证最少覆盖

`generateScenePracticeSet` 调 AI 时固定传 `exerciseCount: 8`：

- 文件：`src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`

但当前实现已经不再是“AI 给多少 `chunk_cloze` 就只用多少”。

现在 `cloze` 模块会先按场景句子数计算目标覆盖：

- 至少 5 题
- 最多 8 题
- 中间优先贴近当前场景的句子数

也就是说：

- 10 句左右的 scene，首轮填空不会再轻易掉到 2 题
- 5 到 8 句的 scene，首轮填空会尽量补到和句子数接近

### 3.2 `cloze` 模块仍只保留 `chunk_cloze`，但会在数量不足时自动补足

AI 即使返回了其它题型，scene 页当前也会把 `cloze` 模块收口成纯 `chunk_cloze`：

- 文件：`src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`

逻辑是：

- 先拿 AI 返回的所有练习题
- 规范化后只过滤出 `exercise.type === "chunk_cloze"` 的题
- 如果至少有一题 `chunk_cloze`，就只使用这些题
- 其它像 `translation_prompt`、`sentence_rebuild` 即使生成出来，也不会进入首轮填空模块

现在这层规则变成：

- 如果 AI 的 `chunk_cloze` 已达到目标覆盖，就直接使用
- 如果数量不足，会再从本地 scene chunk 挖空结果中补足

所以 AI 即使只返回 2 道 `chunk_cloze`，只要场景里有足够可练句子，当前也会自动补到目标覆盖，而不是继续停在 2 题。

### 3.3 fallback 现在允许同一句再补一个高价值 chunk

如果 AI 返回结构不合法，会回退到本地 `buildExerciseSpecsFromScene`：

- 文件：`src/lib/server/exercises/spec-builder.ts`

这层仍然保守，但不再只取每句第一个 chunk：

- 默认优先挑更像“完整表达”的 chunk
- 同一句最多补 2 个 chunk
- 会参考 `grammarLabel / meaningInSentence / usageNote`，优先短语动词、固定搭配、习语这类更值得练的表达
- 会优先多词、长度更长的 chunk
- 不会把同一句拆成很多个碎空

这意味着 fallback 下的题量上限大约等于：

- 有效句子数
- 再被 `maxCount` 截断，当前默认也是 8

所以现在 fallback 的设计是：

- 平时仍优先保证“多句覆盖”
- 但当需要补题时，长句允许再补一个高价值 chunk

### 3.4 规范化阶段会把题面进一步收口成单个可判定答案

`normalizePracticeExercisesForScene` 会尽量把题面的空缺和判题答案对齐：

- 文件：`src/lib/shared/scene-practice-exercises.ts`

如果 AI 给的是：

- 题面：`Don't ___ yourself out.`
- 原始答案：`burn yourself out`

规范化后会把真正判题答案收口成和空缺一致的 `burn`。

这会让题目更稳定，但也意味着：

- 当前系统更偏向“单个明确空缺”
- 不鼓励一个题面里同时挖出较长连续片段

## 4. 为什么半句复现偏少

半句复现不是和填空一起混出的，而是固定的第二层模块 `guided_recall`。

对应文件：

- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`

### 4.1 只有句长达到阈值才会生成半句题

`splitSentenceForGuidedRecall` 的规则是：

- 先把句子按空格拆成词
- 词数小于 5，直接不生成半句题

所以极短句仍会被过滤，但相比之前，5 词句子现在也能进入半句复现模块。

这就是你看到“半句这种比较少”的第一原因。

### 4.2 半句题只取前 5 题

即使满足长度条件，`guided_recall` 还会再做一层截断：

- `.slice(0, 5)`

也就是整轮最多保留 5 道半句复现。

### 4.3 还要先完成填空模块才解锁

在 `scene-practice-view.tsx` 里，题型解锁是串行的：

- `cloze` 全部答对
- 才能进入 `guided_recall`
- 再答完半句复现
- 才能进入 `sentence_recall`

所以用户感知上的“半句题少”，一部分来自实际题数不多，另一部分来自它不是默认首屏出现。

## 5. 当前四层题型各自的上限

当前 scene 练习固定四层：

1. `cloze`
   - 来源：AI `chunk_cloze` 或 fallback 本地挖空
   - 当前至少 5 题，最多 8 题；短场景则以可用句子数为准
2. `guided_recall`
   - 来源：本地按句子切前半句 / 后半句
   - 仅句长 >= 5 才生成
   - 最多 5 题
3. `sentence_recall`
   - 来源：每句中文提示复现英文整句
   - 最多 3 题
4. `full_dictation`
   - 来源：整段中文提示默写全文
   - 固定 1 题

对应文件：

- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`

## 6. 当前设计更保守的直接结果

结合上面几层，当前用户看到“填空偏少、半句偏少”主要来自以下规则叠加：

- AI 总题量只请求 8 题
- 首轮模块只保留 `chunk_cloze`
- 本地补足时虽然允许同一句补到第二个高价值 chunk，但仍限制在最多 2 个
- 半句复现只对词数 >= 5 的句子生效
- 半句复现最多 5 题
- 整轮模块按顺序解锁，不会一开始全部摊开

所以如果一个 scene：

- 句子偏短
- chunk 拆分本身不多
- AI 返回的 `chunk_cloze` 占比低

最终用户看到的首轮填空题很容易只有 2 到 4 题，半句复现也可能只有 1 到 3 题。

## 7. 如果后续要增加题量，优先看哪里

如果后面要让练习题“更多、更密”，优先从这几层判断：

### 7.1 想增加填空数量

先看：

- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/lib/server/exercises/spec-builder.ts`
- `src/lib/server/prompts/practice-generate-prompt.ts`

常见方向：

- 把 `exerciseCount` 从 8 提高
- 要求 AI 明确提高 `chunk_cloze` 占比
- fallback 从“每句第一个 chunk”放宽到“必要时每句最多 2 个高价值 chunk”

当前已经额外做了一层 prompt 收紧：

- 优先要求至少 60% 题目为 `chunk_cloze`
- 先尽量做到“不同句子各来一道 chunk_cloze”，再考虑重复同一句
- 只有 `chunk_cloze` 覆盖已经足够时，才鼓励模型多出其它题型

### 7.2 想增加半句复现数量

先看：

- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`

常见方向：

- 把 `words.length < 5` 的阈值继续调低
- 把 `.slice(0, 5)` 继续放宽
- 调整前后半句切分比例

### 7.3 想改变解锁节奏

先看：

- `src/features/scene/components/scene-practice-selectors.ts`
- `src/features/scene/components/scene-practice-view.tsx`

当前默认是前一模块全对才解锁下一模块。如果改成：

- 完成一定比例解锁
- 填空和半句并行展示
- 按句子混排而不是按模块分层

那就不只是题量问题，而是练习流程语义变化，需要同步评估 OpenSpec。

## 8. 建议排查顺序

以后如果再遇到“题量怎么这么少”，推荐按这个顺序查：

1. 看 `practiceGenerateFromApi` 的原始返回里到底有多少 `chunk_cloze`
2. 看 `normalizePracticeExercisesForScene` 是否把答案和题面收口成更短的空缺
3. 看 scene 当前句子里是否大量短句，导致 `guided_recall` 被过滤
4. 看是否走到了 fallback，本地 fallback 本来就只取每句第一个 chunk
5. 最后再看前端展示和模块解锁，不要一开始就怀疑 UI 少渲染

## 9. 当前相关文件清单

- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`
- `src/features/scene/components/scene-practice-view.tsx`
- `src/features/scene/components/scene-practice-selectors.ts`
- `src/lib/server/prompts/practice-generate-prompt.ts`
- `src/app/api/practice/generate/route.ts`
- `src/lib/server/exercises/spec-builder.ts`
- `src/lib/shared/scene-practice-exercises.ts`
