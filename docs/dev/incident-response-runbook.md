# 平台层防护与事故响应手册

本文档回答两个问题：

> 1. 公开开放前应该启用哪些平台层防护（WAF / Bot / Rate limit）？
> 2. 发现异常流量时怎么在 Vercel / Cloudflare 后台快速止损？

它是 `release-readiness-assessment.md` P2-3 的具体落地，覆盖应用层限流之外的网络层防护。

## 1. 当前部署架构

应用部署在 Vercel：

- 入口：Vercel Edge Network（自带基础 DDoS mitigation、TLS、HTTP/2）。
- 应用层：Next.js 16 SSR + serverless functions + middleware。
- 数据：Supabase（PostgreSQL + Auth + Storage）。
- 限流：Upstash Redis（应用层 user/IP 维度）+ in-memory fallback。
- 错误追踪：Sentry。

**当前裸点**：

- Vercel Firewall 默认只防最基础的攻击；Bot Fight Mode、Geo blocking、challenge mode 都需要手工启用。
- 应用层限流是「按规矩进来的请求」级防护，挡不住 SYN flood、HTTP flood 这类网络层攻击。
- 没有第三方 CDN 或 WAF 前置。

## 2. 推荐启用顺序

### 2.1 第一层：Vercel Firewall（免费版即可）

**启用步骤**：

1. Vercel project → Firewall → Enable。
2. 配置基础规则：
   - **IP Blocking**：黑名单已知恶意 IP（启动时为空，发现攻击后追加）。
   - **User Agent Blocking**：禁掉常见爬虫与扫描工具 UA（curl 默认、`python-requests`、`go-http-client` 等；要白名单合法 bot）。
   - **Path-based rules**：对 `/api/auth/signup`、`/api/practice/generate`、`/api/tts`、`/api/scenes/generate`、`/api/expression-map/generate` 启用 Challenge mode（人机验证）。
3. 启用 Vercel Attack Challenge Mode（出事时一键全站启用）。

**验收**：

- [ ] Vercel Firewall 已 Enable。
- [ ] 至少配置 1 条 IP 或 UA 黑名单规则。
- [ ] 高成本 API 路径配 Challenge mode。
- [ ] 知道事故时如何一键启用 Attack Challenge Mode。

### 2.2 第二层（推荐）：Cloudflare 前置

**适用场景**：

- 用户基数预计超过 1000 / 月活。
- 已经被脚本攻击过一次。
- 需要更细粒度的 rate limit / Bot Fight Mode。

**启用步骤**：

1. 把域名 DNS NS 切到 Cloudflare（免费版）。
2. Cloudflare 后台 → SSL/TLS → 设为 Full (strict)。
3. Security → Bot Fight Mode → ON。
4. Security → Settings → Security Level → High。
5. Rules → Rate Limiting Rules：
   - 全站：每 IP 每分钟 60 次请求 → challenge
   - `/api/auth/signup`：每 IP 每 10 分钟 5 次 → block
   - `/api/practice/generate` / `/api/tts` / `/api/scenes/generate`：每 IP 每分钟 20 次 → challenge
6. Rules → Page Rules：
   - 排除 `/_next/static/*` 不进 Bot Fight Mode（避免误拦静态资源）。
7. Analytics → Security → 检查未来 24 小时的 challenge / block 数据。

**验收**：

- [ ] Cloudflare 前置完成（DNS NS 已切）。
- [ ] Bot Fight Mode 启用。
- [ ] 至少 3 条 Rate Limiting Rules 生效。
- [ ] 静态资源被排除在 Bot Fight Mode 之外。
- [ ] Analytics 能看到 24 小时安全事件。

### 2.3 第三层（可选）：Upstash Redis 增强

应用层限流当前在 `src/lib/server/rate-limit.ts` 已用 Upstash。可以补：

- 注册接口加更严格的 IP rate limit（已有 `enforceRegistrationIpRateLimit`，确认阈值与 Cloudflare 层一致）。
- 高成本接口 IP 维度上限可以比 user 维度更严（例如 user limit 5/min，IP limit 8/min）。

## 3. 异常流量识别

### 3.1 关键指标

| 指标 | 正常范围 | 异常阈值 | 看哪里 |
| --- | --- | --- | --- |
| 5xx 错误率 | < 0.5% | > 2% 持续 5 分钟 | Sentry |
| 429 限流命中 | < 5% | > 20% 持续 5 分钟 | Sentry / Vercel logs |
| `/api/auth/signup` 调用频率 | < 10/分钟 | > 100/分钟 | Vercel Analytics |
| `/api/practice/generate` 调用频率 | < 50/分钟 | > 200/分钟 | Vercel Analytics |
| 同一 IP 请求频率 | < 30/分钟 | > 100/分钟 | Cloudflare Analytics |
| GLM 账单日消耗 | 按计划 | 超出预算 1.5x | GLM provider 后台 |

### 3.2 告警来源

按上线优先级：

1. **Sentry 告警**：5xx 异常聚合（已在 P1-1 配置入口）。
2. **Vercel Notifications**：deployment 失败、function timeout、bandwidth 超限。
3. **Cloudflare Notifications**（如启用）：DDoS attack detected、firewall events spike。
4. **Supabase 告警**：connection 池占满、CPU 高负载、storage 接近上限。
5. **GLM provider 账单告警**：日消耗超阈值。

