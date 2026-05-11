# 公网开放真实 HTTP Baseline 操作手册

这份文档只回答一个问题：

> 在准备小范围公网开放前，怎样实际执行 `pnpm run load:public-registration-baseline`，以及怎样判断结果是否可接受。

它不替代：

- `docs/dev/backend-release-readiness-checklist.md`
  - 负责发布前检查项
- `docs/dev/public-registration-readiness-plan.md`
  - 负责优先级、风险和阶段判断
- `docs/dev/public-registration-feature-verification-guide.md`
  - 负责按功能说明验证方法、通过标准和失败排查入口
- `docs/dev/dev-log.md`
  - 负责记录本轮真实执行结果、阻塞项和后续补跑入口

## 1. 适用范围

这份手册适用于以下场景：

- 准备验证 `invite_only` / `invite_only_strict` 是否真的具备开放前硬门槛
- 需要在本地、预发或真实目标环境补跑注册与高成本接口 baseline
- 需要把 baseline 结果留成结构化证据，而不是只看终端输出

不适用于：

- 自动登录
- 自动生成邀请码；推荐先通过 `/admin/invites` 生成，SQL 仅作为后台不可用时的备用方案
- 自动造测试账号
- 容量压测或长期性能监控

## 2. baseline 覆盖内容

当前 runner 覆盖这些场景：

- `registration-mode-visible`
  - 查看 `/api/auth/signup` 返回的当前 `mode`
- `closed-signup-rejected`
- `invite-only-signup-without-invite-rejected`
- `signup-ip-rate-limit-hits-429`
- `invite-only-signup-with-invite-succeeds`
- `unverified-app-redirects-to-verify-email`
- `unverified-api-rejected`
- `origin-mismatch-rejected`
- `practice-generate-normal`
- `user-rate-limit-hits-429`
- `ip-rate-limit-hits-429`
- `daily-quota-exceeded-hits-429`
- `generation-limited-rejected`
- `readonly-write-rejected`
- `admin-status-shows-backend-and-usage`

这些场景对应当前公开前最关键的验证矩阵：注册模式、邮箱验证、Origin、防刷限流、daily quota、账号状态和运行状态可见性。

## 3. 执行前准备

至少准备以下前提：

- 目标服务可访问：
  - 本地通常是 `http://127.0.0.1:3000`
- 与服务端允许域一致的 `Origin`
- 若要执行登录态场景，需要真实登录后拿到 cookie
- 若要执行 `invite_only` 成功场景，需要有效邀请码；推荐从 `/admin/invites` 生成
- 若要切换目标环境注册模式，推荐从 `/admin/invites` 的“注册模式”面板操作；后台配置不可用时再使用 `REGISTRATION_MODE` 环境变量兜底
- 若要执行 `signup-ip-rate-limit-hits-429`，当前推荐在 `invite_only` 模式下执行，避免 `open` 模式真实造号
- 若要执行 `generation_limited` / `readonly` / `daily quota` 场景，需要专门准备对应测试账号
- 若要执行 `admin-status-shows-backend-and-usage`，需要管理员 cookie
- 若要演练高成本紧急关闭，需要管理员先在 `/admin` 关闭对应 capability，验证完成后立即恢复

注意：

- 仓库不保存真实 cookie、邀请码或环境凭据
- 缺少前提时，runner 应输出 `blocked`，这是正常结果，不应伪装成已验证通过

## 4. 配置方式

推荐从 sample 复制一份本地配置，不直接改 sample：

```bash
Copy-Item scripts/load-samples/public-registration-http-baseline.sample.json tmp/public-registration-http-baseline.local.json
```

然后把这些字段替换成真实值：

- `baseUrl`
- `origin`
- `expectedRegistrationMode`
- `inviteCode`
- `verifiedCookie`
- `unverifiedCookie`
- `generationLimitedCookie`
- `readonlyCookie`
- `quotaExceededCookie`
- `adminCookie`
- `ipLimitCookies`
- `outputPath`

`ipLimitCookies` 说明：

- 使用 `cookie-a|||cookie-b|||cookie-c` 这种格式
- 至少提供 3 个不同账号 cookie，避免先打到单用户限流而不是 IP 限流

## 5. 推荐执行顺序

先做 dry-run：

```bash
pnpm run load:public-registration-baseline --dry-run --config-file=tmp/public-registration-http-baseline.local.json
```

确认：

- `baseUrl` 正确
- `origin` 正确
- 敏感 cookie 已显示为 `[provided]`
- `outputPath` 指向你准备留证的位置

