## Why

P0-B 已经把 `profiles.access_status`、daily quota 和高成本入口护栏落到代码里，但异常账号处置仍主要依赖手工 SQL。对小范围公网开放来说，这会把“发现异常账号”到“真正止血”之间的操作延迟留得过长，也会让 admin/status 与 readiness checklist 里的“可快速降级账号”继续停留在半完成状态。

从产品北极星看，这项工作不是新增学习能力，而是保证真实学习用户不会因为个别异常账号而被迫全站降级或直接关闭入口。现在补最小 admin-only 处置入口，能在不扩成完整运营后台的前提下，把这段关键运维链路收住。

## What Changes

- 新增最小 admin-only 用户处置入口，支持查看用户基础信息并修改 `profiles.access_status`。
- 新增最小 admin 用户列表/筛选能力，优先覆盖“按 email / userId / access_status 查找并处置”。
- 新增 admin 服务端更新逻辑与受控 route/server action，保证只有管理员可以修改账号状态。
- 在 admin 页面补充与 `generation_limited`、`readonly`、`disabled` 对应的受控操作反馈，避免只能依赖 SQL。
- 同步公网开放计划、发布清单、dev-log 和相关 stable spec，明确本轮收口项与不收项。

## Capabilities

### New Capabilities
- `admin-user-access-controls`: 管理员最小查看与调整用户访问状态的后台能力。

### Modified Capabilities
- `auth-api-boundaries`: 账号访问状态除了在入口被消费，还需要有明确的 admin-only 修改入口与权限边界。

## Stability Closure

### In This Round
- 收口“`access_status` 已存在但只能通过 SQL 改”的处置缺口。
- 收口 readiness checklist 与实际 admin 处置能力之间的语义漂移。
- 收口最小管理员操作反馈，避免改动成功与否只能依赖数据库侧人工确认。

### Not In This Round
- 不做完整运营概览后台、成本趋势、异常用户排行榜或 BI 视图：这会把本轮从处置入口膨胀成运营平台。
- 不做完整用户详情页、学习画像或 requestId 历史聚合：这些属于 P1 用户详情后台。
- 不做注册 IP 频控、邮箱域名策略、设备指纹或全局风控评分：这些属于后续 P1/P2 风控能力。
- 不做封禁/解除封禁的批量 UI、审计日志或自动化策略：本轮只处理单账号最小处置闭环。

### Risk Tracking
- 延后项继续记录在 `docs/dev/public-registration-readiness-plan.md` 的 P1/P2 章节。
- 发布前执行口径继续以 `docs/dev/backend-release-readiness-checklist.md` 为准。

## Impact

- 受影响代码：
  - `src/app/(app)/admin/*`
  - `src/app/api/admin/*`
  - `src/lib/server/admin/service.ts`
  - `src/lib/server/auth.ts`
- 受影响文档：
  - `docs/dev/public-registration-readiness-plan.md`
  - `docs/dev/backend-release-readiness-checklist.md`
  - `docs/dev/dev-log.md`
- 受影响规范：
  - `openspec/specs/auth-api-boundaries/spec.md`
  - 新增 `openspec/specs/admin-user-access-controls/spec.md`
- API / 行为影响：
  - 新增 admin-only 用户状态更新入口
  - 不改变普通用户学习主链路协议
- 风险点：
  - 若权限边界处理不严，可能把账号处置能力暴露给非管理员
  - 若 UI 范围失控，可能把本轮拉成完整运营后台
