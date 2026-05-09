## 1. Baseline 脚本与样例

- [x] 1.1 设计并实现公网开放真实 HTTP baseline runner，支持按场景执行注册模式、邮箱验证、Origin、限流、daily quota、账号状态和后台状态验证。
- [x] 1.2 复用或抽取现有 `load-api-baseline` 请求能力，避免新的 runner 重新实现一套重复的 HTTP 调用与结果统计逻辑。
- [x] 1.3 补充 baseline 所需的样例 payload、参数说明和最小 dry-run 验证方式。

## 2. 结果记录与阻塞表达

- [x] 2.1 为 baseline runner 增加结构化结果输出，至少包含场景名、请求目标、状态码/状态分布、异常摘要和关键运行状态。
- [x] 2.2 支持在缺少 cookie、邀请码、Origin 或测试账号等前提时把场景标记为 blocked/skipped，并输出明确原因。
- [x] 2.3 为 runner 或相关 helper 补最小测试，覆盖场景配置、blocked 结果和输出结构。

## 3. 文档与维护收尾

- [x] 3.1 同步 `docs/dev/backend-release-readiness-checklist.md`、`docs/dev/public-registration-readiness-plan.md`，让清单、计划和脚本覆盖范围一致。
- [x] 3.2 同步 `docs/dev/dev-log.md`，记录新的 baseline 执行入口、证据保存方式和真实环境仍需补跑的边界。
- [x] 3.3 实现完成后运行最小相关测试、`pnpm exec openspec validate record-public-registration-http-baseline --strict --no-interactive`、`pnpm run maintenance:check` 与必要的脚本 dry-run。

## 4. 明确不收项

- [x] 4.1 本轮不实现自动登录、自动造测试账号、自动生成邀请码或自动清理环境数据；相关前提继续由环境外部提供。
- [x] 4.2 本轮不实现 CI 压测、长期性能报表、生产容量基线或 P1 运营后台能力；剩余风险继续记录在公网开放计划与 dev-log。
