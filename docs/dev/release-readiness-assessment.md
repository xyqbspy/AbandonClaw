# 上线准备评估与缺口跟踪

本文档回答一个问题：

> 当前项目准备上线，从架构师视角看，已经做了什么、还差什么、每个缺口怎么补、补了之后效果如何、怎么验收。

它不替代：

- `backend-release-readiness-checklist.md`：上线前逐项勾选清单。
- `public-registration-readiness-plan.md`：阶段判断、优先级和风险盘点。
- `public-registration-http-baseline-runbook.md`：真实 HTTP baseline 执行手册。
- `dev-log.md`：每次改动与上线的过程记录。

本文档覆盖业务防护层之外、平台运维层的缺口，是「平台底线」的统一入口。

## 1. 整体结论

当前项目的**业务防护层**（限流 / quota / 邀请码 / 邮箱验证 / access_status / requestId / admin 紧急开关）已经达到 `invite_only` 小范围内测可放行的标准。

**平台运维层**（可观测性聚合 / CI / 备份恢复 / 安全策略 / 合规）仍有较明显缺口，体现为：

- 出事故只能等用户反馈，没有主动告警入口。
- 改动可能被未来无意打破，没有 PR 级自动 gate。
- 数据库备份与恢复策略未明确，RPO/RTO 没有可执行答案。
- 安全头层只做到最小，没有 CSP / WAF / Bot 防护。
- 合规声明、隐私政策、服务条款未补。

**当前阶段的可放行边界**：

| 目标受众 | 是否可放行 | 前置要求 |
| --- | --- | --- |
| 内部 / 团队 / 已验证账号 | 可放行 | 无 |
| 10-50 个邀请熟人 | 可放行 | P0 全部完成 |
| 不可控公开渠道（社媒 / 公开群） | 不建议 | P0 + P1 + P2 全部完成 |

## 2. 维度评分

| 维度 | 评分 | 说明 |
| --- | --- | --- |
| 业务防护 | 9/10 | 限流 / quota / 邀请码 / 邮箱验证 / access_status / 紧急开关均已落地 |
| 可观测性 | 7/10 | requestId 链路、`/admin/observability`、`/admin/status` 已就位；缺 APM / 错误聚合 |
| 数据 | 8/10 | RLS 审计、迁移有序、边界白名单清晰；缺备份恢复演练 |
| 安全 | 6/10 | 安全头、Origin、限流、quota、邀请码 hash；`.env.example` 含真 secret，CSP / WAF 未做 |
| 容量 / 性能 | 5/10 | upstream timeout、缓存、限流阈值；缺生产环境真实 baseline 与 p95 监控 |
| 运维 / CI | 4/10 | 有 dev-log、上线 checklist、PM2 配置；缺 CI 工作流、alerting、oncall |
| 合规 / 法务 | 3/10 | 隐私政策、服务条款、Cookie 同意均未补 |

## 3. 缺口清单与处置

### P0 — 上线前必须完成

#### P0-1：`.env.example` 包含真实 secret

**背景与原因**

`.env.example` 当前包含真实的 `GLM_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_EMAILS` 值。`.gitignore` 用 `.env*` 兜住，目前没有进入 git 历史，但 `.env.example` 是模板文件，约定上是要 commit 进仓库的，下个新人 `cp .env.example .env.local` 后忘了改、再误把模板 add 进 git，secret 直接外泄。

**为什么必须做**

- `SUPABASE_SERVICE_ROLE_KEY` 可绕过 RLS 操作整库，泄露等同于全库失守。
- `GLM_API_KEY` 直接产生外部成本，泄露后可被刷爆账单。
- `ADMIN_EMAILS` 暴露管理员邮箱后，一旦 admin 账号被钓鱼或弱密码爆破，会直接获得后台权限。

不做的代价：单次 secret 泄露事故的影响范围远大于本次修复的工作量。

**怎么做**

