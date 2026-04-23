# 当前后端现状与 Java 重写评估

## 1. 这份文档解决什么问题

这份文档回答四个问题：

- 当前项目的“后端”实际上用了哪些技术和实现方式
- 当前后端架构有哪些真实不足，不只是抽象层面的“看起来不够企业级”
- 如果改用 `Java + Maven + Spring Boot + MySQL + MyBatis + Redis` 全套重写，需要做哪些事
- 如果把这次重写作为你的 Java 后端学习项目，应该按什么顺序推进

这不是“建议立刻推倒重做”的文档，而是一份基于当前项目现状的评估与学习路线图。

## 2. 当前项目后端到底是什么

当前项目不是“前端 + 独立后端”双仓结构，而是 **Next.js 应用内嵌后端接口层**：

- API 入口：`src/app/api/*`
- 服务层：`src/lib/server/*`
- 数据层：`Supabase PostgreSQL + SQL migration + RLS`
- 鉴权：`Supabase Auth`
- 对象存储：`Supabase Storage`
- 限流：`src/lib/server/rate-limit.ts`
- 幂等去重：`src/lib/server/idempotency.ts`
- TTS：`msedge-tts` + Storage + 本地/服务端多层缓存
- 前端还有一整套浏览器侧缓存：`src/lib/cache/*`

可以把它理解成：

1. `Next.js route handlers` 承担 Controller / API Gateway
2. `src/lib/server/*` 承担 Service / Repository / 集成层
3. `Supabase` 同时承担 Auth、DB、RLS、Storage
4. 浏览器端和页面层还承担了一部分缓存与降级逻辑

### 2.1 当前已经存在的后端能力

从仓库现状看，当前后端并不“简单”，已经有这些能力：

- 学习主链路接口：`learning / review / scenes / phrases / practice / recommendations`
- 后台接口：`admin/*`
- 数据权限边界：大量用户态表已经切到 `createSupabaseServerClient + RLS`
- 关键写接口幂等保护：`review submit`、`learning progress/start/...`、`phrases save/save-all`
- 限流能力：支持 Upstash Redis，失败时回退本地内存
- TTS 生成、预热、缓存、重生成
- Practice set 服务端落库与 latest set 恢复
- 一批上线检查脚本：`load:api-baseline`、`validate:db-guardrails`、`maintenance:check`

这意味着当前系统不是“没有后端”，而是 **后端和前端同仓、强耦合、以 Supabase 为核心基础设施的 TypeScript 后端**。

## 3. 当前后端技术栈清单

### 3.1 运行时与接口层

- `Next.js 16`
- `React 19`
- `TypeScript 5`
- `Route Handlers` 作为 HTTP API

当前 API 目录已经覆盖：

- `src/app/api/learning/*`
- `src/app/api/review/*`
- `src/app/api/phrases/*`
- `src/app/api/scenes/*`
- `src/app/api/scene/*`
- `src/app/api/practice/*`
- `src/app/api/tts/*`
- `src/app/api/admin/*`

### 3.2 数据与权限

- `Supabase PostgreSQL`
- `supabase/sql/*.sql` 维护数据库结构和阶段性 migration
- `Supabase Auth`
- `RLS` 承接大量用户态读写权限

当前有两类 Supabase client：

- `createSupabaseServerClient()`：用户上下文 + cookie，适合用户态读写
- `createSupabaseAdminClient()`：`service role`，适合后台白名单入口、共享表、跨用户任务

### 3.3 可靠性与运行保护

- `rate-limit.ts`
  - 有 Upstash Redis 时走分布式限流
  - 没配置或上游失败时回退到本地内存 Map
- `idempotency.ts`
  - 当前是 **进程内内存 Map + TTL**
  - 只能保护单实例、短时间重复提交
- `request-guard.ts`
  - 做来源校验、`Origin` 防护

### 3.4 缓存与性能层

当前项目缓存不是单层，而是多层并存：

- 浏览器缓存：`src/lib/cache/*`
- 页面运行态缓存
- 服务器内存缓存
- TTS URL / pending request 去重
- AI / 生成类结果缓存
- 可选 Upstash Redis 限流缓存

这套方案对当前项目是实用的，但也意味着缓存职责比较分散。

## 4. 当前后端的真实不足

这里不说“不是 Java 所以不好”，只说当前架构里真实存在的问题。

### 4.1 前后端边界不够独立

