## Why

小范围公开前已经有每日 quota、限流和账号降级，但高成本能力的“紧急关闭”仍停留在文档清单里。若模型、TTS 或生成接口出现异常成本，管理员目前不能在后台快速关闭某个 capability，只能改环境变量、改代码或临时封账号。

## What Changes

- 在 admin 后台增加最小高成本紧急控制入口，允许管理员查看并切换每个高成本 capability 是否启用。
- 高成本入口在 quota 预占和上游调用前检查该 capability 是否被紧急关闭。
- 被关闭时返回受控错误，不触发 quota 预占、模型、TTS 或其他上游成本。
- 复用 `app_runtime_settings` 保存关闭列表，避免新增完整配置中心。
- 同步测试、stable spec 和公网开放文档。

本轮明确不收：

- 不做完整风控规则引擎。
- 不做审批流、定时开关、历史回滚列表。
- 不做按用户/IP/设备分组的动态开关。
- 不做自动异常检测或自动关闭。

## Capabilities

### New Capabilities

- `admin-high-cost-emergency-controls`: 管理员通过后台临时关闭或恢复高成本 capability 的最小能力。

### Modified Capabilities

- `api-operational-guardrails`: 高成本接口必须在 quota 预占和上游调用前尊重管理员紧急关闭配置。

## Impact

- 页面：扩展 admin 运行状态或后台入口，展示高成本 capability 开关。
- 服务端：`reserveHighCostUsage()` 增加紧急关闭检查。
- 数据：复用 `app_runtime_settings`，新增 key 保存 disabled capability 列表。
- 测试：覆盖关闭状态下不预占 quota、admin 可切换、非法 capability 被拒绝。
- 文档：同步 readiness plan、release checklist、dev-log 和 stable spec。

## Stability Closure

本请求继续暴露的稳定性缺口：

- readiness plan 要求“一键关闭高成本入口”，但代码侧没有受控后台开关。
- 当前只有限流和 quota，不能应对“某个 capability 需要立即停用”的运营场景。

本轮收口：

- 收口高成本 capability 的后台紧急关闭入口。
- 收口关闭状态在上游成本前生效。
- 收口管理员可见当前关闭列表。

剩余风险与延后原因：

- 自动风控、审批、历史回滚和按人群开关属于 P1/P2 运营能力，本轮不做。
- 剩余风险继续记录在公网开放计划和 dev-log 中。
