# 公网开放前功能验证指南

这份文档回答一个问题：

> 公网开放注册前，已经做过的防护功能分别应该怎么验证？

它不替代：

- `public-registration-readiness-plan.md`
  - 判断优先级、开放阶段和剩余风险。
- `backend-release-readiness-checklist.md`
  - 作为上线前逐项勾选清单。
- `public-registration-http-baseline-runbook.md`
  - 说明 `pnpm run load:public-registration-baseline` 的配置、执行和留证方式。

## 1. 验证前提

执行真实环境验证前，先确认：

- 目标环境代码和 SQL 都已部署到位。
- `REGISTRATION_MODE` 已显式配置；小范围公网开放使用 `invite_only`。
- `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 已配置。
- `APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` 与目标域名一致。
- 已准备管理员账号、普通已验证账号、未验证邮箱账号、`generation_limited` 测试账号、`readonly` 测试账号。
- 已准备至少 3 个不同普通账号 cookie，用于验证同一 IP 多账号限流。
- 已准备可消耗或可清理的邀请码。

验证结果必须记录到 `docs/dev/dev-log.md`，并保留 baseline JSON 路径或摘要。

## 2. 注册模式与邀请码

验证目标：

- `closed` 模式拒绝注册。
- `invite_only` 模式无邀请码不能注册。
- 有效邀请码可以注册，且邀请码使用记录可追踪。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=registration-mode-visible
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=closed-signup-rejected
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=invite-only-signup-without-invite-rejected
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=invite-only-signup-with-invite-succeeds
```

通过标准：

- 返回的 `mode` 符合目标环境配置。
- `closed` 不创建 Auth 用户。
- `invite_only` 无邀请码返回受控失败。
- 有效邀请码注册后能查到 `registration_invite_attempts` 记录。

失败先查：

- `REGISTRATION_MODE` 是否配置到了目标环境。
- 目标环境是否应用了 invite code SQL。
- 邀请码是否过期、停用或超过 `max_uses`。

## 3. 注册 IP 频控

验证目标：

- 同一 IP 在注册窗口内超过阈值时，`/api/auth/signup` 返回受控 429。
- 命中频控后，不继续校验邀请码、不扣次数、不创建 Auth 用户。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=signup-ip-rate-limit-hits-429
```

通过标准：

- 结果为 `passed`。
- 响应状态为 429。
- 响应包含 `requestId`。
- 没有产生额外邀请码扣减或账号创建。

注意：

- 推荐在 `invite_only` 环境验证，避免 `open` 模式为了测频控真实造号。
- 如果该场景在 `open` 模式被标记为 `blocked`，必须安排在 `invite_only` 或可清理账号的等价环境补跑。

## 4. 邮箱验证拦截

验证目标：

- 邮箱未验证用户不能进入主应用。
- 邮箱未验证用户不能调用受保护 API 或高成本入口。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=unverified-app-redirects-to-verify-email
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=unverified-api-rejected
```

通过标准：

- 页面访问被重定向到 `/verify-email`。
- API 返回受控 403。
- 不触发学习写入、模型调用或 TTS 调用。

失败先查：

- Supabase 项目是否启用邮箱验证。
- 测试 cookie 是否确实属于未验证邮箱账号。
- middleware 和受保护 API 是否部署为最新版本。

## 5. Origin 与受保护写接口

验证目标：

- 受保护写接口拒绝不匹配的跨站 `Origin`。
- 拒绝发生在业务写入或高成本处理之前。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=origin-mismatch-rejected
```

通过标准：

- 不匹配 Origin 返回受控拒绝。
- 响应包含 `requestId`。
- 没有执行后续写入、生成或 TTS。

失败先查：

- `APP_ORIGIN` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` 是否与目标域名一致。
- baseline 配置里的 `origin` 是否故意设置为不匹配值。

## 6. 高成本接口限流

验证目标：

- 正常用户在阈值内可以调用高成本接口。
- 同一用户超过短窗口阈值会返回 429。
- 同一 IP 多账号超过短窗口阈值会返回 429。
- 429 后不继续触发模型、TTS 或其他高成本处理。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=practice-generate-normal
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=user-rate-limit-hits-429
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=ip-rate-limit-hits-429
```

通过标准：

- 正常调用结果为 `passed`。
- user 限流和 IP 限流均返回 429。
- 429 响应包含 `requestId`。
- `ip-rate-limit-hits-429` 使用至少 3 个不同账号 cookie。

失败先查：

- `/api/admin/status` 的 `rateLimitBackend.kind` 是否为 `upstash`。
- `ipLimitCookies` 是否真的来自不同账号。
- 目标环境是否有代理导致 client IP 识别不符合预期。

## 7. 每日额度

验证目标：

- 高成本接口超每日额度后返回受控 429。
- 超额请求不会进入上游模型或 TTS。
- `/api/admin/status` 能看到今日用量。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=daily-quota-exceeded-hits-429
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=admin-status-shows-backend-and-usage
```