当前后端嵌在 Next.js 项目内，优点是开发快，缺点是：

- API、页面、缓存、页面降级逻辑容易缠在一起
- 前端改动时很容易顺带触到后端语义
- 很难天然形成“独立后端服务”的工程习惯
- 对想系统学习 Java 后端的人来说，不够典型

### 4.2 权限模型强依赖 Supabase / RLS

当前用户态权限很多交给了：

- Supabase Auth
- RLS
- SQL policy

这对产品很省事，但如果你想学习经典 Java 后端，会有一个问题：

- 你学到的会更像“如何接 Supabase”
- 而不是“如何自己写 Controller / Service / Mapper / 权限控制 / 事务管理”

### 4.3 幂等保护目前不是分布式的

当前 `idempotency.ts` 明确是进程内内存 Map。

这意味着它能解决：

- 用户双击
- 短时间重复提交

但它不能稳定解决：

- 多实例部署
- 重试打到不同实例
- 进程重启后的去重连续性

这个问题在当前文档里已经是明确剩余风险。

### 4.4 限流是“可分布式”，但不是全量强依赖

当前限流设计是：

- 优先 Upstash Redis
- Redis 不可用时回退本地内存

这保证了可用性，但也意味着：

- 在极端情况下会退化成单实例限流
- 限流策略和实例数相关
- 一些高成本接口的治理强度仍受基础设施状态影响

### 4.5 缓存分层较多，职责不够集中

当前缓存横跨：

- 浏览器本地缓存
- 页面运行态缓存
- 服务端内存缓存
- TTS 缓存
- 生成结果缓存

这不等于设计错误，但会带来两个后果：

- 排查一致性问题时，需要同时理解前端缓存和后端缓存
- 想迁移到独立后端时，必须先分清“哪些缓存应该留前端，哪些应该进 Redis”

### 4.6 并发写入与热点保护还有继续增强空间

当前系统已经有最小保护，但对更典型的后端问题还没有系统化方案，例如：

- 热点资源锁
- 生成任务去重
- 分布式幂等
- 基于 Redis 的短期状态协调
- 更标准的事务边界与数据库版本保护

### 4.7 可观测性和运维标准还是轻量级

当前已有：

- baseline 脚本
- readiness checklist
- 最小日志和 requestId 语义

但如果按独立后端标准看，仍然偏轻：

- 指标体系不完整
- 链路追踪不完整
- 后端运行面板还不是成熟 APM 体系
- 错误分类、告警、性能分析可以更系统

## 5. 如果用 Java 全套重写，会重写什么

如果你要用 `Maven + Spring Boot + MySQL + MyBatis + Redis` 重写，不是把 TypeScript 翻译成 Java，而是要重建一套独立后端。

至少会涉及下面这些层。

### 5.1 工程与基础设施层

需要新建一个独立后端工程，至少包含：

- `Maven`
- `Spring Boot`
- `Spring Web`
- `MyBatis`
- `MySQL Driver`
- `Spring Data Redis` 或等价 Redis 集成
- 统一异常处理
- 统一返回体
- 参数校验
- 日志体系
- 环境配置体系

建议模块最少先分为：

- `controller`
- `service`
- `mapper`
- `domain` / `dto`
- `config`
- `common`

### 5.2 数据库层

需要把当前 Supabase / Postgres 里的核心数据模型重新设计到 MySQL：

- 用户
- 场景
- 用户场景进度
- 学习 session
- 用户短语
- 复习日志
- 表达关系 / cluster
- practice set
- practice run / attempt
- variant run
- TTS 资源映射

这一步不是机械搬表，至少要做三件事：

1. 盘点现有表、字段、索引、唯一约束
2. 明确哪些是用户私有表，哪些是共享资源表
3. 重新设计 MySQL 下的索引、事务边界和读写模式

### 5.3 权限与认证层

当前项目很多权限依赖 Supabase Auth + RLS。  
一旦换成 Java 后端，你需要自己接管：

- 登录态校验
- token / session 解析
- 当前用户上下文注入
- 用户资源归属校验
- 管理后台权限校验

也就是说，**RLS 帮你做掉的那部分事，要改成应用层权限控制**。

### 5.4 业务层

至少要把当前这几个业务域重新实现：

- 学习聚合：today / continue / overview / dashboard
- scene 学习链路：start / progress / pause / complete
- practice set：生成、保存、恢复、latest set 获取
- review：due / submit / summary
- phrases：save / save-all / mine / relations / cluster / similar
- recommendations
- TTS 生成与重生成
- admin 维护入口

