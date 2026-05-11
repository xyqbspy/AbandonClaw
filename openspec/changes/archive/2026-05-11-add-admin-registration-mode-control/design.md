## Context

现有注册入口通过 `getRegistrationMode()` 同步读取 `REGISTRATION_MODE`。`/api/auth/signup` 的 GET 返回该模式，注册页据此决定是否展示邀请码输入框；POST 也按该模式决定是否拒绝、校验邀请码或开放注册。

管理员已经可以通过 `/admin/invites` 生成邀请码，但无法在后台切换注册模式，导致邀请注册验证仍需要修改环境变量并重启/重新部署。

## Goals / Non-Goals

Goals:

- 管理员可以在后台查看当前注册模式。
- 管理员可以切换 `closed`、`invite_only`、`open`。
- 注册入口按后台配置实时生效。
- 后台配置缺失、非法或读取失败时仍保守回退到环境变量，再回退 `closed`。
- 保留最小修改人和修改时间，方便排查。

Non-Goals:

- 不做完整 settings 中心。
- 不做配置审批、定时发布、环境分层或历史版本回滚。
- 不自动生成邀请码或联动发码。
- 不改变邀请码校验、IP 频控、邮箱验证和账号状态边界。

## Decisions

### 1. 使用单行 runtime setting 保存注册模式

新增 `app_runtime_settings` 表，使用 `key = 'registration_mode'` 保存当前值：

- `key`
- `value`
- `updated_by`
- `updated_at`

原因：

- 注册模式是运行时全站开关，不能继续只靠部署环境变量。
- 单行 key/value 足以承载当前需求，避免过早建设完整配置系统。
- 后续如确实需要更多全站配置，可复用同一表，但本轮只开放注册模式。

### 2. 读取优先级为 runtime setting -> REGISTRATION_MODE -> closed

新增异步 `getEffectiveRegistrationMode()`：

1. 尝试读取 `app_runtime_settings.registration_mode`。
2. 若存在且合法，返回该值，并标记来源为 `runtime`.
3. 若缺失、非法或读取失败，返回 `REGISTRATION_MODE` 的合法值，并标记来源为 `environment`。
4. 若环境变量也缺失或非法，返回 `closed`，来源为 `default`.

原因：

- admin 后台切换后必须能立即影响 `/signup`。
- 读取失败不能误开放注册。
- 环境变量仍可作为部署级兜底。

### 3. 写操作只走 admin server action

后台 action 必须先 `requireAdmin()`，再调用 service 写入 `app_runtime_settings`。普通用户、未登录用户或非法模式不得写入。

原因：

- 注册模式影响全站准入，权限级别高于普通页面状态。
- 现有 admin 后台已经使用 server action 和 notice/revalidate 模式，复用即可。

### 4. 入口放在 `/admin/invites`

首版把注册模式控制放在邀请码管理页顶部，而不是新建完整 `/admin/settings`。

原因：

- 当前使用场景是“生成邀请码后切到邀请注册”，两者属于同一个注册准入闭环。
- 避免把首版扩展成完整配置后台。

## Risks / Trade-offs

- [Risk] 数据库表未部署时，admin 切换入口不可用。  
  Mitigation: 注册入口读取失败仍回退环境变量；文档和 SQL 明确部署前提。

- [Risk] 管理员误切到 `open`。  
  Mitigation: 页面文案明确 `open` 是公开注册；测试覆盖只允许三种合法值。

- [Risk] runtime setting 与环境变量不一致导致排查困惑。  
  Mitigation: admin 页面显示生效来源；文档明确 runtime 优先。

## Migration Plan

1. 新增 SQL 创建 `app_runtime_settings` 表。
2. 部署后，若未写 runtime setting，现有 `REGISTRATION_MODE` 行为保持不变。
3. 管理员可在 `/admin/invites` 写入注册模式，之后 `/signup` 和 `/api/auth/signup` 即按 runtime setting 生效。
4. 回滚时删除/隐藏 admin action 和页面即可；注册入口会继续按环境变量兜底。

## Stability Closure

本轮关闭：

- admin 发码与注册模式切换分裂的问题。
- `/signup` 邀请码输入框显示原因不可见的问题。
- 注册模式读取优先级不清的问题。

明确延后：

- 完整配置中心、审批、定时发布、历史审计和自动发码联动。
- 延后原因是当前只需要完成小范围邀请注册的管理员闭环。
