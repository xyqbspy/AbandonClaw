# Java 重写第一阶段任务拆分清单

## 1. 这份文档解决什么问题

前面几份文档已经回答了：

- 为什么值得重写
- API 该怎么映射
- 表该怎么迁到 MySQL / MyBatis
- Redis 该优先用在哪

这份文档只回答一个更直接的问题：

- **如果你现在开始做 Java 重写，第一阶段到底每天 / 每周做什么**

目标不是写成项目管理大表，而是给你一份能直接开工的最小执行清单。

## 2. 第一阶段的目标边界

第一阶段不要贪大，只做这几件事：

1. 跑起一个最小 Spring Boot 后端工程
2. 打通 2-3 个只读接口
3. 打通 1-2 个核心写接口
4. 给关键写接口接上 Redis 幂等

第一阶段明确不做：

- 不做全量 API 迁移
- 不做 TTS
- 不做 practice generate
- 不做 expression-map generate
- 不做 scenes generate
- 不做复杂后台任务
- 不做微服务拆分

## 3. 第一阶段推荐交付物

第一阶段结束时，建议至少有这些成果：

- 一个可运行的 Spring Boot + Maven + MyBatis + MySQL + Redis 工程
- 一个最小公共包结构
- 一组基础配置：
  - 数据库连接
  - Redis 连接
  - 全局异常处理
  - 统一响应体
  - 基础日志
- 至少打通这些接口中的一部分：
  - `GET /review/summary`
  - `GET /phrases/mine`
  - `POST /phrases/save`
  - `POST /review/submit`
- 至少一组 Redis 幂等能力落地在写接口上

## 4. 最适合当前阶段的推进顺序

推荐顺序不是按“模块数量”走，而是按“学习收益 + 风险可控”走：

1. 先把工程搭起来
2. 先迁只读接口
3. 再迁简单写接口
4. 再补 Redis 幂等
5. 最后才碰学习主链路写回

## 5. 第 0 周：准备阶段

这一周不追求功能，先把地基搭起来。

### 任务 0.1：建 Java 工程骨架

目标：

- 新建一个独立 Java 后端工程

最低任务：

- 新建 Maven 工程
- 引入 Spring Boot
- 引入 Spring Web
- 引入 MyBatis
- 引入 MySQL 驱动
- 引入 Redis 依赖

完成标准：

- 工程能启动
- 本地能看到一个健康接口

### 任务 0.2：建最小目录结构

建议结构：

```text
com.abandonclaw.backend
  common
  auth
  user
  review
  phrase
  learning
  scene
```

完成标准：

- 至少有 `controller / service / mapper / dto / model` 这层基础目录

### 任务 0.3：补基础设施

最低任务：

- MySQL 配置
- Redis 配置
- MyBatis 基础配置
- 全局异常处理
- 统一响应包装
- 基础日志输出

完成标准：

- 可以连上 MySQL
- 可以连上 Redis
- 出错时有统一 JSON 响应

### 任务 0.4：盘点第一阶段只会用到的表

第一阶段只需要先关注：

- `scenes`
- `user_scene_progress`
- `phrases`
- `user_phrases`
- `phrase_review_logs`
- `user_daily_learning_stats`

完成标准：

- 把这几张表的字段、索引、主键、唯一约束整理成你自己的建表笔记

## 6. 第 1 周：先打通只读接口

这一周重点不是写业务，而是熟悉：

- Controller
- Service
- Mapper
- DTO
- MyBatis 查询

### 任务 1.1：实现 `GET /review/summary`

建议顺序：

- 建 `ReviewController`
- 建 `ReviewQueryService`
- 建 `PhraseReviewLogMapper`
- 建 `UserPhraseMapper`

目标：

- 能返回最小 review summary 数据

为什么先做它：

- 读接口
- 价值高
- 链路不算太长

完成标准：

- 接口可访问
- 查询能跑通
- 返回结构稳定

### 任务 1.2：实现 `GET /phrases/mine`

建议顺序：

- 建 `PhraseController`
- 建 `PhraseQueryService`
- 建 `UserPhraseMapper`
- 需要时补 `PhraseMapper`

目标：

- 返回当前用户的表达列表

为什么这一步值：

- 能练分页 / 列表 / ownership 查询
- 数据语义直观

完成标准：

- 能按用户返回 mine 列表
- 基础排序与筛选可用

### 任务 1.3：实现 `GET /scenes`

建议顺序：

- 建 `SceneController`
- 建 `SceneQueryService`
- 建 `SceneMapper`

目标：

- 返回场景列表

为什么这一步值：

- 场景资源是共享表
- 能练“共享资源查询”和“用户态查询”的区别

完成标准：

- 能返回场景列表
- 能支持最小查询条件

### 任务 1.4：实现 `GET /scenes/{slug}`

目标：

- 返回单个场景详情

完成标准：

- 能按 slug 查详情
- 查询不到时有明确错误语义

## 7. 第 2 周：开始打通核心写接口

这一周开始真正练后端写操作。

重点是：

- 参数校验
- 事务
- ownership 校验
- 写后回读