每个来源都应该至少接入一个 oncall 渠道（Slack / 邮箱 / 微信机器人）。

## 4. 事故响应剧本

### 4.1 单账号刷接口

**症状**：

- Sentry 显示某个 user 的 5xx / 429 异常聚集。
- `/admin/observability` 该用户高成本调用激增。

**响应**：

1. 在 `/admin/users` 把该用户 `access_status` 设为 `generation_limited`。
2. 在 dev-log 记录事件、用户 ID（脱敏）、时间窗口、影响。
3. 24 小时后评估是否解除（`active`）或永久封禁（`disabled`）。

### 4.2 单 IP 多账号攻击

**症状**：

- 同 IP 频繁注册（已被 `enforceRegistrationIpRateLimit` 挡住但仍持续）。
- 多个新账号集中在该 IP 调用高成本接口。

**响应**：

1. （如启用 Cloudflare）Cloudflare → Security → Tools → IP Access Rules → block 该 IP / IP 段。
2. （或在 Vercel Firewall）Add IP Blocking Rule → block 该 IP。
3. 把 `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 临时调低（通过 env 变量），重新部署。
4. 在 `/admin/users` 找到该 IP 创建的所有账号，批量设为 `disabled`。
5. dev-log 记录事件。

### 4.3 全站流量异常

**症状**：

- Sentry 5xx 错误率突增到 > 5%。
- Vercel function invocation 超出 plan 限额警告。
- Supabase connection 池接近占满。

**响应**：

1. **立即**：在 `/admin/invites` 把注册模式切到 `closed`。
2. **立即**：在 `/admin` 临时关闭 `practice_generate` / `scene_generate` / `tts_generate` / `tts_regenerate` 等高成本 capability。
3. **立即**（如启用 Cloudflare）：Cloudflare → Security → "I'm Under Attack" mode → ON。
4. **立即**（Vercel）：启用 Vercel Attack Challenge Mode。
5. 评估是否需要回滚最近一次部署（`vercel rollback`）。
6. 评估 Supabase 是否需要扩容（升级 Pro / Team 计划）。
7. 异常稳定后逐步恢复：先开 closed → invite_only，再恢复 capability，最后关闭 Attack Mode。
8. 24 小时内补 post-mortem `docs/dev/incidents/YYYY-MM-DD-<title>.md`。

### 4.4 GLM 账单暴涨

**症状**：

- GLM provider 日账单超预算。
- `/admin/status` `todayHighCostUsage.items` 显示某 capability `success_count` 异常高。

**响应**：

1. **立即**：在 `/admin` 临时关闭涉事 capability（quota 预占前会被拒绝）。
2. 检查是否单用户刷数 → 走 4.1 流程。
3. 检查是否 IP 多账号 → 走 4.2 流程。
4. 检查是否全站异常 → 走 4.3 流程。
5. 评估临时把 `DAILY_QUOTA_*` 调低（env 变量 + 重新部署）。
6. dev-log 记录事件 + 实际 GLM 消耗 + 处置方案。

## 5. 预防性日常巡检

### 5.1 每周

- [ ] Sentry：浏览本周新增 issue，标记 resolved / ignored。
- [ ] Vercel Analytics：检查异常流量峰值。
- [ ] `/admin/status`：检查 todayHighCostUsage 是否异常。
- [ ] Supabase：检查 storage / connections / CPU 趋势。

### 5.2 每月

- [ ] GLM provider 后台：核对账单与预算。
- [ ] Cloudflare（如启用）：导出本月安全事件统计。
- [ ] 检查 `access_status=generation_limited` / `disabled` 用户列表，决定是否解除。
- [ ] 检查 `learning_study_time_anomalies` 表，确认前端上报上限挡板有效。

### 5.3 每季度

- [ ] 灾备演练（按 `disaster-recovery.md` 第 5 节）。
- [ ] 评估 Supabase / Upstash / GLM / Sentry 计划与用量是否需要调整。
- [ ] 评估应急联系人是否变更（更新 `disaster-recovery.md` 第 6 节）。

## 6. 不解决的事情

- 不替代 Vercel / Cloudflare 平台层 DDoS 防护：只在他们之上做配置。
- 不引入第三方 WAF（如 Sucuri / Imperva）：成本与目标不匹配，等公开开放规模真正起来再评估。
- 不引入设备指纹 / 用户行为模型：见 `public-registration-readiness-plan.md` P2.2 全局风控。

## 7. 待用户首次执行

第一次准备公开开放前，必须：

- [ ] 启用 Vercel Firewall 并配置基础规则。
- [ ] 评估是否前置 Cloudflare（用户量 > 1000/月或第一次被攻击后强烈推荐）。
- [ ] 配置 Sentry / Vercel / Supabase / Cloudflare 告警接入 oncall 渠道。
- [ ] 演练一次「单账号刷接口」处置流程（用测试账号）。
- [ ] 演练一次「全站异常」紧急关闭流程（在 staging）。
- [ ] 在第 5 节巡检清单中确定执行人与频率。

## 8. 相关文档

- `docs/dev/release-readiness-assessment.md` P2-3
- `docs/dev/disaster-recovery.md`
- `docs/dev/public-registration-readiness-plan.md` 第 9 节攻击发生时最小处置流程
- `openspec/specs/api-operational-guardrails/spec.md`
