## Why

当前公网开放注册已具备邀请码校验、防刷和留痕能力，但邀请码只能通过手工 SQL 写入 hash，管理员日常测试、批量发放和停用都太重。下一步需要把“发码”从数据库运维动作收口到 admin-only 后台入口，让小范围 `invite_only` 测试可以顺畅执行，同时继续保持不落库明文邀请码。

## What Changes

- 在现有 `/admin` 后台内新增最小邀请码管理入口。
- 管理员可以手动输入明文邀请码创建单个邀请码，或自动生成一批随机邀请码。
- 系统只持久化邀请码 hash、`max_uses`、`expires_at`、`is_active` 和使用计数；明文只在创建成功响应/页面中展示一次。
- 管理员可以查看邀请码列表的最小状态信息：创建时间、过期时间、启停状态、最大次数、已用次数。
- 管理员可以查看邀请码使用明细：注册邮箱、attempt 状态、注册账号 ID、使用时间和失败原因。
- 管理员可以查看已使用邀请码关联账号的最小活动摘要，用于判断账号是否完成邮箱验证、是否有学习或高成本使用痕迹。
- 管理员可以停用邀请码，必要时调整 `max_uses` 或 `expires_at`。
- 注册页继续沿用现有邀请码输入框；用户填入管理员发放的明文邀请码即可在 `invite_only` 模式注册。
- 补充测试、发布检查和操作文档，避免再要求维护者直接写 SQL 才能完成普通测试注册。

本轮明确不收：

- 不做公开自助申请邀请码。
- 不做邮件/短信自动发送邀请码。
- 不做复杂批次、渠道、归因、recipient 字段或营销活动管理。
- 不做完整邀请码审计后台或用户画像；现有 `registration_invite_attempts`、`profiles` 和轻量活动聚合作为最小追踪来源。
- 不改变 `REGISTRATION_MODE=closed` 的保守默认语义。

## Capabilities

### New Capabilities

- `admin-invite-code-management`: 管理员通过后台生成、查看、停用和调整注册邀请码的最小能力。

### Modified Capabilities

- `auth-api-boundaries`: 明确 `invite_only` 注册的邀请码可以由 admin-only 后台生成，但注册入口仍只接受明文输入并按 hash 匹配。
- `admin-user-access-controls`: 后台能力边界从最小用户状态处置扩展到最小注册邀请码管理，仍必须限制为 admin-only。

## Impact

- 页面：新增或扩展 `/admin` 下的邀请码管理页面/入口。
- 服务端：新增 admin-only server action 或 route，用于生成 hash、批量创建、停用和更新邀请码元数据。
- 数据库：优先复用 `registration_invite_codes` 与 `registration_invite_attempts`，不新增明文邀请码字段。
- 注册链路：沿用现有 `/api/auth/signup` 与注册页邀请码输入，不改变用户注册请求格式。
- 测试：覆盖邀请码生成 hash、不落库明文、批量生成、停用、使用明细、活动摘要、非管理员拒绝和注册成功路径。
- 文档：同步 `public-registration-feature-verification-guide.md`、baseline/runbook 或 readiness checklist 中的邀请码发放口径。

## Stability Closure

本请求暴露的稳定性缺口：

- 邀请码发放仍停留在 SQL 运维层，和“管理员可操作的公开前验证流程”不一致。
- 文档已经补了 SQL 手册，但这只是临时运维方案，不适合持续测试和小范围发放。
- 现有 admin 后台已有用户状态处置能力，但注册准入处置仍缺少同等受控入口。

本轮收口：

- 收口管理员生成/停用邀请码的最小后台入口。
- 收口明文邀请码只展示一次、数据库只存 hash 的安全边界。
- 收口测试注册所需的最小操作路径，减少手工 SQL 依赖。
- 收口邀请码被谁使用和使用后是否有最小活动的后台可见性。

剩余风险与延后原因：

- 邀请码 recipient、批次渠道、邮件发送和归因属于运营系统能力，本轮不做，避免把最小 admin 工具膨胀成完整增长后台。
- 更强的注册风控如验证码、邮箱域名策略、设备指纹、WAF 仍按公网开放计划后续推进。
- 剩余风险继续记录在 `docs/dev/public-registration-readiness-plan.md` 和 `docs/dev/public-registration-feature-verification-guide.md`。
