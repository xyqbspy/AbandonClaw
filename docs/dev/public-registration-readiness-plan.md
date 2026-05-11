# 公网开放注册与滥用防护执行计划

## 1. 结论

当前项目已经具备小规模真实用户内测所需的基础能力：

- Supabase Auth 登录/注册
- 受保护页面和 API 的登录拦截
- 用户态表的 RLS 隔离
- 高成本接口限流
- 受保护写接口 Origin 校验
- `requestId` 与统一错误收口
- 学习时长、连续学习、完成场景等基础学习统计

但当前状态不建议直接无门槛公网开放注册。比较合适的下一步不是一次性建设完整平台，而是先进入：

> `invite_only_strict` 的前半段：邀请码 + 邮箱验证 + Redis 限流 + user/IP 双维度限流 + 真实 HTTP baseline。

这套做完，可以小范围给 10-50 个真实用户试用。如果入口要发到小红书、推特、公开群或任何不可控渠道，则必须继续补 P0-B 里的每日额度、用量查看和封禁能力。

## 1.1 当前实施状态（2026-05-09）

已落地 P0-A 的代码侧硬门槛：

- `REGISTRATION_MODE=closed | invite_only | open`，非法或缺失值保守回退为 `closed`。
- 注册页改为调用服务端 `/api/auth/signup`，不再由浏览器直接绕过项目层创建账号。
- `invite_only` / `open` 模式下，注册入口会在邀请码校验和 Auth 注册前执行同一 IP 频控；阈值可由 `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 与 `REGISTRATION_IP_LIMIT_WINDOW_SECONDS` 覆盖。
- `invite_only` 使用 `registration_invite_codes` 和 `registration_invite_attempts` 表，邀请码只存 hash，支持 `max_uses`、`used_count`、`expires_at`、启停状态和补偿状态。
- 邮箱未验证用户会被拦截到 `/verify-email`，受保护 API 返回 403，不进入学习主链路或高成本入口。
- 高成本接口已接入 user + IP 双维度限流：practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate。
- `/api/admin/status` 暴露 `rateLimitBackend.kind` 和 `upstashConfigured`，用于确认当前是 `upstash` 还是 `memory`。
- 已新增 `pnpm run load:public-registration-baseline`，把注册模式、邮箱验证、Origin、user/IP 限流、daily quota、账号状态和 admin status 收口为统一的真实 HTTP baseline 入口。

仍然不代表可以公开发到不可控渠道。P0-B 的代码侧硬防护已经落地，但真实环境 baseline 证据还没有补齐；若入口要发到公开社群、社媒或任何不可控渠道，必须先补跑真实环境结果并记录。

真实 HTTP baseline 状态：

- 单元/类型验证已覆盖注册模式、邮箱未验证拦截、user/IP 限流、429 requestId 和限流后端状态。
- 已新增统一 runner：`pnpm run load:public-registration-baseline --dry-run --config-file=scripts/load-samples/public-registration-http-baseline.sample.json`
- 当前轮未连接真实 Supabase/Upstash 生产环境执行完整 HTTP baseline；小范围开放前必须按第 8 节清单补跑并记录结果。

## 2. 公开模式矩阵

| 模式 | 适用阶段 | 注册方式 | 生成额度 | 管理要求 |
| --- | --- | --- | --- | --- |
| `closed` | 内部开发 | 禁止注册 | 仅管理员或内部账号 | 无 |
| `invite_only_soft` | 熟人内测 | 邀请码 | 宽松额度，可先只做 user/IP 短窗口限流 | SQL 可查即可 |
| `invite_only_strict` | 小范围公开 | 邀请码 + 邮箱验证 | user + IP + daily quota | admin 可看用量 |
| `open_guarded` | 半公开 | 邮箱验证 + 注册频控 | 完整额度 + 基础风控 | admin + 封禁 |
| `open` | 正式开放 | 公开注册 | 完整风控 | 运营后台完整 |

当前最适合的目标模式：

- 短期：`invite_only_strict` 的前半段
- 不建议：直接进入 `open_guarded` 或 `open`

判断方式：

- 只发给熟人、朋友、少量测试用户：P0-A 必须完成，P0-B 可以同步补。
- 发到公开社区、社交媒体、公开群：P0-A 和 P0-B 都应提前完成。
- 要长期自然增长：至少进入 `open_guarded`。

## 3. 现有能力盘点

### 3.1 学习数据

当前已经有账号级学习数据：

- `user_scene_progress.total_study_seconds`
  - 某用户在某场景累计学习秒数
- `user_scene_progress.today_study_seconds`
  - 某用户在某场景当天学习秒数
- `user_daily_learning_stats.study_seconds`
  - 某用户某天学习总秒数
- `user_daily_learning_stats.scenes_started`
  - 某用户某天开始学习的场景数
- `user_daily_learning_stats.scenes_completed`
  - 某用户某天完成的场景数
- `user_daily_learning_stats.review_items_completed`
  - 某用户某天完成的复习条目数
- `user_daily_learning_stats.phrases_saved`
  - 某用户某天保存表达数

主要入口：

- `src/lib/server/learning/service.ts`
- `src/app/(app)/progress/page.tsx`
- `docs/system-design/learning-overview-mapping.md`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`

