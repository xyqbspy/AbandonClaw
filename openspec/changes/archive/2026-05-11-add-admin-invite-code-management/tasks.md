## 1. 服务与数据边界

- [x] 1.1 梳理现有 `registration_invite_codes` / `registration_invite_attempts` 使用点，确认无需新增必需 SQL。
- [x] 1.2 新增邀请码管理服务，封装随机生成、normalize/hash、列表查询、使用明细、活动摘要、批量创建、停用和元数据更新。
- [x] 1.3 为服务端输入加上保守限制：批量数量、`max_uses`、过期天数和非法状态值。
- [x] 1.4 确认所有写操作只保存 hash，不持久化明文邀请码。

## 2. Admin 入口

- [x] 2.1 在现有 admin 后台新增 `/admin/invites` 或等价入口，并复用现有 admin 鉴权。
- [x] 2.2 增加邀请码列表，展示创建时间、过期时间、启停状态、最大使用次数和已用次数。
- [x] 2.3 增加邀请码使用明细，展示注册 email、attempt 状态、失败原因、auth user id 和使用时间。
- [x] 2.4 增加已使用账号的最小活动摘要，展示 username、access_status、邮箱验证状态、学习/高成本用量摘要。
- [x] 2.5 增加手动创建单个邀请码表单。
- [x] 2.6 增加自动批量生成邀请码表单，并在创建成功后展示本次明文列表。
- [x] 2.7 增加停用邀请码、调整 `max_uses` 和 `expires_at` 的受控操作。
- [x] 2.8 确认非管理员手输页面或调用写操作会被拒绝。

## 3. 注册链路确认

- [x] 3.1 确认注册页继续沿用现有邀请码输入框，不新增用户侧注册字段。
- [x] 3.2 确认管理员生成的邀请码可以在 `invite_only` 模式下完成注册。
- [x] 3.3 确认停用、过期或超过次数的邀请码不能注册。

## 4. 测试

- [x] 4.1 增加邀请码管理服务测试：hash 稳定、明文不落库、批量数量限制、重复码受控失败、使用明细和活动摘要映射。
- [x] 4.2 增加 admin action/route 测试：管理员可创建/停用/更新，非管理员被拒绝。
- [x] 4.3 增加页面或组件级测试，覆盖生成结果只展示本次明文列表、列表不展示历史明文、使用账号与活动摘要可见。
- [x] 4.4 补跑现有注册测试，确认 `/api/auth/signup` 语义不变。

## 5. 文档与收尾

- [x] 5.1 更新 `docs/dev/public-registration-feature-verification-guide.md`，把推荐发码方式从 SQL 运维改为 admin 后台，SQL 作为备用。
- [x] 5.2 更新 `docs/dev/backend-release-readiness-checklist.md` 或 runbook 中的发码/验证入口。
- [x] 5.3 更新 `docs/dev/dev-log.md`，记录实现范围、验证命令和剩余不收项。
- [x] 5.4 对照 proposal / design / spec delta 做实现 Review，确认未扩成完整运营后台。
- [x] 5.5 运行最小相关测试、`pnpm exec openspec validate add-admin-invite-code-management --strict --no-interactive` 和 `pnpm run maintenance:check`。
- [x] 5.6 完成 OpenSpec archive；若作为完成态进入 main 且用户可感知，更新 `CHANGELOG.md`。

## 6. 明确不收项

- [x] 6.1 不做公开申请邀请码。
- [x] 6.2 不做邮件、短信或站内信自动发送。
- [x] 6.3 不做 recipient、渠道、批次、活动归因。
- [x] 6.4 不做完整邀请码审计后台、异常排行或用户画像。
- [x] 6.5 不改变 `REGISTRATION_MODE=closed` 的保守默认语义。
