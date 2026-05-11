# 服务端治理上线前检查清单

## 环境

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已配置且与目标项目一致
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅服务端环境可用
- [ ] `REGISTRATION_MODE` 已显式配置；公网小范围开放使用 `invite_only`
- [ ] `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 已配置或确认接受保守默认值
- [ ] `REGISTRATION_IP_LIMIT_WINDOW_SECONDS` 已配置或确认接受保守默认值
- [ ] `UPSTASH_REDIS_REST_URL` 已配置
- [ ] `UPSTASH_REDIS_REST_TOKEN` 已配置
- [ ] `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `APP_ORIGIN` 至少有一项与实际部署域名一致

## 注册与邮箱验证

- [ ] `closed` 模式下 `/api/auth/signup` 拒绝注册
- [ ] `invite_only` 模式下无邀请码注册失败
- [ ] 同一 IP 连续注册会在 `/api/auth/signup` 命中受控 429
- [ ] 邀请码表包含 `max_uses`、`used_count`、`expires_at` 和 `is_active`
- [ ] 管理员可通过 `/admin/invites` 生成、停用和调整邀请码
- [ ] `/admin/invites` 可查看邀请码使用 email、auth user id、attempt 状态和最小活动摘要
- [ ] 注册成功或失败均有 `registration_invite_attempts` 记录
- [ ] Supabase 项目已确认开启邮箱验证策略
- [ ] 邮箱未验证用户访问主应用会进入 `/verify-email`
- [ ] 邮箱未验证用户调用受保护 API 返回 403

## 接口治理

- [ ] 高成本接口确认已接入 user + IP 双维度统一限流
- [ ] `/api/admin/status` 可看到 `rateLimitBackend.kind`
- [ ] 受保护写接口确认已接入 `Origin` 校验
- [ ] 关键写接口确认已接入幂等保护
- [ ] 未知异常确认会统一返回受控错误并带 `requestId`
- [ ] 外部模型调用已配置可控超时，且超时后会主动终止并返回受控失败
- [ ] 外部模型空响应、非成功状态与异常抛出都会被统一收敛，不会直接裸透传到接口层
- [ ] 统一参数校验入口仍覆盖 `review / learning / phrases / practice / scenes`

## 数据边界

- [ ] 用户态读写继续优先走 `createSupabaseServerClient`
- [ ] 关键用户态表的现有 RLS / SQL 映射已核对
- [ ] 共享 `phrases` 表仍只通过后台白名单入口访问
- [ ] AI enrich 仍只保留在后台白名单路径
- [ ] 回滚方案已明确：若数据库策略与服务层边界不一致，优先回退服务层调用路径，再单独修复 SQL

## 真实 HTTP 验证

执行前先看：

- [public-registration-http-baseline-runbook.md](/d:/WorkCode/AbandonClaw/docs/dev/public-registration-http-baseline-runbook.md)

以下项目未完成前，不应把注册入口发给真实公网用户：

- [ ] 目标环境 `/api/admin/status` 已确认 `rateLimitBackend.kind=upstash`
- [ ] 真实 HTTP baseline 已输出结构化 JSON，并在 `docs/dev/dev-log.md` 记录摘要
- [ ] `signup-ip-rate-limit-hits-429`、`user-rate-limit-hits-429`、`ip-rate-limit-hits-429` 已在目标环境或等价环境跑通
- [ ] `/admin/users` 已完成一次真实演练：把测试账号切到受限状态并恢复
- [ ] 已确认可紧急切回 `REGISTRATION_MODE=closed`

