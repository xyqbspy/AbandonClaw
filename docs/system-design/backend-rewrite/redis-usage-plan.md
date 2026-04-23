# Java 重写里的 Redis 使用点清单

## 1. 这份文档解决什么问题

这份文档专门回答一个很容易说空的问题：

- 如果当前项目后端改成 `Java + Spring Boot + MySQL + MyBatis + Redis`
- 那 Redis 到底应该用在哪
- 哪些地方值得先上
- 哪些地方不要一开始就上

目标不是“把所有状态都塞进 Redis”，而是：

- 用 Redis 补当前项目最真实的短板
- 让并发、缓存、幂等、热点保护变得更稳
- 让你在学习 Java 后端时，练到真正有价值的 Redis 用法

## 2. 当前项目已经暴露出的 Redis 需求

从当前仓库看，Redis 需求不是凭空想出来的，而是已经存在真实信号。

### 2.1 限流已经有 Redis 形态，但不是强依赖

当前 `src/lib/server/rate-limit.ts` 的设计是：

- 有 Upstash Redis 时走分布式限流
- Redis 不可用时回退本地内存 Map

这说明项目已经明确需要：

- 限流
- 分布式计数
- TTL

但当前还没有把 Redis 升级成后端核心治理基础设施。

### 2.2 幂等还是进程内内存

当前 `src/lib/server/idempotency.ts` 是：

- 进程内 Map
- TTL 去重
- 适合防双击
- 不适合多实例

这说明 Redis 的第一价值不是“缓存页面列表”，而是：

- 把关键写接口的幂等从单实例升级为分布式

### 2.3 当前缓存层很分散

现在已经存在这些缓存层：

- 浏览器缓存：`src/lib/cache/*`
- 页面运行态缓存
- 服务端内存缓存
- TTS 签名 URL / pending 请求去重
- 生成类结果缓存

这说明 Redis 的第二价值是：

- 把服务端真正该统一的那部分短期状态收回来

### 2.4 生成类接口天然是热点与并发风险点

当前高成本接口主要有：

- `practice/generate`
- `phrases/similar/generate`
- `phrases/similar/enrich`
- `expression-map/generate`
- `scenes/generate`
- `tts`
- `tts/regenerate`

这些接口共同特点是：

- 成本高
- 容易重复点
- 容易并发打爆
- 适合结果缓存或生成去重

所以 Redis 的第三价值是：

- 做热点生成保护

## 3. Redis 在这个项目里最值得做的五类能力

如果你以后真做 Java 重写，Redis 最值得先做的不是“万物缓存”，而是这五类。

### 3.1 分布式幂等

这是第一优先级。

目标：

- 防止同一个写请求被多次执行

典型适用接口：

- `POST /review/submit`
- `POST /phrases/save`
- `POST /phrases/save-all`
- `POST /learning/scenes/[slug]/progress`
- `POST /learning/scenes/[slug]/complete`
- `POST /learning/scenes/[slug]/start`

推荐 Redis 语义：

- key：`idempotency:{scope}:{key}`
- value：请求处理中标记或最近成功结果摘要
- TTL：短 TTL，通常 `15s ~ 60s`

推荐用途：

- 防双击
- 防短时间重复重试
- 防多实例重复执行

当前最能改善的问题：

- 把现有“进程内 Map 幂等”升级成“多实例可用幂等”

### 3.2 分布式限流

这是第二优先级。

目标：

- 给高成本或容易被打爆的接口做统一限流

典型适用接口：

- `practice/generate`
- `phrases/similar/generate`
- `phrases/similar/enrich`
- `expression-map/generate`
- `scenes/generate`
- `tts`
- `tts/regenerate`

推荐 Redis 语义：

- key：`rate-limit:{scope}:{userId or ip}`
- value：计数器
- TTL：窗口长度

当前最能改善的问题：

- 不再依赖“Redis 挂了就回退成单实例限流”的轻量策略
- 把高成本接口治理做成后端标准能力

