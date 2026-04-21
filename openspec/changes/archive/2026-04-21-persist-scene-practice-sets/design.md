## Context

当前 scene practice 的题目生成链路已经分成两部分：

- 题目本体：`generateScenePracticeSet()` 调 `/api/practice/generate`，生成后通过 `savePracticeSet()` 写入浏览器 `localStorage`。
- 练习过程：`/practice/run`、`/practice/attempt`、`/practice/mode-complete`、`/practice/complete` 写入 Supabase 的 `user_scene_practice_runs` 和 `user_scene_practice_attempts`。

这导致服务端只知道用户操作过某个 `practiceSetId`，但没有该 `practiceSetId` 对应的题目正文、答案、模块结构和生成来源。用户换设备、换环境或线上重新打开同一 scene 时，必须重新生成题目，且已有 run / attempt 的解释依赖前端本地缓存是否仍存在。

约束：

- scene practice 已经是学习主链路的一部分，不能继续把题目本体视作纯临时 UI。
- 本地缓存仍有价值，必须保留秒开体验。
- 现有 run / attempt 语义不能被改成“进入练习即完成句子”。
- 本轮不能引入公共题库、题型策略调整或 review UI 重构。

## Goals / Non-Goals

**Goals:**

- 为用户当前 scene practice set 增加服务端持久化锚点。
- 支持读取 latest practice set、生成并落库、手动重新生成新 set。
- 让本地 `scene-learning-flow-v2` 缓存成为前端秒开层，而不是唯一事实来源。
- 让现有 practice run / attempt 的 `practiceSetId` 可以对应到服务端题目本体。
- 保持旧本地缓存兼容，避免用户已有练习题突然消失。
- 明确本轮收口项、延后项和验证范围。

**Non-Goals:**

- 不做跨用户公共题库。
- 不做 AI 生成题目的审核、发布、版本 diff 或管理后台。
- 不调整 `cloze -> guided_recall -> sentence_recall -> full_dictation` 的题型策略与解锁规则。
- 不重写 review 页面阶段流。
- 不做一次性历史 localStorage 全量迁移脚本。

## Decisions

### Decision 1: 新增用户级 `user_scene_practice_sets`

新增 Supabase 表保存每个用户的 practice set 本体，而不是把题目塞进已有 run 表。

建议字段：

