## Why

新用户第一次进入 `today` 时，当前系统可能只有空的 continue 卡片、后台式摘要或仅依赖已有学习记录的入口，无法明确告诉用户“今天先从哪里开始”。P0 已补齐 builtin starter scenes 元字段，P1 已让 `/scenes` 能稳定展示新手路径；现在需要让 `today` 同样基于真实 scenes 数据给出稳定、可解释、可继续推进的默认学习推荐。

## What Changes

- 扩展 Today 服务端聚合能力，在现有 `/api/learning/dashboard` 返回中增加兼容的 starter recommendation 字段。
- 新增服务端纯函数/selector，按 continue learning、review 兼容、新用户 starter、starter 后续路径、fallback empty 的优先级产出 Today 首要推荐。
- 改造 Today 首要任务卡片 UI，展示推荐标题、场景标题、学习目标/说明、推荐理由、level、时长、进度与 CTA，并保留现有 review/progress/expressions 内容。
- 为无学习记录用户推荐 sort_order 最小、优先 `L0` 的 builtin starter scene；为部分完成 starter 的用户推荐下一个 starter；starter 全完成后推荐下一个 `daily_life` / `time_plan` / `social` 的 `L0/L1` 场景。
- 增加最小逻辑测试与页面测试，覆盖新用户、continue、partial starter、starter complete、空场景与 review coexist 场景。
- 本轮稳定性收口：
  - 收口 Today 与 `/scenes` 对 starter path 的排序与场景元字段使用口径，避免出现两套不一致推荐。
  - 收口 Today 首要任务解释来源，让推荐理由来自服务端稳定聚合，而不是前端 JSX 临时拼接。
- 本轮明确不收：
  - 不重构 learning/review 主链路。
  - 不引入 AI 推荐或复杂个性化排序。
  - 不改 `/scenes` 页面主流程、不动 TTS、不改 chunks 主流程。
  - 不新增新的 scene 元字段或数据库表；若后续需要更复杂新用户信号，另开 change 处理。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `today-learning-contract`: Today 聚合入口新增新用户 starter recommendation、首要任务优先级与空状态降级要求。

## Impact

- 服务端聚合：`src/lib/server/learning/service.ts` 及其纯逻辑/selector 文件。
- Today 页面：`src/app/(app)/today/page.tsx`、`src/features/today/components/*`。
- API：`/api/learning/dashboard` 响应新增可选字段，但保持兼容。
- 场景查询与排序复用：`src/lib/server/scene/service.ts`、`src/app/(app)/scenes/scene-display.ts` 的元字段排序口径。
- 测试：Today selector/unit、Today page DOM/interaction、必要的 build 验证。