### 3.3 热点请求去重

这是第三优先级。

目标：

- 同一时间相同高成本请求只跑一次

典型适用场景：

- 同一个 scene 的 `practice/generate`
- 同一个 phrase 的 `similar/generate`
- 同一个 scene 的 `expression-map/generate`
- 同一段 TTS 文本生成

推荐 Redis 语义：

- key：`inflight:{domain}:{hash}`
- value：处理中标记
- TTL：短 TTL，防死锁

说明：

- 这不是长期缓存
- 它更像“正在生成，请不要再开一轮”

当前最能改善的问题：

- 防止多个请求同时打同一条生成链路
- 防止 AI / TTS 上游被重复调用

### 3.4 热点结果缓存

这是第四优先级。

目标：

- 对计算昂贵但短时间可复用的结果做服务端缓存

典型适用场景：

- `review/summary`
- `learning/dashboard`
- `phrases/summary`
- `recommendations/*`
- 某些生成结果摘要

推荐 Redis 语义：

- key：`cache:{domain}:{queryKey}`
- value：序列化后的响应 DTO
- TTL：中短 TTL，通常 `30s ~ 10m`

说明：

- 不要把用户持久状态放 Redis 当主存储
- Redis 只做“短期复用”

### 3.5 短期状态协调

这是第五优先级。

目标：

- 协调一些短时间存在、但跨实例需要共享的状态

典型适用场景：

- practice set 正在生成
- scene full TTS 冷却中
- 某个 regeneration 任务正在进行
- 某个批量后台任务正在跑

推荐 Redis 语义：

- key：`state:{domain}:{resourceId}`
- value：`pending / cooling_down / regenerating / ...`
- TTL：严格短期

说明：

- 这类状态不应该直接进 MySQL 主表
- 但又不适合只放本地内存

## 4. 当前项目里，哪些接口最该先用 Redis

### 4.1 第一批：必须先接 Redis 幂等

推荐先做：

- `POST /review/submit`
- `POST /phrases/save`
- `POST /phrases/save-all`
- `POST /learning/scenes/[slug]/progress`
- `POST /learning/scenes/[slug]/complete`

原因：

- 它们都是主链路写接口
- 都可能双击或重复重试
- 都有多实例重复执行风险

### 4.2 第二批：必须先接 Redis 限流

推荐先做：

- `POST /practice/generate`
- `POST /phrases/similar/generate`
- `POST /phrases/similar/enrich`
- `POST /expression-map/generate`
- `POST /tts`
- `POST /tts/regenerate`

原因：

- 它们成本高
- 容易被连续点击
- 容易成为流量尖刺入口

### 4.3 第三批：适合做生成去重

推荐先做：

- `practice/generate`
- `expression-map/generate`
- `phrases/similar/generate`
- `scenes/generate`
- `tts`

原因：

- 同一资源在短时间被重复请求，几乎没有业务价值
- 但会真实消耗模型、TTS、存储或 CPU 成本

### 4.4 第四批：适合做短 TTL 结果缓存

推荐先做：

- `review/summary`
- `learning/dashboard`
- `phrases/summary`
- `recommendations/scenes/*`

原因：

- 这些接口很适合短时间复用
- 但不值得一开始就上复杂缓存失效体系

## 5. 当前项目里，哪些表最值得和 Redis 联动

Redis 不是替代表，只是协同。

### 5.1 和幂等最强相关的表

- `user_phrases`
- `phrase_review_logs`
- `user_scene_progress`
- `user_scene_sessions`
- `user_daily_learning_stats`

原因：

- 这些表背后的写操作最容易重复提交

### 5.2 和生成保护最强相关的表

- `user_scene_practice_sets`
- `user_scene_practice_runs`
- `user_scene_practice_attempts`
- `user_scene_variant_runs`
- `ai_cache`

原因：

- 这些表背后要么是生成结果，要么是高频运行态