- `id text primary key`
- `user_id uuid not null`
- `scene_id uuid not null`
- `source_type text not null check in ('original','variant')`
- `source_variant_id text null`
- `status text not null check in ('generated','completed','abandoned')`
- `generation_source text not null check in ('ai','system')`
- `practice_set_json jsonb not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `completed_at timestamptz null`

索引：

- `(user_id, scene_id, status, updated_at desc)`
- `(user_id, scene_id, source_type, source_variant_id, updated_at desc)`

原因：

- run 表表达“做题过程”，practice set 表表达“题目本体”，两者生命周期不同。
- `id text` 对齐现有 `PracticeSet.id` 和 `user_scene_practice_runs.practice_set_id`，避免把当前 `practice-...` 文本 id 强行迁移成 uuid。
- `practice_set_json` 可以先承接现有前端 `PracticeSet` 结构，避免拆分 exercise 表造成过早复杂化。
- 后续如果需要题库系统，可以从 JSON 过渡到标准化 exercise 表，但当前不需要。

替代方案：

- 直接把题目写入 `user_scene_practice_runs`：会让每次 run 都复制题目本体，不利于重新练同一 set。
- 新建公共 `practice_sets`：当前没有跨用户复用和审核需求，权限边界更复杂。

### Decision 2: 服务端 latest practice set 是权威恢复源，本地缓存是秒开层

页面进入时：

1. 先读取本地 `scene-learning-flow-v2`，若有可用 practice set，可先渲染。
2. 后台请求服务端 latest practice set。
3. 若服务端返回 set，则保存到本地缓存并刷新页面状态。
4. 若服务端无 set，但本地有旧 set，可继续显示本地 set；用户下一次手动重新生成或进入练习时再服务端落库。

原因：

- 避免上线后直接丢失用户当前浏览器里的题。
- 符合 runtime cache coherence 已有规则：缓存不能遮蔽服务端最新状态。

替代方案：

- 每次进入都只读服务端：首屏体验退化，且旧本地题会消失。
- 继续只用 localStorage：无法解决跨端和服务端回写锚点问题。

### Decision 3: 生成接口落库，重新生成创建新 set

新增或扩展 scene practice set API：

- `GET /api/learning/scenes/{slug}/practice/set`：读取当前用户 latest practice set。
- `POST /api/learning/scenes/{slug}/practice/set`：生成新 practice set 并落库。
- 可选 `POST /api/learning/scenes/{slug}/practice/set/regenerate` 或复用 POST 参数 `mode=regenerate`。

手动重新生成必须创建新 `practiceSetId`，旧 set 标记 `abandoned` 或保留非 current 状态。

原因：

- 重新生成是用户主动换题，不应覆盖旧 run / attempt 的解释上下文。
- 新旧 `practiceSetId` 可区分历史作答和当前题目。

替代方案：

- 覆盖原 set：会让旧 attempt 指向的题目内容变化，破坏可追溯性。

### Decision 4: run / attempt 继续保持现有语义，只校验或关联 set

`startScenePracticeRun()`、`recordScenePracticeAttempt()`、`markScenePracticeModeComplete()` 和 `completeScenePracticeRun()` 继续写已有表，但服务端应能按 `practiceSetId` 找到当前用户可访问的 practice set。

最小实现可以先在服务端 practice set service 中提供读取接口，run / attempt 不强制做深度 exercise 校验；但任务里要补至少一层“practiceSetId 属于当前 user + scene”的保护。

原因：

- 保持当前学习推进语义稳定。
- 先收口所有权和锚点，再考虑按 exerciseId 校验题目存在。

替代方案：

- 立即强校验每个 attempt 的 exerciseId 与答案：更严谨，但会牵动判题、历史本地题和 review 回补，超出本轮最小闭环。

## Stability Closure

### In This Round

- 新增服务端 practice set 本体存储。
- 页面读取策略从“本地唯一来源”改为“本地秒开 + 服务端校验”。
- 重新生成不覆盖旧题，避免破坏历史 run / attempt。
- 文档补齐 scene practice generation 与 runtime cache 的事实来源边界。
- 测试覆盖跨端恢复、缓存校验和重新生成。

### Not In This Round

- 公共题库系统：延后到需要跨用户复用和题目治理时。
- exercise 标准化表：延后到需要题目级分析和复用时。
- 题型策略调整：另开 `scene-practice-generation` 质量类变更。
- review UI 重构：本轮只保证数据锚点，不改体验。

## Risks / Trade-offs

- [Risk] 旧 localStorage 题目没有服务端 id。  
  → Mitigation：保留旧本地题可用；下一次生成/重新生成走服务端持久化；文档记录兼容边界。

- [Risk] JSONB 保存 `PracticeSet` 会让后续查询题目级数据不方便。  
  → Mitigation：当前只需要恢复当前题本体；后续题库/分析再拆标准化表。

- [Risk] 服务端 latest set 和本地 cached set 短暂不一致。  
  → Mitigation：本地先渲染，服务端返回后覆盖；测试覆盖缓存命中仍请求服务端。

- [Risk] 重新生成后旧 run / attempt 仍存在，聚合可能拿到旧 set。  
  → Mitigation：latest 查询只返回当前可继续 set；旧 set 标记 abandoned 或非当前，run / attempt 历史保留。

## Migration Plan

1. 增加数据库 migration：`user_scene_practice_sets`、RLS、索引、更新时间 trigger。
2. 增加 server practice set service：读取 latest、生成并保存、重新生成。
3. 增加 API route 和 client util。
4. 调整 scene 页面 action/data flow：先本地缓存，后台校验服务端，有服务端 set 则回填 localStorage。
5. 调整 run / attempt 的 practiceSetId 所有权检查。
6. 更新文档和测试。

回滚策略：

- 若服务端读取失败，页面继续允许使用本地缓存题目。
- 若生成落库失败，保留现有中文错误提示，不伪造成已生成。
- 数据库表新增不破坏旧表；回滚前端后旧 localStorage 链路仍可工作。

## Open Questions

- 旧 localStorage practice set 是否要在用户首次进入练习时尝试“补落库”？本轮倾向不做自动迁移，只在新生成/重新生成时落库。
- completed set 是否仍作为 latest 返回？本轮倾向不返回 completed 作为继续 set，但可保留用于历史追溯。