当前这些数据适合用于：

- 用户自己的学习进度展示
- 连续学习天数
- 最近 7 天学习分钟数
- 基础产品运营观察

当前这些数据不适合用于：

- 计费
- 排行榜
- 严格防作弊
- 公开用户等级
- 高价值奖励发放

原因：学习秒数主要来自前端 `studySecondsDelta` 上报，服务端只做非负整数归一化，没有做强会话计时、心跳节流和异常上报识别。

### 3.2 登录与用户隔离

当前已经有：

- Supabase Auth 注册和登录
- `middleware.ts` 保护主应用页面
- `middleware.ts` 保护主要 API
- 后台入口通过 admin email 白名单限制
- 用户态表逐步回到 RLS 最小权限模型

主要入口：

- `middleware.ts`
- `src/lib/server/auth.ts`
- `src/lib/shared/auth-redirect.ts`
- `docs/domain-rules/auth-api-boundaries.md`
- `openspec/specs/auth-api-boundaries/spec.md`

### 3.3 接口治理

当前已经有：

- `requestId` 追踪
- 统一错误响应
- 高成本接口限流
- Upstash Redis 共享限流优先
- Redis 不可用时回退进程内限流
- 受保护写接口 Origin 校验
- 最小安全响应头

主要入口：

- `src/lib/server/rate-limit.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/api-error.ts`
- `src/lib/server/request-context.ts`
- `docs/dev/backend-release-readiness-checklist.md`
- `openspec/specs/api-operational-guardrails/spec.md`

## 4. 主要风险

### 4.1 批量注册

风险：

- 攻击者可以批量创建账号。
- 如果限流只按 user id，批量账号可以绕过单账号限制。
- 邮箱验证如果没有开启，垃圾账号成本更低。

当前状态：

- 注册已经统一走服务端 `/api/auth/signup`。
- 项目层已补最小同一 IP 注册频控。
- 仍没有验证码、邮箱域名策略或更复杂注册风控。

影响：

- 数据库 profiles、学习表、日志表膨胀。
- 高成本接口被多账号绕过。
- 运营后台难以区分真实用户和垃圾账号。

### 4.2 高成本接口被刷

风险：

- AI 生成、练习生成、TTS、解释接口都有外部成本或较高计算成本。
- 单用户限流不能防批量账号。
- 内存限流不能覆盖多实例部署。

当前状态：

- 高成本接口已经接入统一限流。
- 支持 Upstash Redis。
- 如果没有 Redis，会退回单实例内存限流。

影响：

- 外部模型账单暴涨。
- 请求排队或超时。
- 正常用户体验被拖慢。

### 4.3 学习时长刷数

风险：

- 前端可以上报 `studySecondsDelta`。
- 如果恶意调用接口，可以刷学习时长。

当前状态：

- 服务端会把学习秒数归一为非负整数。
- 没有按会话、页面活跃、心跳间隔做强校验。

影响：

- Progress 页展示被刷。
- 连续学习和最近 7 天学习分钟数不再可信。
- 如果未来接排行榜、奖励或公开成就，会产生作弊风险。

### 4.4 缺少运营与封禁入口

风险：

- 发现异常后没有快速处理入口。
- 只能依赖数据库或日志手工排查。

当前状态：

- 有基础 requestId 和 observability 方向。
- 还缺少面向公网运营的用户、成本、异常请求、封禁视图。

影响：

- 攻击发生时响应慢。
- 无法快速定位“哪个账号、哪个 IP、哪个接口”。