### 5.3 和热点读缓存最强相关的表

- `scenes`
- `user_scene_progress`
- `user_phrases`
- `phrase_review_logs`

原因：

- dashboard / summary / list 聚合经常会组合读取它们

## 6. Java 重写里推荐的 Redis key 分类

建议一开始就把 key 命名收好，不然后面会乱。

### 6.1 幂等 key

```text
idempotency:{domain}:{requestKey}
```

示例：

```text
idempotency:review-submit:{hash}
idempotency:phrase-save:{hash}
idempotency:learning-progress:{hash}
```

### 6.2 限流 key

```text
rate-limit:{domain}:{actor}
```

示例：

```text
rate-limit:practice-generate:user-123
rate-limit:tts:ip-1.2.3.4
```

### 6.3 处理中 key

```text
inflight:{domain}:{resourceKey}
```

示例：

```text
inflight:practice-generate:scene-abc
inflight:tts:sentence-xyz
```

### 6.4 短期缓存 key

```text
cache:{domain}:{queryKey}
```

示例：

```text
cache:review-summary:user-123
cache:learning-dashboard:user-123
```

### 6.5 短期状态 key

```text
state:{domain}:{resourceKey}
```

示例：

```text
state:tts-cooldown:scene-full-abc
state:practice-set-generation:scene-abc
```

## 7. 不要一开始就用 Redis 做什么

这部分很重要。

### 7.1 不要把 Redis 当主数据库

不要做：

- 用户主进度只放 Redis
- user_phrase 主数据只放 Redis
- review log 不落 MySQL 只写 Redis

原因：

- 这些都属于权威持久数据
- Redis 只能做协同，不该做主存储

### 7.2 不要一开始就做复杂多级缓存体系

不要一开始就上：

- Redis + 本地缓存 + 二级缓存 + 消息总线失效通知

对当前阶段更合适的是：

- MySQL 作为权威层
- Redis 做短 TTL 缓存和并发治理

### 7.3 不要所有列表都先缓存

先别急着缓存：

- 所有分页列表
- 所有后台管理查询
- 所有低频接口

更好的顺序是：

- 先缓存高频聚合结果
- 再看哪些列表真的热

## 8. 最适合你的学习落地顺序

如果你现在是从零学 Java 后端，我建议 Redis 也按学习收益来接，不要一次接完。

### 阶段 1：先只接幂等

目标：

- 把 `review/submit`
- `phrases/save`
- `phrases/save-all`

这几类写接口先接上 Redis 幂等

你能学到：

- Redis key 设计
- TTL
- SETNX / 原子性思维
- 幂等语义

### 阶段 2：再接限流

目标：

- 给高成本生成接口加上 Redis 限流

你能学到：

- 窗口限流
- 用户维度 / IP 维度限流
- 限流异常设计

### 阶段 3：再接生成去重

目标：

- 给 `practice/generate`、`tts` 这类接口加上 inflight 去重

你能学到：

- 分布式锁的最小用法
- 如何避免重复生成
- 如何设计处理中状态

### 阶段 4：最后再接热点缓存

目标：

- 给 `dashboard / summary / recommendations` 这类读接口补短 TTL 缓存

你能学到：

- 缓存穿透与过期
- 读缓存收益判断
- 缓存失效边界

## 9. 一份更适合当前项目的 Redis 优先级结论

对这个项目来说，Redis 最有价值的顺序不是：

1. 先缓存所有列表
2. 再考虑幂等

而应该反过来：

1. 先做写接口幂等
2. 再做高成本接口限流
3. 再做生成去重
4. 最后再做热点读缓存

这才是真正贴近当前项目问题的顺序。

## 10. 最后结论

如果你以后用 Java 重写这个项目，Redis 最值得服务的不是“页面体验”，而是三件更硬的事：

- 写接口不重复执行
- 高成本接口不被打爆
- 生成链路不被重复并发触发

等这三件事站稳了，再去做热点读缓存，收益才是正的。
