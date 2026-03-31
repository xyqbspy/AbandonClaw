## Why

`chunks` 页面现在同时承接手动新建表达、句子沉淀、AI 生成同类/对照表达、关系保存、expression cluster 维护、表达地图和进入复习等多条链路，但这些功能与后端 `phrases` / `relations` / `expression clusters` / `daily stats` 的关系散落在页面编排、hooks、API 和 service 中，没有一份稳定契约说明“哪个动作写什么数据、哪些字段驱动哪些展示、哪些链路必须一起维护”。随着 `today` 和 `scene` 语义已经陆续收口，`chunks` 现在成为下一个明显的维护薄弱点，需要把它的功能链路与数据关系系统化梳理清楚。

## What Changes

- 明确 `chunks` 页面中手动新建表达、从句子提取表达、生成同类表达、生成对照表达、快速添加关系、expression cluster 操作、进入复习等功能的前后端数据流。
- 梳理前端 `chunks/page`、相关 hooks 与后端 `phrases/service`、`expression-clusters/service`、缓存失效逻辑之间的职责边界。
- 明确 `savePhrase` / `savePhrasesBatch`、关系写入、cluster 同步、AI enrich、daily stats 回写与 `review` 入口之间的契约。
- 补充一份 chunks 专项维护文档，要求后续修改 `chunks` 核心动作、数据结构或关系语义时同步更新文档与回归测试。

## Capabilities

### New Capabilities
- `chunks-data-contract`: 规定 `chunks` 页面各项核心功能与后端数据、关系、cluster、复习链路之间的映射契约和维护要求。

### Modified Capabilities
- `learning-loop-overview`: 补充 `chunks` 作为表达资产工作台时，必须以稳定的保存、关系、cluster 与复习数据契约来承接从 scene 沉淀下来的表达。

## Impact

- 受影响代码：
  - `src/app/(app)/chunks/page.tsx`
  - `src/app/(app)/chunks/use-manual-expression-composer.ts`
  - `src/app/(app)/chunks/use-focus-assist.ts`
  - `src/app/(app)/chunks/use-focus-detail-controller.ts`
  - `src/lib/utils/phrases-api.ts`
  - `src/lib/server/phrases/service.ts`
  - `src/lib/server/expression-clusters/service.ts`
- 受影响文档：
  - 新增 chunks 数据映射/维护说明文档
  - 新增或修改 OpenSpec delta specs
- 受影响测试：
  - chunks hooks / selectors / interaction 回归测试
  - phrases / relations / cluster 服务逻辑测试
- API / 数据库：
  - 本次提案默认不新增数据库迁移
  - 可能收紧 `phrases` 相关接口和返回字段的语义约束，但不预设破坏性接口改名
