## 1. 数据与服务边界
- [x] 1.1 新增最小 SQL，创建 `app_runtime_settings` 或等价运行时配置表，用于保存 `registration_mode`、修改人和修改时间。
- [x] 1.2 新增注册模式解析 helper，统一校验 `closed`、`invite_only`、`open`。
- [x] 1.3 新增异步有效注册模式读取：runtime setting 优先，环境变量次之，最终兜底 `closed`。
- [x] 1.4 新增 admin-only 注册模式更新 service，拒绝非法模式。

## 2. 注册链路接入
- [x] 2.1 更新 `/api/auth/signup` GET，返回有效注册模式和来源。
- [x] 2.2 更新 `/api/auth/signup` POST / 注册服务，按有效注册模式执行 closed、invite_only、open 语义。
- [x] 2.3 确认注册页按有效模式显示邀请码输入框，不改变用户侧请求字段。

## 3. Admin 入口
- [x] 3.1 在 `/admin/invites` 增加注册模式控制面板，显示当前模式、来源、最近修改人和修改时间。
- [x] 3.2 增加切换 `closed`、`invite_only`、`open` 的受控表单。
- [x] 3.3 确认非管理员调用写操作会被拒绝。

## 4. 测试
- [x] 4.1 增加注册模式 service 测试：runtime 优先、环境变量兜底、非法值回退 `closed`。
- [x] 4.2 增加 admin action 测试：管理员可更新，非管理员拒绝，非法模式受控失败。
- [x] 4.3 增加页面或组件测试，覆盖注册模式控制面板的核心文案。
- [x] 4.4 补跑注册 route 测试，确认 `invite_only` 与 `closed` 语义不漂移。

## 5. 文档与收尾
- [x] 5.1 同步 `docs/domain-rules/auth-api-boundaries.md` 的注册模式来源规则。
- [x] 5.2 同步公网注册验证指南或 runbook，说明推荐从 admin 后台切换注册模式。
- [x] 5.3 更新 `docs/dev/dev-log.md`，记录实现范围、验证命令和剩余不收项。
- [x] 5.4 对照 proposal / design / spec delta 做实现 Review。
- [x] 5.5 运行最小相关测试、`pnpm exec openspec validate add-admin-registration-mode-control --strict --no-interactive` 和必要维护检查。

## 6. 明确不收项
- [x] 6.1 不做完整站点配置中心。
- [x] 6.2 不做审批流、定时切换或历史回滚列表。
- [x] 6.3 不做自动发码、邮件/短信发送或邀请批次联动。
- [x] 6.4 不改变 `closed` 的保守默认语义。