### 5.5 缓存与并发层

如果重写成 Java，这一层是最值得真正重建的：

- 用 `Redis` 做分布式限流
- 用 `Redis` 做分布式幂等
- 用 `Redis` 做热点缓存
- 用 `Redis` 做短期锁 / 生成任务去重
- 用 `Redis` 做 cooldown / pending 状态协调

这部分会直接影响你想重点学习的两个主题：

- 并发控制
- 缓存设计

### 5.6 外部集成层

当前项目还有几类外部依赖，Java 重写时都要重新接：

- TTS 服务
- 对象存储
- AI / 模型调用
- 后台管理任务

这一步会连带引出：

- 超时控制
- 重试策略
- 熔断 / 降级
- 失败日志与可观测性

## 6. Java 重写后，能改善当前哪些问题

前提先说清楚：**Java 重写不会自动让系统变好**。  
它的价值在于，你有机会把当前已经显露的问题，用更典型的后端方式重新收一遍。

### 6.1 更适合系统学习后端分层

你能完整练到：

- Controller
- Service
- Mapper
- DTO / VO / Query
- 事务
- 缓存
- 异常处理
- 权限控制
- 运维配置

这一点对“从零学 Java 后端”非常有价值。

### 6.2 并发保护可以做得更稳

当前系统的幂等和部分运行保护还是偏单实例。  
重写后你可以系统补上：

- Redis 分布式幂等
- 分布式限流
- 热点请求去重
- 生成类任务锁
- 更清晰的事务边界

这会直接改善：

- 重复提交
- 高并发下的多次生成
- 多实例部署时的数据一致性风险

### 6.3 缓存职责能更清晰

重写时可以重新划分：

- 前端缓存：只保留首屏体验、弱网降级、短时回填
- Redis：负责服务端热点缓存、短期状态、分布式协调
- MySQL：作为权威持久层

这样会比当前“浏览器缓存 + 运行态缓存 + 内存缓存 + 可选 Redis”更容易讲清楚。

### 6.4 可观测性更容易标准化

在 Spring Boot 里，你更容易系统练到：

- 统一日志格式
- 全局异常处理
- 请求链路标识
- 慢 SQL / 慢接口分析
- Redis / MySQL 运行状态观察

### 6.5 数据访问边界更直观

当前不少数据边界依赖 RLS。  
Java 重写后，虽然工作量更大，但你会更清楚地看到：

- 谁在查用户数据
- 谁在写共享资源
- 哪些接口需要事务
- 哪些写操作需要幂等和锁

这对训练“后端工程脑子”非常有帮助。

## 7. 但它不能自动解决什么

这个部分很重要，不然很容易对“重写”有错觉。

Java 重写 **不会自动解决**：

- 产品规则本身是否复杂
- 学习主链路是否已经足够稳定
- 前端缓存与体验设计是否合理
- TTS / AI 上游服务本身的不稳定
- 业务语义不清时的错误实现

换句话说：

- Java 适合帮你把后端工程能力补完整
- 但它不会替你省掉业务建模和系统迁移成本

## 8. 从学习角度看，值不值得做

我的判断是：**值得，但不要一口气全推倒。**

原因有三个：

### 8.1 这个项目已经有真实业务，不是空 Demo

你不是对着 todo-demo 学 Java，而是对着已经存在的：

- 学习链路
- review 逻辑
- scene / practice / chunks 语义
- 缓存与状态恢复问题
- 幂等、限流、TTS、生成任务

这会让你学到的后端知识更接近真实项目。

### 8.2 当前仓库已经给了你“需求和领域模型”

你现在最省事的地方不是代码，而是：

- 产品目标已经比较清晰
- 主业务域已经划分出来
- 接口大致存在
- 数据模型已有雏形

所以很适合拿来做 Java 重构练习。

### 8.3 但不建议直接大迁移

如果你现在是“从零开始学 Java 后端”，最稳的做法是：

- 先把当前项目当作 **领域样本**
- 再做一个 **并行的 Java 后端版本**
- 先迁移读接口，再迁移写接口

而不是立刻替换当前线上主链路。

## 9. 推荐的 Java 重构大纲

这里给你一个更适合学习的分阶段大纲。

### 阶段 0：先冻结现状，不急着写 Java

目标：

- 把当前 API、表结构、核心流程盘清楚