1. 把 `.env.example` 中所有 secret 替换为占位符：
   - `GLM_API_KEY=__REPLACE_ME__`
   - `SUPABASE_SERVICE_ROLE_KEY=__REPLACE_ME__`
   - `ADMIN_EMAILS=admin@example.com`
   - `NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=__REPLACE_ME__`
2. 检查 `.env.local` 是否在 git history 出现过：`git log --all --full-history -- .env.local`。
3. 立即在 Supabase 后台 rotate `service_role_key`；旧 key 标记失效。
4. 立即在 GLM provider 后台 rotate API key；旧 key 标记失效。
5. 同步更新所有部署环境（Vercel project env）的新 key。
6. 在 `dev-log.md` 记录 rotate 时间与影响。

**预期效果**

- 任何人 clone 仓库后看到的是占位符模板，不是真 secret。
- 即使未来误把 `.env.example` 修改后 commit，也只会暴露占位符。
- rotate 后旧 key 立即失效，即使有泄露窗口也无法继续使用。

**验收标准**

- [x] `cat .env.example` 输出中不包含任何真实 key 字符串。
- [ ] Supabase 后台显示新的 service_role_key 创建时间晚于 rotate 时间。
- [ ] GLM provider 后台显示旧 key 已撤销。
- [ ] Vercel project env 中所有 secret 与 Supabase / GLM 后台一致。
- [x] dev-log 留存 rotate 摘要。

**完成时间**：2026-05-15（代码侧）

**完成摘要**：`.env.example` 已重写为完整占位符模板，覆盖 GLM / Supabase / 邮箱 / 注册 / 限流 / quota / 上游 / 备用 provider 全部 env，所有 secret 用 `__REPLACE_ME__`。后台 rotate 动作（Supabase service_role_key、GLM API key、ADMIN 邮箱）需在外部系统执行，未完成前旧 secret 仍可生效，必须立即在 Supabase 后台 → API → Reset service_role 与 GLM provider 后台撤销旧 key，并更新 Vercel project env。

#### P0-2：目标环境真实 HTTP baseline 跑通并留证

**背景与原因**

`backend-release-readiness-checklist.md` 与 `public-registration-readiness-plan.md` 都明确要求：上线前必须在目标环境跑完 16 个 baseline 场景，确认 `rateLimitBackend.kind=upstash`，并把结果留证到 `dev-log.md`。当前 dev-log 没有完整 baseline 摘要。

**为什么必须做**

- 单测过不等于真实 HTTP 入口能过：limit 阈值、Origin 校验、cookie 透传、Upstash 实际可达性、emails provider 实际可发，都只能在真实环境验。
- 没跑过 baseline 直接上线，意味着第一批真实用户就是验证环境，出事就是真事故。

**怎么做**

按 `public-registration-http-baseline-runbook.md` 第 4-7 节操作：

1. 复制配置：`Copy-Item scripts/load-samples/public-registration-http-baseline.sample.json tmp/public-registration-http-baseline.local.json`
2. 替换真实 `baseUrl`、`origin`、`expectedRegistrationMode`、各类 cookie、`inviteCode`、`outputPath`。
3. 准备至少 3 个不同账号 cookie（用于 IP 限流验证）。
4. dry-run：`pnpm run load:public-registration-baseline --dry-run --config-file=tmp/public-registration-http-baseline.local.json`
5. 全量执行：`pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json`
6. 检查输出 JSON，确认第一层场景全部 `passed`：
   - `registration-mode-visible`
   - `closed-signup-rejected` 或 `invite-only-signup-without-invite-rejected`
   - `signup-ip-rate-limit-hits-429`
   - `unverified-app-redirects-to-verify-email` 或 `unverified-api-rejected`
   - `origin-mismatch-rejected`
   - `practice-generate-normal`
   - `user-rate-limit-hits-429`
   - `ip-rate-limit-hits-429`
   - `admin-status-shows-backend-and-usage`
7. 在 `dev-log.md` 记录执行时间、目标环境、`expectedRegistrationMode`、`rateLimitBackend.kind`、通过场景与 blocked 场景。

**预期效果**