### 任务 2.1：实现 `POST /phrases/save`

建议依赖：

- `PhraseController`
- `PhraseSaveService`
- `PhraseMapper`
- `UserPhraseMapper`

目标：

- 支持当前用户保存一个表达

完成标准：

- 正常保存
- 重复保存有明确处理策略
- 返回值能被前端消费

### 任务 2.2：实现 `POST /phrases/save-all`

目标：

- 支持批量保存表达

为什么这一步重要：

- 能练批量写入
- 能练参数校验
- 能练部分成功 / 全量成功策略

完成标准：

- 至少支持最小批量保存
- 有清晰的错误处理语义

### 任务 2.3：实现 `POST /review/submit`

建议依赖：

- `ReviewController`
- `ReviewSubmitService`
- `UserPhraseMapper`
- `PhraseReviewLogMapper`
- `UserDailyLearningStatsMapper`

目标：

- 提交一次 review 结果

这一步重点学：

- 多表写事务
- review 日志写入
- user_phrase 状态推进
- 每日统计回写

完成标准：

- 提交成功后数据一致
- 任一步失败时事务回滚

## 8. 第 3 周：给关键写接口接 Redis 幂等

这一周不要再扩接口数量，先把已经写好的接口做稳。

### 任务 3.1：给 `phrases/save` 接 Redis 幂等

目标：

- 同一个请求短时间内重复提交时不重复执行

完成标准：

- 双击不会重复保存
- 多实例语义下仍能去重

### 任务 3.2：给 `phrases/save-all` 接 Redis 幂等

目标：

- 防止批量保存被重复执行

完成标准：

- 重复请求不会重复写入整批数据

### 任务 3.3：给 `review/submit` 接 Redis 幂等

目标：

- 防止同一次复习提交被重复落库

完成标准：

- review log 不会重复写两次
- user_phrase 状态不会被重复推进

### 任务 3.4：整理统一幂等组件

目标：

- 不要每个接口自己手写一遍 Redis 幂等逻辑

建议收出：

- 幂等 key builder
- 幂等执行模板
- 幂等异常与返回策略

完成标准：

- 新接口可以低成本复用

## 9. 第 4 周：开始接学习主链路写回

等你前面三周跑顺，再进这一层。

### 任务 4.1：实现 `POST /learning/scenes/{slug}/start`

目标：

- 创建或续接用户学习状态

依赖重点：

- `SceneMapper`
- `UserSceneProgressMapper`
- `UserSceneSessionMapper`

### 任务 4.2：实现 `POST /learning/scenes/{slug}/progress`

目标：

- 回写学习进度

这是主链路高风险点，重点学：

- progress 更新
- session 更新
- 幂等
- 并发覆盖问题

### 任务 4.3：实现 `POST /learning/scenes/{slug}/complete`

目标：

- 完成一个 scene 的学习

重点：

- 状态推进
- 统计写入
- 事务边界

## 10. 第一阶段每周建议验证项

### 第 0 周验证

- 工程能启动
- MySQL 连接正常
- Redis 连接正常

### 第 1 周验证

- 只读接口能正确返回
- 空结果 / 未找到 / 未登录有稳定响应

### 第 2 周验证

- 写接口能成功写入
- 失败时能回滚
- ownership 校验有效

### 第 3 周验证

- 重复提交不会重复执行
- 幂等 TTL 生效
- Redis 不可用时有明确降级策略或明确失败策略

### 第 4 周验证

- learning 状态推进正确
- 重复调用不会把状态写坏

## 11. 第一阶段结束时，不要求什么

到第一阶段结束，你不需要：

- 实现 practice generate
- 实现 tts
- 实现 scenes generate
- 实现 expression-map generate
- 实现所有 admin 接口
- 实现全量 Redis 缓存

只要你已经做到：

- Java 工程骨架稳定
- 读接口会写
- 写接口会做事务
- 关键写接口会做 Redis 幂等

第一阶段就已经很成功。

## 12. 一份最小开工 checklist

如果你想要更短版本，可以直接看这个：

### 本周先做

1. 建 Spring Boot 工程
2. 连上 MySQL
3. 连上 Redis
4. 实现 `GET /review/summary`
5. 实现 `GET /phrases/mine`

### 下周再做

1. 实现 `POST /phrases/save`
2. 实现 `POST /phrases/save-all`
3. 实现 `POST /review/submit`

### 再下一周做

1. 给 `phrases/save` 接 Redis 幂等
2. 给 `phrases/save-all` 接 Redis 幂等
3. 给 `review/submit` 接 Redis 幂等

### 再往后做

1. 进入 learning 主链路
2. 再进 practice
3. 最后再碰 TTS 和生成链路

## 13. 最后结论

第一阶段最重要的不是“功能做了多少”，而是你有没有真正掌握这几件事：

- Spring Boot 后端的基本分层
- MyBatis 的表与 Mapper 落法
- 多表写事务
- Redis 幂等
- 主链路接口的最小稳定实现

只要这几件事站稳了，后面的 Java 重写就不是硬冲，而是顺着往前推。
