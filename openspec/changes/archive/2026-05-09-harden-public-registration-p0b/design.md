## Context

P0-A 已经完成注册入口受控、邮箱验证拦截和高成本接口 user + IP 短窗口限流。但短窗口限流只能限制瞬时频率，不能限制一天内累计外部成本；同时，异常账号目前没有最小降级字段，只能靠人工改代码或临时关入口。学习时长仍来自前端 `studySecondsDelta`，服务端只做非负整数归一化，容易污染 Progress 展示数据。

本轮目标是把公网小范围开放从“只能挡住明显刷接口”推进到“能控每日成本、能立刻限制异常账号、能阻止一眼假的学习时长”。设计必须保持轻量，不把第一版变成完整运营后台。

## Goals / Non-Goals

**Goals:**

- 高成本接口具备每日 quota，且在调用上游前预占。
- usage 记录能区分 `reserved`、`success`、`failed`。
- 管理员能通过现有 `admin/status` 看到今日用量摘要。
- 用户状态具备最小降级能力：`active`、`disabled`、`generation_limited`、`readonly`。
- 学习时长写入具备单次 delta 上限和最小上报间隔，异常上报可追踪。

**Non-Goals:**

- 不做完整后台 UI、用户详情、异常用户列表或封禁按钮。
- 不做注册 IP 频控、设备指纹、邮箱域名风控或 WAF/DDoS。
- 不做长期成本趋势、成本金额估算或 BI 报表。
- 不做服务端 session heartbeat；当前仍保留前端 delta 作为个人进度展示来源。

## Decisions

### 1. 使用每日 usage 表，而不是只扩展短窗口限流

新增 `user_daily_usage_limits` 或等价表，按 `user_id + date + capability` 记录：

- `reserved_count`
- `success_count`
- `failed_count`
- `limit_count`
- `last_reserved_at`
- `created_at`
- `updated_at`

`capability` 使用稳定枚举字符串，例如：

- `practice_generate`
- `scene_generate`
- `similar_generate`
- `expression_map_generate`
- `explain_selection`
- `tts_generate`
- `tts_regenerate`

原因：

- 短窗口限流保护瞬时压力，daily quota 保护日成本。
- 分 capability 记录，后续可以单独调低 TTS 或 scene generate。
- `limit_count` 落库，避免环境变量漂移后无法解释当天统计。

替代方案：

- 只做 Redis 计数。放弃：重启/迁移/排障时缺少可审计记录，不利于 admin status。
- 只记录成功次数。放弃：攻击者可制造失败/超时但仍产生成本。

### 2. quota 必须在上游调用前预占

高成本接口流程：

1. 通过邮箱验证和账号状态检查。
2. 执行 user + IP 短窗口限流。
3. 检查每日 quota。
4. 预占一次 usage。
5. 调用模型或 TTS。
6. 成功标记 `success`。
7. 失败标记 `failed`，默认不退额度。

如果在进入上游前就失败，例如参数校验失败、Origin 拒绝、未登录、未验证邮箱、账号被限制，则不预占 usage。

原因：

- 成本风险发生在“请求进入上游”之后，不应等成功后才计数。
- 上游超时、取消或异常也可能已经消耗成本。

### 3. quota 默认值用服务端配置集中定义

第一版不做后台可配置额度。服务端集中定义默认 daily limit，例如：

- `practice_generate`: 20
- `scene_generate`: 8
- `similar_generate`: 20
- `expression_map_generate`: 20
- `explain_selection`: 30
- `tts_generate`: 80
- `tts_regenerate`: 12

允许通过环境变量覆盖单项额度，但缺失时使用保守默认值。实际阈值可以在实现时结合已有测试成本微调，但必须记录在 service 常量与文档中。

### 4. 账号状态放在 `profiles.access_status`

在 `profiles` 上新增：

- `access_status text not null default 'active'`

允许值：

- `active`
- `disabled`
- `generation_limited`
- `readonly`

服务端 helper 提供：

- `assertProfileCanEnterApp(profile)`
- `assertProfileCanGenerate(profile)`
- `assertProfileCanWrite(profile)`

拦截位置：

- `disabled`：middleware / `requireCurrentProfile` 之后进入主应用前阻止。
- `generation_limited`：高成本接口进入 quota 前阻止。
- `readonly`：学习写入、保存表达、提交 review 前阻止。

本轮如果 middleware 难以直接读取 profile，可先在服务端 API helper 覆盖关键入口，并在页面主入口服务端加载时阻止 `disabled`。文档必须记录剩余覆盖边界。

### 5. 学习时长只做最小防污染

服务端在处理 `studySecondsDelta` 时：

- 单次 delta 最大 60 秒。
- 同一 `user + scene` 距离上次接受写入小于 10 秒时，不计入学习秒数。
- 异常 delta 写入轻量事件表或现有日志表，至少记录 `user_id`、`scene_id`、`reported_delta`、`reason`、`created_at`。

原因：

- 这能挡住一眼假的 999999 秒。
- 不改变现有 Progress 产品含义。
- 不提前建设完整 heartbeat。

## Risks / Trade-offs

- [额度过紧误伤真实用户] → 默认值保持宽松，文档提醒小范围公开前用真实用户 baseline 调整。
- [预占后失败不退额度可能让真实用户少一次机会] → P0-B 优先保护成本；仅对明确未进入上游的失败不预占。
- [账号状态覆盖不完整] → 先覆盖主应用入口、高成本入口和关键写入口；未覆盖点记录在 tasks 与 dev-log。
- [学习时长最小间隔可能漏计正常快速上报] → 仅按 `user + scene` 控制 10 秒，正常每分钟累计仍可写入。
- [admin status 不是完整后台] → 本轮只做今日用量摘要，完整运营视图留到 P1。

## Migration Plan

1. 新增 SQL：usage 表、`profiles.access_status`、学习时长异常记录。
2. 新增 quota service，并接入高成本接口。
3. 新增账号状态 helper，并接入主应用/生成/写入口。
4. 修改学习写入逻辑，加入 delta 上限和间隔。
5. 扩展 admin status 今日摘要。
6. 补测试和文档。

回滚策略：

- quota 接口异常时可临时把 daily limit 调大，但不移除预占逻辑。
- 账号误封可通过 SQL 将 `profiles.access_status` 改回 `active`。
- 学习时长 delta 防护误伤时可先调宽间隔或上限，但不得重新接受无限 delta。

## Open Questions

- 第一版 daily limit 的具体数值需要结合真实模型/TTS成本再微调，本轮先保守定义并文档记录。
- `readonly` 入口覆盖范围较广，实现时应优先覆盖学习写入、phrases save、review submit，低风险读接口不阻止。

## Stability Closure

### 本轮收口

- daily quota 与调用前预占收口成本保护。
- `profiles.access_status` 收口最小封禁/降级能力。
- 学习 delta 上限与间隔收口数据污染。
- `admin/status` 收口最小运营可见性。

### 明确不收

- 完整后台 UI、用户列表、趋势报表、复杂风控、heartbeat、DDoS/WAF。

### 风险去向

- P1/P2 项继续留在 `docs/dev/public-registration-readiness-plan.md`，并在 dev-log 记录本轮未覆盖边界。
