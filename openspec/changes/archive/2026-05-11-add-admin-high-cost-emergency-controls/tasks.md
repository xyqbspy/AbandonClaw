## 1. 服务与配置边界
- [x] 1.1 复用 `app_runtime_settings` 保存 disabled high-cost capability 列表。
- [x] 1.2 增加合法 capability 解析和 disabled list 读写 helper。
- [x] 1.3 在 `reserveHighCostUsage()` 的 quota 预占前检查 capability 是否被关闭。
- [x] 1.4 增加受控错误，关闭时不触发 quota 预占或上游调用。

## 2. Admin 入口
- [x] 2.1 在 admin 后台增加高成本紧急控制面板，展示所有 capability 启停状态。
- [x] 2.2 增加关闭/恢复单个 capability 的 server action。
- [x] 2.3 确认非管理员调用写操作会被拒绝，非法 capability 不写入配置。

## 3. 测试
- [x] 3.1 增加 high-cost helper 测试：未关闭时继续预占，关闭时受控拒绝且不调用 rpc。
- [x] 3.2 增加 admin action/service 测试：管理员可关闭/恢复，非法 capability 受控失败。
- [x] 3.3 增加页面测试，覆盖紧急控制面板核心文案与状态。
- [x] 3.4 补跑关键高成本 route 测试，确认关闭错误能被现有错误收敛处理。

## 4. 文档与收尾
- [x] 4.1 同步 `docs/dev/public-registration-readiness-plan.md` 的紧急开关状态。
- [x] 4.2 同步 `docs/dev/backend-release-readiness-checklist.md` 和 runbook。
- [x] 4.3 更新 `docs/dev/dev-log.md`，记录实现范围、验证命令和不收项。
- [x] 4.4 同步 stable spec 并完成 OpenSpec archive。
- [x] 4.5 运行最小相关测试、OpenSpec 校验和 `pnpm run maintenance:check`。

## 5. 明确不收项
- [x] 5.1 不做完整配置中心。
- [x] 5.2 不做审批流、定时开关或历史回滚列表。
- [x] 5.3 不做自动异常检测或自动关闭。
- [x] 5.4 不做按用户/IP/设备/来源维度的动态规则。