然后执行全量：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json
```

如果只想补跑某一项：

```bash
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=admin-status-shows-backend-and-usage
```

## 6. 结果如何判断

### 什么算当前“足够放行”

对最近这几轮公网开放前防护来说，baseline 结果要分成两层看：

- 第一层是“可给小范围真实用户开放”：
  `registration-mode-visible`、注册模式对应场景、`signup-ip-rate-limit-hits-429`、`unverified-app-redirects-to-verify-email` 或 `unverified-api-rejected`、`origin-mismatch-rejected`、`practice-generate-normal`、`user-rate-limit-hits-429`、`ip-rate-limit-hits-429`、`admin-status-shows-backend-and-usage` 不应是 `blocked` 或 `failed`。
- 第二层是“可继续发到不可控渠道”：
  除了第一层，还应补齐 `daily-quota-exceeded-hits-429`、`generation-limited-rejected`、`readonly-write-rejected`，并确认 `/admin/users` 处置演练和 `/admin` 高成本紧急关闭演练已完成。

如果第一层里还有 `blocked`，不要把它理解成“只是缺少测试数据”。这通常意味着目标环境还不具备可放行证据。

### `passed`

表示该场景按当前预期完成，例如：

- `closed` 注册返回 401
- `signup-ip-rate-limit-hits-429` 在短窗口内出现 429
- 未验证邮箱访问主应用被重定向到 `/verify-email`
- `daily quota` 返回 429 且 `code=DAILY_QUOTA_EXCEEDED`
- `/api/admin/status` 返回 `rateLimitBackend.kind` 和 `todayHighCostUsage.items`

### `blocked`

表示没有足够前提执行，不代表失败，也不代表通过。

常见原因：

- 缺少 cookie
- 缺少邀请码
- `expectedRegistrationMode` 与当前目标环境不匹配
- 没有准备 3 个不同账号 cookie 去验证 IP 限流
- 当前目标环境不是 `invite_only`，但又想安全验证注册 IP 频控

额外判断：

- `signup-ip-rate-limit-hits-429` 在 `open` 模式下被主动标记为 `blocked`，通常是合理的保护动作，因为不能为了验频控去真实造号。
- 这种情况下，应在 `invite_only` 的目标环境、预发环境，或可清理测试账号的等价环境补跑，而不是把 `blocked` 当作通过。

blocked 之后必须在 `docs/dev/dev-log.md` 记录：

- 哪个场景 blocked
- 为什么 blocked
- 后续在哪个环境补跑

### `failed`

表示场景真正没有达到预期，例如：

- `Origin` 不匹配却没有返回 403
- 同一 IP 连续注册没有命中 429
- 同一用户短窗口没有命中 429
- `readonly` 用户仍可写入
- admin status 缺少 `todayHighCostUsage.items`

failed 之后先查：

- `/admin/invites` 显示的注册模式是否符合预期；若依赖环境变量兜底，再检查环境变量是否正确
- 目标账号状态是否真的已设置
- 目标环境是否真的应用了最新 SQL / 最新代码
- `requestId` 与相关服务端日志

## 7. 结果留证要求

runner 输出的 JSON 是原始证据，建议保留在本地临时目录，例如：

- `tmp/public-registration-http-baseline.json`

完成态记录写到 `docs/dev/dev-log.md` 时，至少写：

- 执行命令
- 目标环境
- `expectedRegistrationMode`
- `rateLimitBackend.kind`
- 通过的关键场景
- blocked / failed 的场景
- 是否已确认 `rateLimitBackend.kind`
- 是否仍需真实 Supabase / Upstash / 目标域名环境补跑

不需要把完整 JSON 全贴进 dev-log，但要保留文件路径或关键摘要。

## 8. 常见问题

### 为什么 dry-run 看起来“cookie 已提供”，但没有显示真实内容？

这是刻意做的脱敏预览，避免在终端或日志里暴露真实 cookie。

### 为什么我执行全量时很多场景是 blocked？

这是因为 runner 不会替你自动登录或自动建号。邀请码推荐先在 `/admin/invites` 生成；只要缺少前提，就应明确 blocked，而不是静默跳过。

### 为什么 `ip-rate-limit-hits-429` 要至少 3 个 cookie？

因为需要尽量避开先触发单用户限流，才能更可信地验证同一 IP 多账号限流。

### 为什么这份手册不直接教我如何从浏览器复制 cookie？

因为不同环境、浏览器和登录方式差异很大，这里只固定 runner 的输入契约，不把手册扩展成环境编排文档。

## 9. 最小命令汇总

```bash
node --import tsx --test scripts/load-public-registration-http-baseline.test.ts
pnpm run load:public-registration-baseline --dry-run --config-file=scripts/load-samples/public-registration-http-baseline.sample.json
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=registration-mode-visible
pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=signup-ip-rate-limit-hits-429
```