### 4.5 配置漂移

风险：

- 生产环境忘记配置 Upstash Redis、APP_ORIGIN 或 Supabase 邮箱验证。
- 本地可用不代表公网安全。

当前状态：

- 有上线前检查清单。
- 但公网开放注册需要更严格的必选项。

影响：

- 限流退化。
- Origin 校验不符合实际域名。
- 注册入口过宽。

## 5. 任务优先级

### P0-A：不开这个绝对不能公开

目标：允许 10-50 个真实用户小范围试用，同时不把注册和高成本接口裸露到公网。

这些是硬门槛。没有完成，不建议给任何不可控用户访问。

#### P0-A.1 `REGISTRATION_MODE=invite_only`

要求：

- 新增 `REGISTRATION_MODE` 环境变量。
- 支持至少三种模式：
  - `closed`
  - `invite_only`
  - `open`
- 生产环境第一阶段必须使用 `invite_only`，不能误开 `open`。

验收：

- `closed` 时无法创建新账号。
- `invite_only` 时注册页要求邀请码。
- `open` 只能在明确切换后启用。

#### P0-A.2 邀请码注册

要求：

- 注册前校验邀请码。
- 注册成功后记录邀请码使用。
- 没有有效邀请码不能注册。

不建议只使用一个全局环境变量作为长期方案。`INVITE_CODE=abc123` 一旦泄露，就等于全网可注册。

更好的最小实现：

- 建一张 invite code 表。
- 每个 code 有 `max_uses`。
- 每个 code 有 `used_count`。
- 可选 `expires_at`。
- 注册成功后写入使用记录。

需要注意的一致性问题：

- Supabase Auth 账号创建和邀请码扣次数很难天然处在同一个数据库事务里。
- 至少要记录 invite usage attempt，避免出现“校验通过但创建失败 / 创建成功但邀请码没扣次数”后完全不可追踪。
- 如果账号创建成功但邀请码扣次数失败，应记录补偿事件，管理员可以重放或手工修复。

验收：

- 邀请码不存在时注册失败。
- 邀请码过期时注册失败。
- 邀请码超过 `max_uses` 时注册失败。
- 注册成功后 `used_count` 增加。
- 创建失败不会误扣不可恢复的次数，或至少有补偿记录。

#### P0-A.3 Supabase 邮箱验证确认

要求：

- Supabase 项目确认开启邮箱验证策略。
- 注册成功但邮箱未验证时，不允许进入主应用。
- 不只是“Supabase 发验证邮件”，主应用入口也要判断用户是否完成邮箱验证。

建议检查点：

- middleware 或 profile 初始化前检查邮箱验证状态。
- 未验证用户只能进入登录、验证提示或重发邮件页面。
- 已验证用户才能进入 `/today`、`/scenes`、`/review` 等主链路。

验收：

- 新注册未验证账号不能进入主应用。
- 邮箱验证后能正常进入主应用。
- 未验证状态不会创建大量学习数据。

#### P0-A.4 高成本接口 user + IP 双维度限流

要求：

- 对 AI / TTS / generate 接口同时按 user id 和 IP 限流。
- 避免批量账号从同一 IP 低成本绕过。

先保护这些接口：

- `/api/practice/generate`
- `/api/scenes/generate`
- `/api/phrases/similar/generate`
- `/api/expression-map/generate`
- `/api/explain-selection`
- `/api/tts`
- `/api/tts/regenerate`

最小实现：

- 扩展限流调用，支持同一接口入口执行多个 key：
  - `user:${user.id}`
  - `ip:${clientIp}`
- client IP 获取要考虑代理头，并在文档中记录部署环境信任哪个 header。

验收：

- 同一用户超限返回 429。
- 同一 IP 多账号超限返回 429。
- 429 响应带 `requestId`。
- 正常用户在阈值内不受影响。

#### P0-A.5 生产环境必须是 Redis 限流

要求：

- 公网环境必须配置 Upstash Redis。
- 公网开放不接受 memory-only 限流。
- Redis 不可用时可以为了可用性 fallback，但必须有可见告警，不能让维护者误以为处于完整保护。

最小实现：

- 在上线检查中把 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 标为公网必填。
- 增加一个 `/api/admin/status` 或现有 status 中的 rate limit backend 状态。
- 文档明确：公网开放不接受 memory-only 限流。

验收：