通过标准：

- 超额场景返回 429。
- 响应 code 为 `DAILY_QUOTA_EXCEEDED` 或等价受控错误。
- `/api/admin/status` 返回 `todayHighCostUsage.items`。

失败先查：

- `DAILY_QUOTA_*` 环境变量是否符合预期。
- 测试账号是否真的处于额度已耗尽状态。
- 目标环境是否已执行 P0-B SQL。

## 8. 账号状态处置

验证目标：

- 管理员可以通过 `/admin/users` 搜索用户并切换 `access_status`。
- 非管理员不能手输 `/admin/users` 或直打 admin API。
- `generation_limited` 不能调用 AI / TTS / generate。
- `readonly` 不能写学习进度、保存表达或提交练习/复习写入。
- `disabled` 不能进入主应用或受保护 API。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=generation-limited-rejected
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=readonly-write-rejected
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=admin-status-shows-backend-and-usage
```

还需要手动演练：

- 用管理员登录 `/admin/users`。
- 搜索测试账号。
- 将账号切为 `generation_limited`，确认高成本入口被拒绝。
- 将账号切为 `readonly`，确认写入入口被拒绝。
- 将账号恢复为 `active`。
- 用普通账号手输 `/admin/users`，确认被拦截。

通过标准：

- 管理员操作成功，普通用户被拒绝。
- 受限账号的拒绝发生在 quota 预占和上游调用之前。
- 恢复 `active` 后正常能力恢复。

失败先查：

- 管理员邮箱是否在白名单。
- 测试账号的 `profiles.access_status` 是否真实更新。
- 是否使用了旧 cookie 或错误账号。

## 9. 学习时长防污染

验证目标：

- 单次异常大的 `studySecondsDelta` 不写入学习统计。
- 同一 `user + scene` 在最小间隔内重复有效上报不写入学习统计。
- 异常会留下记录，便于后续排查。

推荐验证：

- 用测试账号完成一次正常学习进度写入。
- 构造 `studySecondsDelta > 60` 的请求，确认不计入统计。
- 在 10 秒内重复上报同一 `user + scene` 的有效 delta，确认不计入统计。
- 检查 `learning_study_time_anomalies` 是否有异常记录。

通过标准：

- Progress 里的个人展示不会被异常 delta 污染。
- 异常请求不影响正常学习闭环。
- 异常有可追踪记录。

注意：

- 当前学习时长仍不能作为计费、排行、公开等级或奖励依据。
- 完整服务端 heartbeat 仍属于后续 P2 能力。

## 10. 运行状态与留证

验证目标：

- 管理员能看到运行状态。
- baseline 结果可留证、可复盘。
- 放行前能明确判断当前是否是 `upstash` 限流。

推荐验证：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=admin-status-shows-backend-and-usage
```

通过标准：

- `/api/admin/status` 返回 `rateLimitBackend.kind=upstash`。
- `/api/admin/status` 返回 `upstashConfigured=true`。
- `/api/admin/status` 返回 `todayHighCostUsage.items`。
- baseline JSON 已保留。
- `docs/dev/dev-log.md` 已记录目标环境、命令、通过项、blocked/failed 项和后续补跑项。

## 11. 放行判断

可进入 `invite_only` 小范围真实用户试放的最低条件：

- 注册模式、注册 IP 频控、邮箱验证、Origin、user/IP 限流和 admin status baseline 均通过。
- `rateLimitBackend.kind=upstash`。
- `/admin/users` 处置演练完成。
- `REGISTRATION_MODE=closed` 紧急切换已确认。
- 真实 baseline JSON 已留证。

不建议进入不可控公开渠道的情况：

- 任一核心 baseline 场景仍是 `blocked` 或 `failed`。
- 限流后端仍是 `memory`。
- 没有可用管理员处置入口。
- 没有真实环境留证。
- 尚未补验证码、邮箱域名策略、设备/来源风控或 WAF 层策略。
