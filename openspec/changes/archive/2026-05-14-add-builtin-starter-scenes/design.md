# 设计说明：补齐 Scenes 日常入门默认场景底座

## Status
completed

## Current Flow
当前入口：
- `/api/scenes` 通过 `listScenes({ userId })` 返回可见场景列表。
- `listScenes()` 在查询前会执行 `runSeedScenesSync()`，把 `src/lib/data/mock-lessons.ts` 中的内置内容 upsert 到 `public.scenes`。
- `today` 在没有 continue learning 时，会直接取 `sceneList[0]` 作为 fallback 继续学习入口。

当前处理链路：
- 内置内容来源于本地 `Lesson[]`。
- `Lesson` 会被转换为 `ParsedScene`，写入 `scenes.scene_json`。
- 列表页和 `today` 只消费 `SceneListItemResponse` 这套白名单字段。

当前回写：
- 场景学习过程通过现有 learning service 写入 `user_scene_progress`。
- 句子 / chunk / phrase 保存与追踪通过现有 scene detail、phrases、chunks 链路写回。

当前回退路径：
- 如果没有 continue learning，today 直接回落到 scenes 列表第一项。
- 如果 scene list cache 命中，前端会先展示缓存再后台刷新。

## Problem
当前问题：
- 内置 seed 场景只有极少数内容，无法支撑新用户首次进入就开始学习。
- `scenes` 表缺少入门场景元字段，无法稳定表达 starter/featured/pack 顺序。
- scene list 默认排序不适合 builtin 内容运营，today fallback 也会继承这个问题。

不一致点 / 不稳定点：
- `sourceType` 目前由旧的 `origin` 二值映射得到，无法表达后续 `builtin / user_generated / imported / ai_generated`。
- `estimatedMinutes` 等字段分散在 `scene_json`，缺少列表维度的稳定元信息承载。
- seed 同步逻辑与场景运营需求耦合在 `mock-lessons.ts`，但当前没有明确 pack 顺序和 starter 标记。

## Stability Closure
### In This Round
- 用最小字段扩展把 builtin starter scenes 的运营元信息放回 `scenes` 主表。
- 保持 `scene_json` 为正文唯一来源，不引入第二套内容存储。
- 让 list API 与 today fallback 基于稳定排序拿到正确的默认入门场景。

### Not In This Round
- 不把 `origin` 全量迁移为复杂来源枚举，只做兼容映射和最小扩展。
- 不把 `today` 改成专门面向新用户的多层推荐系统。
- 不把 chunk 运营上升为独立内容模型，本轮只保证场景正文里的 chunks 可被现有链路消费。

## Decision
设计决策 1：
在 `public.scenes` 直接新增以下字段，避免新建额外表：
- `level text`
- `category text`
- `subcategory text null`
- `source_type text`
- `is_starter boolean`
- `is_featured boolean`
- `sort_order integer`
- `estimated_minutes integer`
- `learning_goal text`
- `tags jsonb`

设计决策 2：
保留旧 `origin` 字段与现有 RLS，新增 `source_type` 作为更稳定的外部消费字段：
- 旧 seed 场景迁移为 `source_type = 'builtin'`
- 旧 imported 场景迁移为 `source_type = 'imported'`
- 新内置 starter scenes 继续保留 `origin = 'seed'`，避免破坏已有删除与权限逻辑

设计决策 3：
继续复用 `src/lib/data/mock-lessons.ts` 作为 seed 内容源，但把内容扩展为 24 个 builtin starter scenes，并给每个场景补齐：
- 标题/中文标题
- level/category/subcategory
- learning goal
- estimated minutes
- tags
- 4-8 个高频 chunks

设计决策 4：
更新 `listVisibleScenesByUserId()` 排序逻辑，优先按：
1. `is_starter desc`
2. `is_featured desc`
3. `sort_order asc`
4. `created_at desc`

这样既能服务新用户默认可见，也能兼容后续 pack 展示。

设计决策 5：
扩展 `SceneListItem` / `SceneListItemResponse`，把新字段显式透出给前端；不要求本轮做大 UI 改造，但保证数据不丢失。

## Risks
风险 1：
seed 同步当前存在“删除不在 keepSlugs 里的 seed 场景”逻辑，扩容 seed 集合时需要确认只影响 `origin = 'seed'` 的内置内容。

风险 2：
如果 today fallback 仍然只拿列表第一项，而列表排序没有稳定切到 starter 优先，则新用户仍可能看到不合适内容。

延后原因：
pack 独立模型、today 个性化分发和内容运营后台会拉大范围，不适合 P0。

风险去向：
记录到本 change 的 `tasks.md` 与后续实施验证记录。

## Validation
验证方式：
- migration 执行后字段存在且旧数据保留。
- 重复执行 seed 不产生重复 slug。
- `/api/scenes` 返回新增元字段。
- 新用户可见列表至少包含 24 个 builtin starter/daily scenes。
- `pnpm run build` 通过，最小相关测试通过。

回归范围：
- scenes 列表加载
- today fallback 继续学习入口
- scene detail 获取
- seed admin 同步入口

未覆盖风险：
- 本轮不验证真实线上 Supabase 数据量较大时的排序性能，仅采用简单字段与索引最小收口。

本轮已收口的不稳定点：
- 默认内容缺失
- 元字段缺失
- 列表排序无法稳定承接 starter scenes

明确延后的不稳定点：
- today 新用户个性化推荐
- pack 独立模型与后台内容管理