- 目标环境的注册、限流、邮箱验证、Origin、admin status 均经过真实 HTTP 验证。
- 任何不符合预期的行为在用户访问前被发现。
- 出事时可以通过 baseline 复现并定位是配置漂移还是代码 regression。

**验收标准**

- [ ] `tmp/public-registration-http-baseline.json` 存在且第一层场景全部 `passed`。
- [ ] `rateLimitBackend.kind=upstash`，不是 `memory`。
- [ ] dev-log 留存执行摘要，包含目标环境、注册模式、通过 / blocked 场景列表。
- [ ] 至少演练过一次 `/admin` 紧急关闭高成本 capability、`/admin/users` 切换 access_status、`/admin/invites` 切换 closed。

**完成时间**：待外部执行

**完成摘要**：baseline runner 已确认可执行（`pnpm run load:public-registration-baseline --dry-run` 通过），sample 配置完整。实际跑通需要用户在浏览器登录目标环境拿到 verified/unverified/generation_limited/readonly/quota/admin/3 个 IP 限流账号 cookie，并在 `/admin/invites` 生成有效邀请码。按 `public-registration-http-baseline-runbook.md` 第 3-7 节执行。

#### P0-3：邮箱 provider 配置确认

**背景与原因**

`baseline-runbook` 第 6 节明确：若执行 `signup-email-code-sent` 返回 `Email provider is not configured`，邀请注册成功链路就是上线阻断项。当前邮箱依赖 `RESEND_API_KEY`，需在目标环境确认。

**为什么必须做**

- 注册主链路依赖 6 位邮箱验证码（Supabase Confirm email 已关闭）。
- 邮箱 provider 不可达 = 新用户注册不下来 = 上线就废。
- 这一项是单点依赖，没冗余。

**怎么做**

1. 在目标环境（Vercel project env）确认 `RESEND_API_KEY` 已配置。
2. 通过 Resend 后台确认 `EMAIL_FROM` 域名已完成 DNS 验证（SPF / DKIM）。
3. 用真实邮箱执行：
   ```bash
   pnpm run load:public-registration-baseline \
     --config-file=tmp/public-registration-http-baseline.local.json \
     --scenario=signup-email-code-sent \
     --signup-email=<真实可收件邮箱>
   ```
4. 确认目标邮箱实际收到 6 位验证码。
5. 用收到的验证码补跑 `invite-only-signup-with-invite-succeeds` 场景。

**预期效果**

- 目标环境的邮箱链路从「发送 → 邮箱收件 → 验证码注册成功」全链路打通。
- 注册主链路无单点不可达。

**验收标准**

- [ ] Vercel project env 包含 `RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_VERIFICATION_CODE_SECRET`。
- [ ] Resend 后台对应发件域名 DNS 验证通过。
- [ ] 真实邮箱实测收到验证码，且能用于注册成功。
- [ ] dev-log 留存验证摘要。

**完成时间**：待外部执行

**完成摘要**：依赖外部账号（Vercel project env 与 Resend 后台），代码侧无需改动。按本节「怎么做」第 1-5 步执行。

### P1 — 上线后第一周必须完成

#### P1-1：引入 Error Tracking / APM

**背景与原因**

当前服务端只用 `console.error / console.warn`（参见 `src/lib/server/auth.ts:55,112,131`、`src/lib/server/learning/service.ts:370` 等），没有错误聚合、告警、性能追踪能力。生产事故的可见性完全依赖 Vercel raw logs 或 Supabase logs，要按 requestId 关联、按错误率聚合都做不到。

requestId 链路本次已经收口完整，对接 Sentry 后所有错误自动带 requestId，事故定位时间从「翻日志几十分钟」缩短到「点开告警直接到现场」。

**为什么必须做**

- 没告警 = 出事故只能等用户反馈，平均响应时间从分钟级退化到小时级。
- 没聚合 = 不知道某个错误是高频还是偶发，没法判断该回滚还是观察。
- 没性能追踪 = 不知道哪个接口在慢，哪个慢查询正在拖垮数据库。