你要产出的不是代码，而是三张清单：

1. API 清单
2. 数据表清单
3. 业务域清单

最低要盘清：

- 哪些接口是读
- 哪些接口是写
- 哪些写操作必须幂等
- 哪些接口成本高，需要限流或缓存
- 哪些数据是用户私有，哪些是共享资源

### 阶段 1：先搭 Java 基础工程

目标：

- 跑起最小 Spring Boot 项目

先只做基础设施：

- Maven 多环境配置
- Spring Boot 启动
- MySQL 连接
- MyBatis 最小 Mapper
- Redis 连接
- 统一响应体
- 全局异常处理
- 基础日志

这一阶段不要急着接复杂业务。

### 阶段 2：先迁移最简单的只读接口

推荐先做：

- `review/summary`
- `learning/dashboard`
- `phrases/mine`
- `recommendations/scenes`

原因：

- 读接口更容易验证
- 没有复杂回写
- 你可以先熟悉 Controller -> Service -> Mapper 的完整链路

### 阶段 3：补认证与用户上下文

目标：

- 让 Java 服务能识别当前用户，并做最小权限校验

这一步要补：

- 登录态传递方式
- 用户上下文注入
- 用户资源 ownership 校验
- admin 权限入口

如果这一步没收好，后面所有写接口都会发散。

### 阶段 4：迁移核心写接口

推荐顺序：

1. `phrases/save`
2. `phrases/save-all`
3. `review/submit`
4. `learning/scenes/[slug]/progress`

这一步重点学的不是 CRUD，而是：

- 参数校验
- 事务
- 幂等
- 写后回读
- 错误分类

### 阶段 5：补 Redis 的三类核心能力

把 Redis 明确只用在最值钱的地方：

1. 分布式幂等  
2. 分布式限流  
3. 热点缓存 / 短期锁

优先落在：

- review submit
- phrases save/save-all
- practice generate
- tts generate / regenerate

### 阶段 6：迁移高成本生成链路

最后再做：

- practice set generate / save / latest set
- expression map generate
- similar enrich / generate
- TTS 生成与重生成

因为这些链路会同时牵涉：

- 上游调用
- 缓存
- 并发
- 失败重试
- 成本控制

它们最适合在你已经掌握前几阶段之后再做。

### 阶段 7：做双跑与结果比对

不要直接切换。

建议做：

- 旧接口继续可用
- Java 新接口并行跑
- 对比关键读接口输出
- 对比关键写接口副作用

如果你想更稳一点，还可以做：

- 灰度切流
- 管理后台对账页面
- 双写比对日志

### 阶段 8：最后才考虑正式替换

只有在下面这些都成立时，才值得切：

- 关键读接口结果稳定一致
- 核心写接口副作用一致
- 幂等、限流、缓存策略稳定
- TTS / 生成类链路有降级方案
- MySQL / Redis 运维方式已经跑顺

## 10. 推荐的模块划分

如果你真要开一个 Java 后端仓，我建议先这样分，不要一开始就微服务。

- `auth`
- `user`
- `learning`
- `scene`
- `practice`
- `review`
- `phrases`
- `expression`
- `tts`
- `admin`
- `common`

先做单体应用即可。  
对你现在这个阶段，**模块化单体** 比一开始拆微服务更合适。

## 11. 一份更适合你的学习顺序

如果目标是“通过当前项目学会 Java 后端”，建议顺序是：

1. 先读懂当前 TypeScript 后端的 API 和数据模型
2. 再用 Java 重写 2-3 个只读接口
3. 再重写 1-2 个关键写接口
4. 再补 Redis 幂等、限流、缓存
5. 最后碰 practice / TTS / AI 生成链路

这样学，反馈最快，也最不容易被复杂链路压垮。

## 12. 最后结论

结论很直接：

- **值得基于当前项目学 Java 后端**
- **也值得做一个并行的 Java 重写版本**
- 但 **不建议一上来就全量替换当前后端**

更稳的路径是：

1. 把当前项目当作业务样本
2. 用 Java 重做一个独立后端
3. 先迁移简单读接口
4. 再迁移核心写接口
5. 最后才碰高成本生成链路和正式切换

如果你的目标是学习，这个项目非常合适；  
如果你的目标是短期上线效率，当前 Next.js + Supabase 体系反而更快。

这两件事并不矛盾：

- 当前体系适合继续支撑产品迭代
- Java 重写适合当你的后端学习主项目
