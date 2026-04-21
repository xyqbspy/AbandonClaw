## Why

当前 scene 练习题本体只保存在浏览器 `localStorage`，服务端只保存 practice run / attempt。结果是同一用户在本地、线上或不同设备打开同一场景时，可能拿不到同一套题，且服务端回写记录缺少可追溯的题目锚点。

这已经影响 scene 练习恢复、review 回补解释、today/progress 聚合一致性和 AI 生成成本控制。现在需要把“用户当前这套 scene practice set”提升为服务端可持久化的学习链路资产，同时保留本地缓存秒开能力。

## What Changes

- 新增用户级 scene practice set 服务端持久化能力，保存当前用户在某个 scene / variant source 下生成的练习题本体。
- 新增或扩展 API，使 scene 页面可以读取 latest practice set、生成并落库 practice set、手动重新生成新 practice set。
- 调整 scene 页面数据策略：本地缓存可先渲染，但必须后台校验服务端 practice set；服务端有有效题目时同步回填本地缓存。
- 保持现有 `/practice/run`、`/practice/attempt`、`/practice/mode-complete`、`/practice/complete` 的学习回写语义，但让 `practiceSetId` 能在服务端解析到题目本体。
- 明确重新生成语义：创建新的 practice set，旧 set 不作为当前继续入口，但历史 run / attempt 可保留。
- 不改变本轮题型策略、题量策略或模块解锁规则。

## Stability Closure

### In This Round

- 收口 practice set 本体只存在本地导致的跨端不一致。
- 收口服务端 run / attempt 只有 `practiceSetId`、没有题目本体锚点的追溯缺口。
- 收口 scene practice 缓存职责：本地缓存负责秒开，服务端 practice set 负责权威恢复。
- 补齐 scene practice generation 文档与 runtime cache 文档中关于服务端持久化的边界说明。
- 补充最小回归，覆盖服务端有题不重复生成、缓存命中仍后台校验、重新生成创建新 set、run/attempt 继续写回。

### Not In This Round

- 不做公共题库系统：当前需求是用户级当前练习套题持久化，公共题库会引入复用、审核、版本治理和跨用户权限。
- 不调整出题策略和题量策略：题型质量属于 `scene-practice-generation` 的另一类问题，避免和持久化混在一轮。
- 不重构 review 页面体验：本轮只保证 review 回补有可追溯锚点，不改 review 阶段式 UI。
- 不迁移所有历史 localStorage 题目到服务端：历史本地题缺少可信服务端来源，本轮仅在页面进入/继续时做兼容读取与后续服务端同步策略。

### Risk Tracking

- 延后原因：公共题库、题型策略和 review UI 都会扩大数据模型与产品语义范围，不是当前最小闭环必需项。
- 风险记录位置：`openspec/changes/persist-scene-practice-sets/design.md` 与 `tasks.md` 的 deferred/risk 条目。

## Capabilities

### New Capabilities

- 无。本轮优先修改现有 scene practice 与 runtime cache 能力，不新增重复 capability。

### Modified Capabilities

- `scene-practice-generation`: 增加 scene practice set 服务端持久化、读取、重新生成与回写锚点要求。
- `runtime-cache-coherence`: 增加 scene practice set 本地缓存与服务端权威数据的协同要求。

## Impact

- 页面与前端状态：
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
  - `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
  - `src/lib/utils/scene-learning-flow-storage.ts`
  - `src/lib/cache/scene-runtime-cache.ts`
- API / server：
  - 新增或扩展 scene practice set API。
  - 调整 `/api/practice/generate` 的调用落点或增加服务端生成落库服务。
  - `src/lib/server/learning/practice-service.ts`
- 数据库：
  - 新增 Supabase SQL migration，例如 `user_scene_practice_sets`。
  - 补 RLS、索引和必要字段约束。
- 文档：
  - `docs/system-design/scene-practice-generation.md`
  - `docs/feature-flows/scene-training-flow.md`
  - 必要时补 `docs/dev/dev-log.md`。
- 测试：
  - server service / route handler 测试。
  - scene detail regression / actions 测试。
  - scene learning flow storage 兼容测试。