- 管理员能看到当前限流后端是 `upstash` 还是 `memory`。
- 生产配置缺少 Redis 时有明确告警。
- 真实 HTTP baseline 记录当前限流后端。

#### P0-A.6 真实 HTTP baseline 验证

要求：

- 不只跑单测，要用真实 HTTP 入口验证。

最小验收：

- `closed` 模式注册失败。
- `invite_only` 无邀请码注册失败。
- `invite_only` 有邀请码注册成功。
- 未验证邮箱不能进入主应用。
- 登录后 `practice generate` 正常。
- 同用户限流命中 429。
- 同 IP 多账号限流命中 429。
- Origin 不匹配的写请求被拒绝。

记录位置：

- `docs/dev/dev-log.md`
- 或对应 OpenSpec change 的归档 `tasks.md`

### P0-B：最好开放前做，但极小范围可以同步补

目标：从“可以给熟人试用”推进到“可以发到小范围公开渠道”。

如果第一批只发给熟人、朋友、少量测试用户，P0-B 可以晚于 P0-A 一点点。但如果入口要发到公开社区、推特、小红书、公开群或任何不可控渠道，P0-B 应提前完成。

#### P0-B.1 每用户每日额度

要求：

- 引入每日额度，而不是只靠短窗口限流。
- 额度对象优先覆盖外部成本最高的能力。

最小实现：

- 新增每日 usage 表或复用轻量事件聚合：
  - `user_id`
  - `date`
  - `practice_generate_count`
  - `scene_generate_count`
  - `tts_generate_count`
  - `explain_count`
  - `reserved_count`
  - `success_count`
  - `failed_count`
- 在高成本接口调用上游前检查并预占 quota。

关键语义：

- quota 应该在调用上游模型/TTS 之前占用，不要等上游成功后再加。
- 否则攻击者可以反复制造上游失败、超时或取消请求，虽然成功次数没增加，但外部成本已经产生。

推荐流程：

1. 检查 today quota。
2. 预占一次 quota。
3. 调用上游模型/TTS。
4. 成功则标记 `success`。
5. 失败则记录 `failed`，默认不退额度。
6. 只有明确没有产生上游成本的失败才退额度。

验收：

- 用户当天超过额度后返回受控错误。
- 额度错误不会触发模型/TTS 调用。
- 上游失败也能留下 usage 记录。
- 管理员可以通过 SQL 或后台看到用户当日用量。

#### P0-B.2 管理员查看今日用量

要求：

- 不一定先做完整运营后台，但至少能看今日成本压力。

最小展示：

- 今日新增用户数
- 今日活跃用户数
- 今日 practice generate 次数
- 今日 scene generate 次数
- 今日 TTS 次数
- 今日 explain 次数
- 今日 429 次数
- 今日 5xx 次数

验收：

- 管理员能判断今天有没有异常峰值。
- 能定位到高用量用户或 IP。

#### P0-B.3 简单封禁 / `generation_limited`

要求：

- 发现异常账号时，至少能限制其高成本能力。
- 不一定第一阶段就禁登录。
- 后台 UI 可以晚点做，但字段和入口检查建议提前做。

最小实现：

- 在 `profiles` 增加 `access_status`，或新增等价用户状态表。
- `access_status` 至少支持：
  - `active`
  - `disabled`
  - `generation_limited`
  - `readonly`
- 接口入口按状态判断：
  - `disabled`：不能进入主应用。
  - `generation_limited`：不能调用 AI / TTS / generate。
  - `readonly`：不能写学习、保存表达、提交 review。
- 当前已经有最小 `/admin/users` 后台页面和受控 server action，可在页面内修改状态；完整用户详情、批量处置和审计日志继续留到 P1。

验收：

- `generation_limited` 用户不能调用高成本接口。
- `disabled` 用户不能进入主应用。
- `readonly` 用户不能写学习、保存表达、提交 review。
- 错误响应受控，不暴露内部原因。
- 管理员能解除限制。

#### P0-B.4 学习时长 delta 上限

要求：

- 不再完全信任任意 `studySecondsDelta`。
- 先做最小上限，不必一步到位重写会话计时。

最小实现：

- 单次 `studySecondsDelta` 最大 60 秒。
- 同一 `user + scene` 最小上报间隔 10-15 秒。
- 对异常大 delta 记录事件，不计入统计。
- Progress 页面继续展示学习时长，但不要基于当前数据做公开榜单、公开等级或奖励。

