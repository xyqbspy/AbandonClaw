## 1. Admin 用户处置入口

- [x] 1.1 在 `src/lib/server/admin/service.ts` 增加最小用户查询能力，支持按 `q` 与 `access_status` 筛选，并返回处置所需最小字段。
- [x] 1.2 在 `src/lib/server/admin/service.ts` 增加 `profiles.access_status` 更新能力，限制可写值为 `active`、`disabled`、`generation_limited`、`readonly`。
- [x] 1.3 在 `src/app/(app)/admin/actions.ts` 增加 admin-only 状态修改 action，并接入成功/失败 notice 与页面 revalidate。
- [x] 1.4 在 `/admin` 下新增最小用户管理页面，支持列表、筛选和单账号状态切换。

## 2. 权限与边界收口

- [x] 2.1 确保所有用户查询与状态修改入口都先经过 `requireAdmin()`，并对非法状态值返回受控失败。
- [x] 2.2 评估是否需要补 admin-only HTTP route；若需要则新增最小 route，否则在文档中明确本轮以 server action 作为受控入口。
- [x] 2.3 完成“本轮不收项”记录，明确不扩展到完整运营后台、用户详情页、批量处置、审计日志或长期风控。

## 3. 测试与验证

- [x] 3.1 补 admin service 的用户查询与状态更新测试。
- [x] 3.2 补 admin action 或 route 的非管理员拒绝、非法状态值拒绝与成功更新测试。
- [x] 3.3 补 `/admin/users` 页面最小渲染与交互测试。
- [x] 3.4 运行最小相关验证，并记录未覆盖风险：相关单测、`pnpm exec openspec validate add-admin-access-status-controls --strict --no-interactive`、`pnpm run maintenance:check`。

## 4. 文档同步

- [x] 4.1 更新 `docs/dev/public-registration-readiness-plan.md`，把“SQL 或 admin-only route”同步为当前真实实现口径。
- [x] 4.2 更新 `docs/dev/backend-release-readiness-checklist.md`，补充后台处置入口的检查项或执行说明。
- [x] 4.3 在 `docs/dev/dev-log.md` 记录本轮实现、验证结果、剩余风险与明确不收项。
