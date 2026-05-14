# 变更提案：补齐 Scenes 日常入门默认场景底座

## Status
draft

## Why
业务背景：
当前产品希望用户从 `today -> scene -> chunks -> review` 进入稳定学习闭环，但新用户注册后默认只会看到极少内置场景，`chunks` 也几乎为空，首屏感受更像一个等待手工创建内容的后台，而不是可立即开始学习的英语产品。

当前问题：
- `scenes` 内置内容数量过少，无法承接“新用户第一次进入就能直接学”的产品目标。
- 现有 `scenes` 元信息不足，缺少对 level、category、starter/featured、学习目标、默认排序等信息的稳定承载。
- `/api/scenes` 仅返回现有最小字段，无法给后续 scenes/today 展示 starter/daily builtin 内容提供稳定数据基础。

用户价值：
- 新用户无需创建、导入或生成内容，也能直接开始英语对话学习。
- 默认场景优先对齐高频日常口语，降低首次进入的理解成本和决策成本。
- builtin 场景自带 chunk/phrase 内容，便于后续进入用户自己的 `chunks / review` 闭环。

## What Changes
- 为 `public.scenes` 增加最小必要的场景元字段，用于承载入门默认场景能力。
- 新增一份向后兼容的 Supabase migration，不删除旧字段、不覆盖旧数据。
- 将现有内置 seed 同步链路升级为可幂等写入 24 个 builtin starter/daily scenes。
- 扩展 `/api/scenes` 列表返回字段与默认排序，让新用户优先看到 builtin starter scenes。
- 复用现有 `scene_json` / `Lesson -> ParsedScene` 结构承载场景正文与 chunk 细节，不新增内容表。

## Stability Closure
### In This Round
- 收口 `scenes` 默认内容不足导致新用户空态过重的问题。
- 收口 builtin scenes 缺少稳定元字段，导致排序、分组、starter 标记只能靠前端猜测的问题。
- 收口 scenes 列表只按 `created_at` 排序，无法稳定承接后续 pack 展示的问题。
- 收口 seed 内容与 `/api/scenes` 返回结构脱节的问题，确保新增字段不会在 API 层丢失。

### Not In This Round
- 不建立独立 `content_packs`、`scene_categories` 或更复杂的内容运营表：当前只需要最小数据底座，避免过度设计。
- 不重做 `today` 推荐策略：本轮只保证 fallback 能看到可学 builtin scenes，不引入复杂推荐算法。
- 不重构 Scene 页面或新增 Chunks 必备表达库页面：本轮聚焦数据和最小可见链路。
- 不扩展新闻、演讲、商务等复杂内容域：首批只覆盖高频日常入门口语。

### Risk Tracking
- 延后原因：P0 目标是先解决“新用户没内容可学”的问题，避免把内容运营、推荐和 UI 重构混在同一轮。
- 风险记录位置：`openspec/changes/add-builtin-starter-scenes/tasks.md` 与后续实施阶段的 `docs/dev/dev-log.md`。

## Scope

### In Scope
- `scenes` 表新增最小元字段。
- 24 个 builtin starter/daily scenes 的幂等 seed 数据。
- 每个 builtin scene 的 level/category/learning_goal/estimated_minutes/sort_order/source_type/is_starter/is_featured/tags 元信息。
- 每个 builtin scene 复用现有 scene 内容结构补齐 4-8 个核心 chunks。
- `/api/scenes` 返回结构与 server mapper 更新。
- 新用户默认可见 builtin scenes 的最小排序与展示链路。
- 最小相关测试与构建验证。

### Out of Scope
- 复杂 today 推荐或用户个性化排序。
- 新建 pack 管理页面或后台内容运营系统。
- Scene/Today 大规模 UI 改造。
- 新增大型状态管理、RLS 重构或 Auth/Storage 逻辑重写。

## Impact
影响的规范：
- `learning-loop-overview`

影响的模块：
- `supabase/sql`
- `src/lib/server/db/types.ts`
- `src/lib/data/mock-lessons.ts`
- `src/lib/server/scene/*`
- `src/app/api/scenes/*`
- `src/lib/utils/scenes-api.ts`
- 最小相关 tests

是否涉及 API 变更：是
是否涉及前端交互变化：否，最多是已有列表拿到更多字段并按新顺序展示
是否影响缓存策略：轻微影响，scene list cache 需要承接扩展字段
是否影响测试基线：是
兼容性：向后兼容
风险点：
- 现有 `runSeedScenesSync()` 会维护 seed 集合，若 keep 逻辑处理不当可能误删已有 seed 场景。
- 列表排序若只保留 `created_at desc`，today fallback 与 scenes 首屏顺序会失真。
- 若字段只加数据库不加 mapper/API，前端仍拿不到新能力。