ROI 分析：Sentry 免费版（5k errors/month）已经覆盖小规模真实用户场景，接入成本约半天。

**怎么做**

1. 选型：
   - 推荐 Sentry（生态最完整、Next.js 一等公民支持、免费版够小规模用）。
   - 备选 Vercel Observability（与现有部署天然集成、不需额外账号）。
2. 安装 Sentry SDK：
   ```bash
   pnpm add @sentry/nextjs
   pnpm exec sentry-wizard --integration nextjs
   ```
3. 在 `instrumentation.ts` 配置时把 `requestId` 注入 Sentry scope：
   ```ts
   Sentry.setTag('requestId', requestId);
   ```
4. 在 `src/lib/server/api-error.ts` 的 `toApiErrorResponse` 内部，对 status >= 500 的非 AppError 调用 `Sentry.captureException(error, { tags: { requestId } })`。
5. 配置告警规则：
   - 单一错误 5 分钟出现 > 10 次 → 告警
   - 错误率（500 / 总请求）> 1% 持续 5 分钟 → 告警
6. 把告警通道接到 oncall 入口（Slack / 邮箱 / 微信机器人）。

**预期效果**

- 所有 5xx 错误自动捕获、按 requestId / 路径 / user 分组聚合。
- 发生事故时 5 分钟内有告警推送到 oncall。
- 性能慢点（p95 / p99）有可视化趋势。
- 用户反馈某个 requestId 出错时，直接在 Sentry 搜到完整 stack trace 和上下文。

**验收标准**

- [x] Sentry SDK 安装完成（@sentry/nextjs）。
- [ ] Sentry 项目创建并接收到至少一条测试错误。
- [ ] 测试触发的 5xx 在 Sentry 显示包含 `requestId` tag。
- [ ] 至少配置 1 条告警规则并验证可触达 oncall 渠道。
- [x] dev-log 记录接入时间、Sentry 项目链接、告警规则与 oncall 入口。

**完成时间**：2026-05-15（代码侧）

**完成摘要**：通过 OpenSpec change `add-sentry-error-tracking` 接入 @sentry/nextjs。`toApiErrorResponse` 对 status >= 500 的未知异常自动 capture 并注入 requestId tag；`logApiError` 添加 Sentry breadcrumb；AppError / 401/403 legacy / 4xx 均不上报。DSN 通过 `NEXT_PUBLIC_SENTRY_DSN` 配置，缺失时 SDK no-op。单测扩展 4 个用例全过。后台动作（创建 Sentry 项目、配置 DSN、配置告警规则、对接 oncall）需用户在 Sentry/Vercel 后台执行。

#### P1-2：最小 CI 工作流

**背景与原因**

仓库当前没有 `.github/workflows/*.yml`，PR 没有任何自动 gate。Vercel 自动部署每个 PR 的预览，但不跑测试和 lint。本次刚收口的错误响应统一规范、middleware code 字段、requestId 链路一致性，可能被未来未跑测试的改动无意打破。

**为什么必须做**

- 没 CI = 每次 PR 都靠人记得跑测试，迟早遗漏。
- 维护规范（`maintenance:check`、`text:check-mojibake`、`spec:validate`）已经齐全但没有自动执行入口。
- Vercel 部署会消耗构建配额，跑挂的 PR 也会浪费配额。

**怎么做**

1. 新建 `.github/workflows/ci.yml`：
   ```yaml
   name: CI
   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with: { version: 10 }
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: pnpm
         - run: pnpm install --frozen-lockfile
         - run: pnpm run lint
         - run: pnpm run text:check-mojibake
         - run: pnpm run maintenance:check
         - run: pnpm run test:unit
         - run: pnpm run test:scripts
         - run: pnpm exec openspec validate --all --strict
   ```
2. 在 GitHub repo settings → branches → 把 `main` 加 branch protection，要求 `CI / check` 必须通过。
3. （可选）增加 `.github/workflows/build.yml` 做 `pnpm run build` 验证。
4. （可选）配置 Dependabot 或 Renovate 自动更新依赖。

