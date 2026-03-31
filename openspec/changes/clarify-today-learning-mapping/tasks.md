## Status

completed

## Implementation

- [x] 盘点 `today` 页面继续学习卡片、任务链路、表达摘要、回忆入口的展示字段，整理其来源、优先级和回退规则。
- [x] 梳理 `src/lib/server/learning/service.ts` 中 `overview`、`continueLearning`、`todayTasks` 与底层学习表、练习聚合、每日统计之间的映射关系。
- [x] 收紧 today 相关 selectors / page 逻辑边界，确保学习步骤与完成语义以稳定契约为准，前端只负责展示派生与兜底。
- [x] 新增一份 today 学习数据映射维护文档，覆盖“后端数据 -> dashboard 响应 -> today 展示”的链路说明和维护规则。

## Validation

- [x] 补充或更新 today selectors / page client 回归测试，覆盖 continueLearning、todayTasks、repeat continue、fallback scene 等关键场景。
- [x] 复核 learning dashboard / service 聚合映射；本次未改服务端聚合代码，因此未新增 service 逻辑测试，只保留 today 侧回归验证。

## Documentation

- [x] 更新 change 内 spec delta，明确 today 学习数据契约和学习主链路中的 today 映射要求。
- [x] 本次实现未引入新的字段语义变更，未触发额外 proposal / design / specs 回写。
