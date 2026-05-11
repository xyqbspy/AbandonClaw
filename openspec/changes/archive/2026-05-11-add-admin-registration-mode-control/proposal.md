## Why

当前注册模式只能通过 `REGISTRATION_MODE` 环境变量切换。管理员虽然已经可以在后台生成邀请码，但无法在同一后台把注册入口切到 `invite_only`，导致“发码”和“开放邀请注册”仍然分裂在后台操作与部署配置之间。

## What Changes

- 在 admin 后台新增最小注册模式控制入口，允许管理员查看并切换 `closed`、`invite_only`、`open`。
- 注册入口读取注册模式时优先使用 admin 后台持久化配置；缺失、非法或读取失败时仍保守回退到 `REGISTRATION_MODE`，最终兜底 `closed`。
- 后台页面显示当前生效模式、配置来源、最近修改人和修改时间。
- 所有写操作必须 admin-only，并限制只能写入允许的注册模式。
- 同步测试与文档，明确 admin 可以切换注册模式，但这不是完整站点配置后台。

本轮明确不收：

- 不做完整站点 settings 中心。
- 不做多环境配置发布流、审批流、定时切换或回滚历史列表。
- 不做邮件/短信通知、邀请码批次发放联动。
- 不改变 `closed` 的保守默认语义。

## Capabilities

### New Capabilities

- `admin-registration-mode-control`: 管理员通过后台查看和切换注册模式的最小能力。

### Modified Capabilities

- `auth-api-boundaries`: 注册入口的模式来源从单一环境变量扩展为“admin 持久化配置优先，环境变量和 `closed` 保守兜底”。
- `admin-user-access-controls`: admin 后台的注册准入管理从邀请码发放扩展到最小注册模式控制。

## Impact

- 页面：扩展 `/admin/invites` 或相邻 admin 注册准入区域，展示注册模式控制。
- 服务端：新增读取/更新注册模式配置的 admin service/action；注册 API 改为异步读取有效模式。
- 数据库：新增最小 runtime settings SQL，用于保存注册模式、修改人和修改时间。
- 测试：覆盖模式读取优先级、非法值兜底、管理员可切换、非管理员拒绝、注册页按 admin 配置展示邀请码框。
- 文档：同步公网注册验证指南、runbook、auth 边界文档和 dev-log。

## Stability Closure

本请求暴露的不稳定点：

- 邀请码发放已经收口到 admin 后台，但注册模式仍只能靠环境变量切换，管理员操作闭环不完整。
- 注册入口“当前模式从哪里来”缺少可视化来源，排查 `/signup` 为什么没有邀请码框时成本较高。

本轮收口：

- 收口 admin 后台切换 `closed / invite_only / open` 的最小入口。
- 收口注册模式来源优先级：后台配置优先，环境变量兜底，最终 `closed`。
- 收口页面可见性：管理员能看到当前生效模式、来源和最近修改信息。

剩余风险与延后原因：

- 完整配置中心、审批流、定时切换和历史审计属于更大的运营后台，本轮不做。
- 剩余风险继续记录在公网开放计划、验证指南和 dev-log 中。