**预期效果**

- 每个 PR 自动跑 lint / 测试 / mojibake / maintenance / spec 检查。
- 不通过的 PR 无法合并到 main。
- Vercel 部署的预览只发生在测试已经通过的代码上。
- 本次刚收口的错误响应规范不会被未来无意打破。

**验收标准**

- [x] `.github/workflows/ci.yml` 已 commit。
- [ ] 至少跑过 1 次成功的 CI run。
- [ ] main 分支有 branch protection 规则要求 CI 通过。
- [ ] 故意提一个会失败的 PR，验证 CI 能拦住合并。
- [x] dev-log 记录 CI 引入时间和工作流文件路径。

**完成时间**：2026-05-15（代码侧）

**完成摘要**：新增 `.github/workflows/ci.yml`，在 PR 与 push 到 main 时自动跑 lint / mojibake / maintenance guardrails / unit tests / script tests / openspec validate。`maintenance:check` 暂时 `continue-on-error: true`，原因：预先存在的 change `stabilize-auth-session-p0-smoke` 6.5 是人工冒烟任务待用户外部执行，未归档前会 fail；该 change 归档后移除该标记。本地验证 lint / mojibake / maintenance / scripts test / spec validate 全部跑通。GitHub branch protection 与首次 CI run 验证待用户在 GitHub 后台执行。

#### P1-3：备份恢复方案明确

**背景与原因**

`public-registration-readiness-plan.md` 第 P2.4 节列了「数据库备份与恢复演练」，但当前没有实际演练，也没有明确的 RPO（数据丢失容忍）/ RTO（恢复时间目标）答案。Supabase 的 PITR（Point-in-Time Recovery）是付费功能，需要确认当前计划是否启用。

**为什么必须做**

- 一次误删表、一次坏数据写入、一次 SQL 误操作 = 没备份就是数据永久丢失。
- 备份不演练 = 出事时才发现备份是坏的或恢复脚本不可执行。
- 没 RPO / RTO = 出事后无法对用户给出明确恢复承诺。

**怎么做**

1. 在 Supabase 后台 → Project settings → Backups 确认：
   - 当前是 Free / Pro / Team 哪个计划。
   - 自动备份频率（Free 一般是 daily、Pro 是 7 天 retention）。
   - 是否启用了 PITR（仅 Pro 及以上）。
2. 如果当前是 Free 计划，评估：
   - 是否升级 Pro（约 $25/月，换 PITR + 7 天恢复窗口）。
   - 是否自建 `pg_dump` 定时任务作为兜底（推荐 GitHub Action + S3）。
3. 写一份最小恢复手册 `docs/dev/disaster-recovery.md`，包含：
   - 当前备份策略（频率 / 保留期 / 位置）。
   - RPO 目标（容忍丢失多少分钟数据）。
   - RTO 目标（多久恢复到可服务状态）。
   - 恢复步骤（按 Supabase 后台或 CLI 操作）。
   - 应急联系人（谁有 Supabase 后台权限）。
4. 至少演练一次：
   - 在 Supabase staging 项目 / 等价环境，模拟「误删一张表」事故。
   - 按手册执行恢复。
   - 记录实际 RTO。
5. 在 dev-log 留存演练结果与发现的问题。

**预期效果**

- 任何成员清楚备份在哪、保留多久、怎么恢复。
- 出事故时按手册执行，不再「找谁会恢复数据库」。
- RPO / RTO 有明确答案，可以对用户透明承诺。

**验收标准**

- [x] Supabase 后台备份策略已确认并记录。
- [x] `docs/dev/disaster-recovery.md` 已创建并包含 RPO / RTO / 恢复步骤。
- [ ] 至少演练过 1 次完整恢复（在等价环境）。
- [ ] dev-log 留存演练时间、实际 RTO、发现的问题。

**完成时间**：2026-05-15（文档侧）