验收：

- 恶意一次上报 999999 秒不会写入。
- 正常学习每分钟仍能累计。
- 异常上报能在日志或后台看到。
- Progress 页仍能展示个人学习概览。

### P1：开放后第一阶段必须补齐

目标：能看见问题，并能处理问题。

#### P1.1 运营概览后台

建议指标：

- 总用户数
- 今日新增用户数
- 近 7 天活跃用户数
- 今日学习用户数
- 今日学习总分钟数
- 今日 AI 生成次数
- 今日 TTS 次数
- 今日 429 次数
- 今日 5xx 次数

验收：

- 管理员能在 30 秒内判断今天是否异常。
- 能看到是否有生成/TTS 峰值。

#### P1.2 用户详情后台

建议展示：

- 注册时间
- 最近登录或最近活跃
- 最近 7 天学习分钟
- 完成场景数
- 保存表达数
- 今日高成本接口用量
- 最近错误 requestId
- 是否封禁

验收：

- 管理员能定位一个异常账号。
- 管理员能判断该账号是真学习还是刷接口。

#### P1.3 更完整的封禁与降级

封禁类型：

- `disabled`
  - 禁止进入主应用
- `generation_limited`
  - 禁止 AI / TTS / generate
- `readonly`
  - 只允许查看，不允许写入

验收：

- 被封禁用户不能调用对应接口。
- 错误响应受控，不暴露内部原因。
- 管理员能解除封禁。

### P2：规模增长后推进

目标：降低长期运维成本，提升数据可信度。

#### P2.1 服务端学习会话心跳

建议方案：

- 明确 session start、heartbeat、pause、complete。
- 服务端根据 heartbeat 时间差累计学习时长。
- 前端 delta 只作为辅助，不再作为主依据。

验收：

- 关闭页面后不会继续累计时长。
- 后台切回可恢复。
- 弱网重复心跳不会明显重复计时。

#### P2.2 全局风控策略

建议方案：

- IP、账号、邮箱域名、设备指纹组合判断。
- 对临时邮箱、异常注册频率、异常生成频率做风险分。

验收：

- 同 IP 大量注册会被阻断或进入审核。
- 新账号高频生成会被降级。
- 风控命中有后台记录。

#### P2.3 成本与用量报表

建议指标：

- 每日模型调用次数
- 每日 TTS 次数
- 每日 fallback 次数
- 每用户平均成本
- 高成本用户 Top N
- 失败率和 429 率趋势

验收：

- 能判断当前免费额度是否合理。
- 能定位异常成本来源。

#### P2.4 完整安全策略

建议补齐：

- CSP
- 安全报告 endpoint
- 更严格的 cookie / session 配置复核
- Bot / WAF 层策略
- 数据库备份与恢复演练

验收：

- 安全头不破坏现有资源加载。
- 报告机制能发现异常跨源资源或脚本。
- 备份恢复有实际演练记录。

## 6. 推荐实施顺序

### 第一批：可以公开给 10-50 人前

适合目标：邀请 10-50 个真实用户。

任务：

1. `REGISTRATION_MODE`。
2. 邀请码注册。
3. 邮箱验证后才能进入主应用。
4. Upstash Redis 必填状态检查。
5. 高成本接口 user + IP 双维度限流。
6. 真实 HTTP baseline。
7. 紧急关闭注册开关。

完成标准：

- 没有邀请码不能注册。
- 未验证邮箱不能进入主应用。
- 高成本接口不能被单账号或同 IP 快速刷爆。
- 管理员知道当前限流后端是否为 Upstash。
- 出事时能立即切到 `REGISTRATION_MODE=closed`。

### 第二批：公开后立刻补

适合目标：扩大到 100 人左右，或准备发到小范围公开渠道。

任务：

1. 每用户每日 AI / TTS 额度。
2. usage 表。
3. usage 预占/成功/失败记录。
4. `generation_limited` 封禁状态。
5. 简单 admin status：今天生成次数、TTS 次数、429、5xx。
6. 学习时长 delta 上限。

完成标准：

- 单用户无法无限刷 AI / TTS。
- 上游失败也能计入或追踪用量。
- 管理员能看到当天成本压力。
- 发现异常账号可以先禁生成。
- 一眼假的学习时长不会污染统计。

