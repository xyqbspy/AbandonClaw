## Status

implemented

## Implementation

- [x] 盘点 `chunks` 页面手动新建、句子提取、同类/对照生成、快速添加关联、cluster 维护、表达地图和复习入口的前后端链路。
- [x] 梳理 `src/lib/server/phrases/service.ts` 与 `expression-clusters/service.ts` 中保存、关系写入、cluster 同步、AI enrich、daily stats 回写的职责边界。
- [x] 收紧 `chunks` 页面编排层与 hooks 的语义边界，把重复的保存 payload 规则沉淀到稳定 helper。
- [x] 新增一份 `chunks` 学习数据映射维护文档，覆盖“页面动作 -> API -> service -> 数据副作用 -> 页面刷新”的链路说明。

## Validation

- [x] 补充或更新 `chunks` hooks / 保存契约回归测试，覆盖手动新建、focus assist 保存、similar / contrast、cluster 与 quick add 的关键语义。
- [x] 补充或更新 `relationType`、`expressionClusterId`、`sourceNote` 等稳定字段的契约测试，避免前端各入口再次分叉。

## Documentation

- [x] 保持 change spec delta 与本次实现一致，明确 `chunks` 数据契约和学习主链路中的维护要求。
- [x] 如实现阶段出现保存语义收口，先同步更新 tasks / 文档 / 测试，再继续实施。
