## 1. 数据模型与配置

- [x] 1.1 新增每日高成本 usage SQL，按 `user_id + date + capability` 记录 `reserved_count`、`success_count`、`failed_count`、`limit_count` 和 timestamps。
- [x] 1.2 为 `profiles` 增加 `access_status`，支持 `active`、`disabled`、`generation_limited`、`readonly`，默认 `active`。
- [x] 1.3 新增学习时长异常记录 SQL，记录 `user_id`、`scene_id`、`reported_delta`、`reason`、`created_at`。
- [x] 1.4 更新环境示例或配置说明，记录 daily quota 默认值与可覆盖方式。

## 2. Daily Quota 与 Usage 预占

- [x] 2.1 新增 quota/usage service，集中定义 capability、默认额度、预占、成功标记、失败标记和超额错误。
- [x] 2.2 将 practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate 接入调用前预占。
- [x] 2.3 确保参数校验、未登录、邮箱未验证、Origin 拒绝和账号限制不会预占 usage。
- [x] 2.4 为 quota 未超额、超额、预占后成功、预占后失败补测试。

## 3. 账号访问状态

- [x] 3.1 扩展 profile 类型和 auth helper，提供 `assertProfileCanEnterApp`、`assertProfileCanGenerate`、`assertProfileCanWrite`。
- [x] 3.2 `disabled` 用户不能进入主应用；若 middleware 无法读取 profile，必须在页面主入口和受保护 API helper 层覆盖并记录边界。
- [x] 3.3 `generation_limited` 用户不能调用 AI / TTS / generate，且不预占 usage。
- [x] 3.4 `readonly` 用户不能写学习进度、保存表达或提交 review。
- [x] 3.5 为三种限制状态与 `active` 正常路径补测试。

## 4. 学习时长 Delta 防污染

- [x] 4.1 定位 `studySecondsDelta` 写入入口，加入单次最大 60 秒规则。
- [x] 4.2 加入同一 `user + scene` 最小 10 秒接受间隔。
- [x] 4.3 超大 delta 或过频上报不写入学习统计，并记录异常事件。
- [x] 4.4 为正常 delta、超大 delta、过频 delta 补测试。

## 5. Admin 摘要与文档

- [x] 5.1 `/api/admin/status` 增加今日 usage 摘要，包含各 capability 的 `reserved/success/failed/quota`。
- [x] 5.2 同步 `docs/dev/public-registration-readiness-plan.md` 中 P0-B 完成状态和 P1/P2 剩余风险。
- [x] 5.3 同步 `docs/dev/backend-release-readiness-checklist.md`、`docs/domain-rules/auth-api-boundaries.md` 和 `docs/system-design/learning-overview-mapping.md`。
- [x] 5.4 在 `docs/dev/dev-log.md` 记录实现、验证、阻断项和剩余风险。
- [x] 5.5 完成 stable spec 同步、OpenSpec archive 和 `pnpm run maintenance:check`。

## 6. 明确不收项

- [x] 6.1 本轮不实现完整运营后台、用户详情页、异常用户列表或封禁/解除封禁 UI，风险保留在公网开放计划 P1。
- [x] 6.2 本轮不实现复杂风控评分、注册 IP 频控、邮箱域名策略、设备指纹或 WAF/DDoS，风险保留在公网开放计划 P1/P2。
- [x] 6.3 本轮不实现长期成本趋势、成本金额估算、BI 报表或 Top N 用户视图，风险保留在公网开放计划 P1/P2。
- [x] 6.4 本轮不实现完整学习 session heartbeat，只做 delta 上限和间隔，风险保留在公网开放计划 P2。