### 第三批：准备更大范围前

适合目标：准备更公开的入口。

任务：

1. 用户详情后台。
2. 异常用户列表。
3. 封禁 / 解除封禁 UI。
4. 成本趋势。
5. 注册 IP 频控。
6. 学习 session heartbeat。

完成标准：

- 出现攻击时能发现。
- 能定位账号。
- 能禁用或降级账号。
- 学习时长开始从前端 delta 过渡到更可信的服务端会话统计。

### 第四批：长期公开运营

适合目标：公开注册和长期增长。

任务：

1. 风控评分。
2. 更完整的成本报表。
3. CSP 与安全报告。
4. 备份恢复演练。

完成标准：

- 学习时长不再容易被刷。
- 成本和异常趋势可持续观察。
- 有基本事故响应能力。

## 7. 任务拆分建议

### Change A：公网注册入口受控

类型：Spec-Driven

原因：

- 改变注册能力和认证入口。
- 涉及用户进入主链路的权限边界。

范围：

- `signup` 页面
- `REGISTRATION_MODE`
- invite code 表
- invite usage attempt
- Supabase Auth 邮箱验证确认
- 未验证邮箱主应用拦截
- auth stable spec
- 登录/注册测试

不收：

- 不做完整运营后台。
- 不做成本额度。

### Change B：高成本接口双维度限流

类型：Spec-Driven

原因：

- 改变接口治理策略。
- 涉及 AI / TTS 成本边界。

范围：

- rate limit helper
- client IP 获取
- 高成本接口接入
- Redis 限流状态暴露
- api-operational-guardrails stable spec
- HTTP baseline

不收：

- 不做注册邀请码。
- 不做每日额度。

### Change C：每日额度与用量预占

类型：Spec-Driven

原因：

- 改变高成本接口成本语义。
- 引入 usage 数据结构和调用前预占。

范围：

- usage 表或聚合表
- quota 检查
- quota 预占
- success / failed 标记
- 管理员今日用量
- 超额度错误

不收：

- 不做复杂风控评分。
- 不做 BI 平台。

### Change D：简单封禁与学习时长 delta 上限

类型：Spec-Driven

原因：

- 改变账号状态边界和学习统计写入规则。

范围：

- `profiles.access_status` 或等价用户状态表
- `active`
- `disabled`
- `generation_limited`
- `readonly`
- 高成本接口入口检查
- 主应用入口检查
- 学习、表达、review 写接口入口检查
- `studySecondsDelta` 单次上限
- 同一 `user + scene` 最小上报间隔
- 异常 delta 事件记录
- learning overview 文档同步

不收：

- 不做完整 heartbeat。
- 不做全局风控。

### Change E：运营观测与长期风控

类型：Spec-Driven

原因：

- 新增后台能力、账号处置视图和长期运营指标。

范围：

- admin observability
- 用户详情
- 异常账号列表
- 成本趋势
- 429 / 5xx 趋势

不收：

- 不做完整 BI 平台。

## 8. 上线前检查清单

### P0-A 检查

- [ ] `REGISTRATION_MODE=invite_only`
- [ ] 无邀请码不能注册
- [ ] 邀请码有 `max_uses`
- [ ] 邀请码有 `used_count`
- [ ] 邀请码使用有 attempt 记录或补偿记录
- [ ] Supabase 邮箱验证策略已确认
- [ ] 未验证邮箱不能进入主应用
- [ ] `UPSTASH_REDIS_REST_URL` 已配置
- [ ] `UPSTASH_REDIS_REST_TOKEN` 已配置
- [ ] 管理员能看到当前限流后端
- [ ] 高成本接口已接入 user + IP 双维度限流
- [ ] 真实 HTTP baseline 已记录
- [ ] `pnpm run load:public-registration-baseline` 的结果已保存到结构化 JSON 或等价证据

### P0-B 检查

- [ ] 高成本接口已接入每日额度
- [ ] quota 在调用上游前预占
- [ ] 上游成功标记 `success`
- [ ] 上游失败标记 `failed`
- [ ] 超每日额度不会调用上游模型/TTS
- [ ] 管理员能查看今日用量
- [ ] 支持 `generation_limited`
- [ ] 支持通过 `/admin/users` 或 SQL 设置 `disabled`
- [ ] 支持通过 `/admin/users` 或 SQL 设置 `readonly`
- [ ] `studySecondsDelta` 有单次上限
- [ ] 同一 `user + scene` 有最小上报间隔
- [ ] 异常 delta 不写入学习统计

