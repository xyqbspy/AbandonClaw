## Context

高成本 capability 目前集中定义在 `src/lib/server/high-cost-usage.ts`，所有已治理的高成本入口都会调用 `reserveHighCostUsage()` 完成每日 quota 预占。这个 helper 是最小切入点：只要在预占前检查紧急关闭状态，就能保证关闭后不继续触发上游成本。

项目已经有 `app_runtime_settings` 表用于 admin 注册模式控制，本轮可以复用该表保存高成本关闭列表。

## Goals / Non-Goals

Goals:

- 管理员能看到所有高成本 capability 当前是否启用。
- 管理员能临时关闭或恢复某个 capability。
- 关闭状态在 quota 预占和上游调用前生效。
- 普通用户或非法 capability 不能写入配置。
- 保持现有 quota、user/IP 限流和账号状态语义不变。

Non-Goals:

- 不做完整配置中心。
- 不做审批、定时开关、历史审计列表。
- 不做自动检测异常成本并自动关闭。
- 不做按用户、IP、设备或来源维度的动态规则。

## Decisions

### 1. 复用 `app_runtime_settings`

使用 `key = 'high_cost_disabled_capabilities'` 保存 JSON 字符串数组，例如：

```json
["scene_generate", "tts_regenerate"]
```

原因：

- 与注册模式一样，这是运行时全站配置。
- 关闭列表结构简单，不需要新表和复杂 schema。
- 未部署 setting 时默认所有 capability 启用，保持兼容。

### 2. 在 `reserveHighCostUsage()` 前置检查

`reserveHighCostUsage()` 先读取 disabled list。如果当前 capability 被关闭，抛出受控错误；否则继续现有 daily quota 预占。

原因：

- 这是所有高成本入口的共同预占点。
- 可以保证关闭后不写 quota reserve，也不触发上游成本。

### 3. Admin 入口放在 `/admin/observability` 或 `/admin`

首版优先选择已有 admin 运行状态/概览入口展示开关；如果现有页面结构更适合 `/admin`，也可放在总览页。页面只提供最小列表与启停操作，不做趋势图或历史审计。

### 4. 关闭返回受控 503

关闭不是用户超额，也不是权限问题。使用 `503 SERVICE_UNAVAILABLE` 和明确 code，提示该能力暂时关闭。

原因：

- 不混淆 daily quota 的 `429`。
- 便于前端与 baseline 判断是管理员主动关闭。

## Risks / Trade-offs

- [Risk] 管理员误关能力导致用户不能生成。  
  Mitigation: 页面明确显示关闭状态，操作可立即恢复。

- [Risk] 每次 reserve 读取 runtime setting 增加一次数据库读。  
  Mitigation: 当前小范围公开优先安全和可控；后续可加短 TTL cache。

- [Risk] JSON setting 被手工写坏。  
  Mitigation: 解析失败时保守视为空列表；admin 写入口只允许合法 capability。

## Stability Closure

本轮关闭：

- readiness plan 中“一键关闭高成本入口”只有文档没有代码的问题。
- 某个 capability 出现异常成本时缺少后台处置入口的问题。

明确延后：

- 自动风控、审批、历史审计、定时开关、按人群规则。
- 延后原因是当前目标是小范围公开的最小应急控制。