- [ ] 本地开发服务或目标环境已启动
- [ ] baseline 脚本使用的 `Origin` 与服务端允许域一致
- [ ] 认证 cookie 已通过真实登录流程获取
- [ ] `registration-mode-visible` baseline 已执行，并确认返回的 `mode` 符合当前目标环境
- [ ] `closed` 或 `invite_only` 对应注册场景已执行，并保留成功/失败结果
- [ ] `signup-ip-rate-limit-hits-429` baseline 已执行，或明确记录为何仍待在 `invite_only` 环境补跑
- [ ] `unverified-app-redirects-to-verify-email` 与 `unverified-api-rejected` 至少执行一项
- [ ] `origin-mismatch-rejected` baseline 已执行
- [ ] `practice-generate-normal` baseline 已执行
- [ ] `user-rate-limit-hits-429` baseline 已执行
- [ ] `ip-rate-limit-hits-429` baseline 已执行，且使用至少 3 个不同账号 cookie
- [ ] `daily-quota-exceeded-hits-429` baseline 已执行，或明确记录真实环境待补跑原因
- [ ] `generation-limited-rejected` 与 `readonly-write-rejected` baseline 已执行，或明确记录待补跑原因
- [ ] `admin-status-shows-backend-and-usage` baseline 已执行
- [ ] 限流命中与异常结果已记录，不只保留终端输出
- [ ] 至少验证过一组模型调用超时或上游异常时的受控失败表现
- [ ] 已按 [real-learning-loop-acceptance-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/real-learning-loop-acceptance-checklist.md) 走完一轮真实学习闭环

## 第四阶段补充

- [ ] 响应头已包含 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 与 `Strict-Transport-Security`
- [ ] `today` 首要任务解释已在页面显示，并确认 continue / repeat / review 三类来源文案正确
- [ ] `scene full` 播放失败时已返回受控提示，不再直接暴露原始错误
- [ ] `tts/regenerate` 批量重生成失败会记录结构化日志，并汇总失败项
- [ ] 已复核当前仍保留后台白名单的入口只剩共享 `phrases` 和 AI enrich
- [ ] 若真实环境再出现 `Connect Error: {}`，已具备 `requestId` 与 TTS 服务端日志可追踪链路
- [ ] `/admin/observability` 能看到最近关键学习动作与失败摘要

## 最小验证命令

```bash
pnpm run validate:db-guardrails
node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts src/lib/server/rate-limit.test.ts
node --import tsx --test src/features/today/components/today-page-selectors.test.ts src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/server/tts/service.test.ts src/app/api/tts/regenerate/route.test.ts
node --import tsx --test scripts/load-public-registration-http-baseline.test.ts
node --import tsx -e "const mod = await import('./next.config.ts'); const config = mod.default?.default ?? mod.default; console.log(typeof config.headers)"
pnpm run text:check-mojibake
pnpm load:api-baseline --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json
pnpm run load:public-registration-baseline --dry-run --config-file=scripts/load-samples/public-registration-http-baseline.sample.json
```

## P0-B 公网开放防护检查

- [ ] `supabase/sql/20260509_public_registration_p0b.sql` 已在目标环境执行。
- [ ] `profiles.access_status` 默认 `active`，且可通过 `/admin/users` 或 SQL 设置为 `disabled`、`generation_limited`、`readonly`。
- [ ] `/admin/users` 可按邮箱、用户 ID、用户名或状态查找目标用户，并成功切换 `access_status`。
- [ ] `/admin/users` 非 admin 手输路由会被拦截，`/api/admin/status` 非 admin 请求会被拒绝。
- [ ] 已用测试账号实际演练 `generation_limited` 与 `readonly` 的设置和恢复，而不只是停留在单测通过。
- [ ] `DAILY_QUOTA_*` 环境变量已确认；未配置时接受服务端保守默认值。
- [ ] 高成本接口超每日额度时返回 429，且不触发模型/TTS。
- [ ] `/api/admin/status` 可看到 `todayHighCostUsage.items`。
- [ ] `studySecondsDelta > 60` 不计入学习统计，并写入异常记录。
- [ ] 同一 `user + scene` 10 秒内重复有效 delta 不计入学习统计，并写入异常记录。
- [ ] `generation_limited` 用户不能调用 AI / TTS / generate。
- [ ] `readonly` 用户不能写学习进度、保存表达或提交练习/复习写入。

## 当前已知风险

- 本地环境的真实 HTTP baseline 依赖临时登录 cookie 与临时测试数据，不是正式生产容量结果
- `practice generate` 在当前阈值下会按预期触发 `429`
- `tts` 在当前环境里出现过单次 `500`，日志表现为 `Connect Error: {}`
- 数据库策略仍缺少独立的真实环境冒烟验证，这一项需要在可用数据库环境下单独补齐