### 紧急开关检查

- [ ] 可以一键切到 `REGISTRATION_MODE=closed`
- [ ] 可以一键关闭 `/api/practice/generate`
- [ ] 可以一键关闭 `/api/scenes/generate`
- [ ] 可以一键关闭 `/api/tts/regenerate`
- [ ] 可以临时把每日额度调低
- [ ] 可以临时把 IP 限流调严
- [ ] 可以把所有新用户设为 `generation_limited`
- [ ] 紧急开关生效后有明确用户提示，不暴露内部配置

### 通用环境检查

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 指向生产 Supabase 项目
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 只存在服务端环境
- [ ] `APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` 与生产域名一致
- [ ] 写接口 Origin 校验通过真实域名验证
- [ ] 未登录访问受保护 API 返回 401
- [ ] 非管理员访问 admin 返回受控拒绝
- [ ] 429 响应带 `requestId`
- [ ] 5xx 不暴露上游原始错误
- [ ] 用户态表 RLS 已核对
- [ ] `profiles` 自动创建路径正常
- [ ] `user_daily_learning_stats` 只允许用户访问自己的数据

## 9. 攻击发生时的最小处置流程

1. 看 `/admin/observability` 或日志，确认异常接口、请求量、requestId 和时间窗口。
2. 判断是单账号、同 IP 多账号还是全站流量。
3. 如果是单账号，先在 `/admin/users` 设置 `generation_limited`。
4. 如果是同 IP 多账号，收紧 IP 限流阈值。
5. 如果是全站流量，临时关闭注册或切到 `invite_only`。
6. 如果外部成本快速上升，临时降低每日额度或关闭对应生成入口。
7. 记录事件到 `docs/dev/dev-log.md`，包括时间、影响、处置和后续补救。

## 10. 当前明确不解决的事情

这份文档只是执行计划，不表示当前已经具备这些能力。

当前不直接解决：

- 不引入完整 BI 平台。
- 不引入复杂 Bot 指纹。
- 不重写 Supabase Auth。
- 不重写所有学习统计。
- 不把学习时长变成计费级别数据。
- 不承诺抵御 DDoS；DDoS 需要平台、CDN 或 WAF 层处理。

## 11. 相关文档

- `docs/system-design/learning-overview-mapping.md`
- `docs/domain-rules/auth-api-boundaries.md`
- `docs/dev/backend-release-readiness-checklist.md`
- `docs/dev/server-data-boundary-audit.md`
- `openspec/specs/auth-api-boundaries/spec.md`
- `openspec/specs/api-operational-guardrails/spec.md`
- `openspec/specs/learning-loop-overview/spec.md`

## 12. P0-B 落地状态（2026-05-09）

本轮已把 P0-B 的最小硬防护落到代码侧：

- 高成本接口增加每日 quota 和调用前预占：`practice_generate`、`scene_generate`、`similar_generate`、`expression_map_generate`、`explain_selection`、`tts_generate`、`tts_regenerate`。
- quota 默认值集中在 `src/lib/server/high-cost-usage.ts`，可通过 `DAILY_QUOTA_*` 环境变量覆盖；超额返回受控 429，且不会进入上游模型/TTS。
- `profiles.access_status` 支持 `active`、`disabled`、`generation_limited`、`readonly`；当前可通过 `/admin/users` 或 SQL 调整，完整封禁/解除封禁 UI 留到 P1。
- `/api/admin/status` 增加 `todayHighCostUsage`，可查看今日各 capability 的 `reserved/success/failed/quota`。
- `studySecondsDelta` 增加最小防污染：单次最大 60 秒，同一 `user + scene` 有效上报间隔最小 10 秒，异常写入 `learning_study_time_anomalies`。

仍然不把当前学习时长视为计费、榜单、公开等级或奖励依据。它只适合个人 Progress 展示和轻量运营观察，完整服务端 heartbeat 仍保留在 P2。

P1/P2 剩余风险：

- 还没有完整运营后台、用户详情页、异常用户列表、封禁/解除封禁 UI。
- 还没有邮箱域名策略、设备指纹、WAF/DDoS。
- 还没有长期成本趋势、成本金额估算、Top N 用户视图。
- 还没有服务端学习 session heartbeat。
