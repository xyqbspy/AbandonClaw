## Why

P0-A 已经把注册入口和高成本接口从“裸露到公网”收回到受控状态，但如果要从熟人小范围扩到公开小渠道，仍缺少每日成本上限、调用前预占、最小封禁能力和学习时长污染防护。现在继续做 P0-B，是为了让项目能从“可邀请少量熟人”推进到“可小范围公开投放，但仍可止血”。

## What Changes

- 新增高成本接口每日 usage / quota 能力，覆盖 practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate。
- 高成本接口在调用上游模型或 TTS 前预占 quota，成功标记 `success`，失败标记 `failed`，默认不退额度。
- 新增最小账号访问状态，支持 `active`、`disabled`、`generation_limited`、`readonly`。
- `generation_limited` 用户不能调用 AI / TTS / generate；`disabled` 用户不能进入主应用；`readonly` 用户不能写学习、保存表达或提交 review。
- `admin/status` 增加今日 usage 摘要，先满足“能看今天是否异常”，不做完整后台。
- 学习时长写入补最小防刷：单次 `studySecondsDelta` 最大 60 秒，同一 `user + scene` 最小上报间隔 10 秒，异常 delta 记录事件且不计入统计。
- 同步公网开放计划、上线检查清单、stable spec 和 dev-log。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `api-operational-guardrails`: 高成本接口从短窗口限流升级为短窗口限流 + 每日 quota + 调用前预占。
- `auth-api-boundaries`: 增加账号访问状态对主应用、生成入口和写入口的约束。
- `learning-loop-overview`: 学习时长 delta 不再完全信任前端上报，新增单次上限和最小间隔。
- `project-maintenance`: 公网开放 P0-B 完成态必须记录 usage/quota、封禁状态和学习时长防刷的验证与剩余风险。

## Impact

- 数据库：
  - 新增每日高成本 usage 表或等价结构。
  - `profiles` 增加 `access_status` 或新增等价用户状态表。
  - 新增学习时长异常事件或轻量记录结构。
- 服务端：
  - `src/lib/server/auth.ts`
  - `src/lib/server/rate-limit.ts` 或新增 quota service
  - `src/lib/server/learning/service.ts`
  - 高成本 API routes
  - `src/lib/server/admin/service.ts` / `/api/admin/status`
- 文档：
  - `docs/dev/public-registration-readiness-plan.md`
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/domain-rules/auth-api-boundaries.md`
  - `docs/system-design/learning-overview-mapping.md`
  - `docs/dev/dev-log.md`
  - stable specs
- 测试：
  - quota 预占/成功/失败/超额
  - 账号状态拦截
  - 学习时长 delta 上限和间隔
  - admin 今日 usage 摘要

## Stability Closure

### 本轮收口

- 把“短窗口限流不足以控制日成本”的缺口收口到每日 quota 与调用前预占。
- 把“发现异常账号但不能立即止血”的缺口收口到 `access_status`。
- 把“学习时长完全依赖前端 delta”的缺口收口到最小上限、最小间隔和异常记录。
- 把“只能靠 SQL 看今日成本压力”的缺口收口到 `admin/status` 摘要。

### 明确不收

- 不做完整运营后台、用户详情页、异常用户列表或封禁/解除封禁 UI。
- 不做复杂风控评分、注册 IP 频控、邮箱域名策略、设备指纹或 WAF/DDoS。
- 不做长期成本趋势、BI 报表或 Top N 用户视图。
- 不做完整学习 session heartbeat；本轮只做 delta 上限和间隔。

### 延后原因与风险去向

这些延后项属于 P1/P2。如果混入本轮，会把可小范围公开前的硬防护膨胀成完整运营平台。剩余风险继续记录在 `docs/dev/public-registration-readiness-plan.md`，后续按独立 change 推进。
