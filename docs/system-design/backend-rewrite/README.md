# 后端重写专题

这个目录用于集中放置和当前项目后端重写相关的文档，重点服务两个目标：

- 盘点当前后端现状、边界、限制与风险
- 为后续基于 Java 的并行重写和学习路线提供文档锚点

## 当前状态

- 当前状态：第一阶段规划已完成，可进入实现阶段
- 当前建议：先停止继续扩写抽象文档，后续以实际实现为主，再按偏差和落地结果回补文档

当前收录：

- `java-backend-rewrite-assessment.md`
  - 说明当前项目后端技术栈、真实不足
  - 评估改用 `Maven + Spring Boot + MySQL + MyBatis + Redis` 后需要重建哪些层
  - 给出适合从零学习 Java 后端的分阶段重构大纲
- `api-to-java-controller-mapping.md`
  - 按当前仓库 API 分组，映射到推荐的 Java Controller / Service
  - 标出哪些接口适合先迁，哪些接口应该后迁
  - 标出哪些接口优先需要幂等、限流、缓存与并发保护
- `table-to-mysql-mapper-mapping.md`
  - 按当前核心数据表分组，映射到推荐的 MySQL 表职责与 MyBatis Mapper
  - 标出哪些表适合先迁，哪些表可以后迁
  - 标出哪些表的写操作优先需要事务、幂等与 Redis 配合
- `redis-usage-plan.md`
  - 说明 Redis 在 Java 重写里最值得先做的五类能力
  - 标出哪些接口和哪些表优先需要 Redis
  - 明确哪些 Redis 用法先别做，避免一开始过度设计
- `java-phase1-task-breakdown.md`
  - 按周次拆出 Java 重写第一阶段最适合落地的任务顺序
  - 明确第一阶段该做什么、不该做什么
  - 给出最小开工 checklist，方便直接照着推进

后续适合继续补在这里的文档：

- API 清单与 Java Controller 映射
- 数据表清单与 MySQL 重建映射
- Redis 使用点清单
- Java 重写阶段任务拆分

这个目录仍然属于 `system-design` 层，不替代正式业务 spec，也不替代现有 feature-flow / domain-rules。
