## 1. 注册入口频控

- [x] 1.1 在注册入口接入同一 IP 频控，并确保执行位置早于邀请码校验与 Auth 注册。
- [x] 1.2 为注册频控补独立 scope、默认阈值和环境变量覆盖口径。
- [x] 1.3 确认命中频控时返回受控 429，且不继续写邀请码 attempt、消耗邀请码或触发 Auth 注册。

## 2. 测试与验证

- [x] 2.1 补注册 route / service 的注册 IP 频控测试，覆盖阈值内通过、超限 429 和执行顺序。
- [x] 2.2 扩展公网 baseline 脚本或 sample，补“同一 IP 注册命中 429”场景。
- [x] 2.3 运行最小相关验证，并记录未覆盖风险：相关单测、`pnpm exec openspec validate add-registration-ip-rate-limit --strict --no-interactive`、`pnpm run maintenance:check`。

## 3. 文档同步

- [x] 3.1 更新 `docs/dev/public-registration-readiness-plan.md`，把注册 IP 频控从待办同步为本轮真实目标。
- [x] 3.2 更新 `docs/dev/backend-release-readiness-checklist.md` 与必要 runbook，补注册频控检查项和 baseline 说明。
- [x] 3.3 在 `docs/dev/dev-log.md` 记录本轮实现、验证结果、未覆盖风险和明确不收项。

## 4. 本轮不收项

- [x] 4.1 明确不扩展到验证码、设备指纹、邮箱域名策略、IP 信誉库或全局风控评分。
- [x] 4.2 明确不扩展到注册来源分析后台、异常 IP 看板或长期趋势报表。