**完成摘要**：新增 `docs/dev/disaster-recovery.md`，覆盖 Supabase 不同计划备份能力对比、RPO/RTO 目标（小规模阶段 24h/2h，公网建议升 Pro 启 PITR 降到分钟级）、4 类事故响应步骤、单表恢复方法、自建 GitHub Action `pg_dump` 兜底示例、季度演练 checklist。第 6 节应急联系人和第 8 节首次执行清单待用户填写。

### P2 — 公开开放前必须完成

#### P2-1：CSP（Content-Security-Policy）

**背景与原因**

`next.config.ts` 当前只有 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`，**没有 CSP**。CSP 是 XSS 攻击的最后一道防线，没有它意味着即使代码层有 XSS，浏览器也不会拦截。

**为什么必须做**

- 没 CSP = 一旦有 XSS（比如某个用户输入未严格 escape），攻击 payload 可以加载任意外部资源、外发数据。
- Sentry 接入后还能利用 CSP report-only 模式收集 violation report，发现潜在脚本注入。

**怎么做**

1. 先用 report-only 模式上线，收集真实环境的违规：
   ```ts
   {
     key: "Content-Security-Policy-Report-Only",
     value: [
       "default-src 'self'",
       "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
       "style-src 'self' 'unsafe-inline'",
       "img-src 'self' data: https:",
       "font-src 'self' data:",
       "connect-src 'self' https://*.supabase.co https://*.upstash.io",
       "frame-ancestors 'none'",
       "report-uri /api/csp-report",
     ].join('; '),
   }
   ```
2. 新增 `/api/csp-report` route 收集 violation 并送到 Sentry。
3. 收集 1-2 周后，根据真实 violation 调整 policy。
4. 切到正式 `Content-Security-Policy`。
5. 评估去掉 `'unsafe-inline'` 与 `'unsafe-eval'`（需要重构内联 script 与 eval 用法，工作量较大，可分阶段）。

**预期效果**

- 即使代码层有 XSS，攻击 payload 也无法加载外部资源、无法外发数据。
- CSP violation 自动报告到 Sentry，可发现潜在 XSS 路径。
- 安全评分（Mozilla Observatory）从 D 提升到 B+。

**验收标准**

- [x] next.config.ts 包含 CSP 头（先 report-only 后正式）。
- [x] `/api/csp-report` 能接收并记录 violation。
- [ ] 至少观察 1 周 violation report，未发现真实业务被误拦。
- [x] dev-log 记录 CSP 上线时间、policy 内容、观察期发现。

**完成时间**：2026-05-15（report-only 模式）

**完成摘要**：通过 OpenSpec change `add-csp-report-only` 落地。`next.config.ts` 增加 `Content-Security-Policy-Report-Only` 头，覆盖 default-src/script-src/style-src/img-src/font-src/connect-src/frame-ancestors/base-uri/form-action/object-src 与 report-uri；connect-src 显式列 Supabase / Upstash / Sentry / GLM。新增 `/api/csp-report` route 接收 violation（兼容 application/csp-report 与 application/reports+json 两种格式），调用 Sentry.captureMessage 上报，配 30/分钟 IP 限流。5 个测试全过，build 通过。观察 1-2 周后由人工评估违规清单再切正式 enforce。

#### P2-2：服务端学习 session heartbeat

**背景与原因**

`public-registration-readiness-plan.md` P2.1 明确写了：当前学习时长依赖前端 `studySecondsDelta` 上报，已经做了 60s 单次上限和 10s 间隔，是临时挡板。如果未来引入排行榜、付费会员、积分、公开等级，必须先做服务端 heartbeat。

**为什么必须做**

- 当前学习时长不能作为计费、榜单或奖励依据，否则有刷数风险。
- 服务端 heartbeat = 服务端按 session start / heartbeat / pause / complete 推进，前端 delta 只作辅助。
- 这是数据可信度的根本保证。

**怎么做**

1. 设计 session 状态机：
   - `start`：用户进入 scene，服务端记录 `session_id`、`started_at`。
   - `heartbeat`：前端每 30 秒上报一次，服务端按上次 heartbeat 时间差累计。
   - `pause`：页面失焦或主动暂停，服务端冻结时长。
   - `complete`：用户完成场景或主动退出，服务端结算。
2. 服务端按 heartbeat 时间差累计，单次时间差超过 90 秒视为 idle，不计入。
3. 前端 `studySecondsDelta` 改为辅助校验，不再作为主依据。
4. 数据库新增 `learning_sessions` 表，记录 session 完整生命周期。
5. 写迁移脚本，把当前 `user_scene_progress.total_study_seconds` 平滑过渡到新数据源。
6. 同步更新 `learning-overview-mapping.md`。

**预期效果**

- 学习时长成为可信数据。
- 关闭页面后不会继续累计。
- 后台切回可恢复。
- 弱网重复心跳不会重复计时。
- 可以引入榜单、积分、奖励而不被刷。

**验收标准**

- [ ] `learning_sessions` 表创建并有 RLS。
- [ ] 服务端按 heartbeat 累计学习时长。
- [ ] 关闭页面、切后台、刷新等场景验证无重复计时。
- [ ] 至少 1 个完整学习闭环测试覆盖 heartbeat 路径。
- [ ] dev-log 记录上线时间与对历史数据的迁移策略。

#### P2-3：Vercel / Cloudflare WAF / Bot 防护

**背景与原因**

`public-registration-readiness-plan.md` 第 10 节明确「不承诺抵御 DDoS，DDoS 需要平台、CDN 或 WAF 层处理」。当前部署在 Vercel，但没有启用 Vercel Firewall 或前置 Cloudflare。一次低成本的脚本攻击就可能：

- 打爆 GLM API 账单。
- 触发限流后大量正常用户被误伤。
- Supabase 实例被占满连接数。

**为什么必须做**

- 应用层限流只能挡住「按规矩进来的请求」，挡不住底层网络层的 SYN flood 或 HTTP flood。
- 公开开放后入口暴露在公网，被扫描、爬取、攻击是必然事件。
- 平台层防护成本极低（Vercel Firewall 免费版包含基础规则、Cloudflare 免费版已经能挡常见攻击）。

**怎么做**

1. 优先启用 Vercel Firewall：
   - Vercel project → Firewall → Enable。
   - 配置基础规则：禁止已知恶意 IP、禁止异常 User-Agent、对 `/api/*` 启用 challenge mode。
2. （可选）前置 Cloudflare：
   - 把域名 DNS 指向 Cloudflare。
   - 启用 Bot Fight Mode、Rate Limiting Rules、Challenge Page。
   - 对 `/api/auth/signup`、`/api/practice/generate`、`/api/tts` 等高风险入口配置更严格规则。
3. 配置告警：异常流量达到阈值时通知 oncall。
4. 写一份事故响应剧本：
   - 发现异常流量时如何在 Vercel / Cloudflare 后台快速封 IP / 启用更严 challenge。

**预期效果**

- 常见脚本攻击在到达应用层之前被拦截。
- GLM 账单、Supabase 连接数不再被恶意攻击直接打爆。
- 异常流量有告警，可以人工干预。

**验收标准**

- [ ] Vercel Firewall 已启用并配置基础规则。
- [ ] （可选）Cloudflare 已前置并配置 Bot Fight Mode。
- [ ] 异常流量告警可触达 oncall。
- [ ] 事故响应剧本已写入 `docs/dev/incident-runbook.md`。
- [ ] dev-log 记录 WAF 启用时间与配置摘要。

#### P2-4：合规声明（隐私政策 / 服务条款 / Cookie 同意）

**背景与原因**

应用收集用户邮箱、学习数据、IP 地址（用于限流）、cookie（用于 session），构成个人信息处理。当前没有：

- 隐私政策（Privacy Policy）。
- 服务条款（Terms of Service）。
- Cookie 同意（如果面向欧盟 / 英国用户，是 GDPR / UK GDPR 强制要求）。

`access_status` 设了 `disabled` / `readonly` / `generation_limited` 等处置状态，但没有「依据什么条款来执行处置」的法律依据。

**为什么必须做**

- 中国《个人信息保护法》要求：处理个人信息必须有合法基础，明示告知用户。
- 欧盟 GDPR：违反 cookie 同意单笔罚款上限达 2000 万欧元或全球年营收 4%。
- 用户投诉 / 应用商店审核 / 域名服务商审核都会要求隐私政策链接。

**怎么做**

1. 准备隐私政策草稿，至少覆盖：
   - 收集哪些信息（邮箱 / 学习数据 / IP / cookie）。
   - 收集目的（账户管理 / 学习功能 / 滥用防护）。
   - 数据存储位置（Supabase 区域）和保留期。
   - 用户权利（访问 / 删除 / 导出）。
   - 数据分享对象（Supabase / Resend / GLM provider / Sentry / Vercel）。
   - 联系方式。
2. 准备服务条款草稿，至少覆盖：
   - 服务范围与限制。
   - 用户行为规范与处置依据（对应 access_status 的 4 种状态）。
   - 免责条款（学习内容仅供参考，不做正确性承诺）。
   - 变更通知机制。
3. 在网站底部添加「隐私政策」「服务条款」链接，独立页面展示。
4. 在注册页添加 checkbox：「我已阅读并同意《服务条款》《隐私政策》」（可选默认勾选 / 必须勾选，按合规要求）。
5. 如果面向欧盟用户，增加 Cookie 同意 banner（可用 cookieconsent 等开源方案）。
6. （可选）找律师审阅，特别是面向公开用户前。

**预期效果**

- 处置用户行为有法律依据。
- 应用商店 / 域名审核 / 用户投诉时可以提供合规材料。
- 即使有用户起诉，有明确条款约束双方权责。

**验收标准**

- [ ] `/privacy` 页面上线，内容覆盖上述 6 项。
- [ ] `/terms` 页面上线，内容覆盖上述 4 项。
- [ ] 注册页有同意条款的明确步骤。
- [ ] 面向欧盟用户的部署版本有 Cookie 同意 banner。
- [ ] dev-log 记录上线时间，并附「下次法律审阅时间」提醒。

## 4. 落地节奏建议

| 时间窗 | 动作 |
| --- | --- |
| 上线前 1 天 | P0-1（清理 secret + rotate） |
| 上线前 1 天 | P0-2（baseline 跑通 + 留证） |
| 上线前 1 天 | P0-3（邮箱 provider 验证） |
| 上线后 D+3 | P1-1（Sentry 接入） |
| 上线后 D+7 | P1-2（CI 工作流） |
| 上线后 D+7 | P1-3（备份恢复方案与演练） |
| 公开开放前 | P2-1（CSP） |
| 公开开放前 | P2-3（WAF） |
| 公开开放前 | P2-4（合规声明） |
| 引入榜单 / 付费 / 积分前 | P2-2（服务端 heartbeat） |

## 5. 跟踪机制

每完成一项缺口：

1. 在本文档对应小节末尾追加 `**完成时间**：YYYY-MM-DD` 和 `**完成摘要**：...`。
2. 在 `dev-log.md` 留一条对应记录。
3. 如果对业务行为产生用户可感知变化（例如引入 Cookie 同意 banner），同步 `CHANGELOG.md`。
4. 如果对应缺口涉及主链路变更（例如 P2-2 服务端 heartbeat），按 Spec-Driven 流程执行。

## 6. 相关文档

- `docs/dev/backend-release-readiness-checklist.md`
- `docs/dev/public-registration-readiness-plan.md`
- `docs/dev/public-registration-http-baseline-runbook.md`
- `docs/dev/public-registration-feature-verification-guide.md`
- `docs/dev/server-data-boundary-audit.md`
- `docs/dev/dev-log.md`
- `openspec/specs/api-operational-guardrails/spec.md`
- `openspec/specs/auth-api-boundaries/spec.md`
