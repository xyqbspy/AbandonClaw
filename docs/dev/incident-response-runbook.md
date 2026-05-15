# 平台层防护与事故响应手册

本文档回答两个问题：

> 1. 公开开放前应该启用哪些平台层防护（WAF / Bot / Rate limit）？
> 2. 发现异常流量时怎么在腾讯云 / Cloudflare 后台快速止损？

它是 `release-readiness-assessment.md` P2-3 的具体落地，覆盖应用层限流之外的网络层防护。

## 1. 当前部署架构

应用部署架构（主线）：

- **入口**：用户域名（已 ICP 备案）→ Cloudflare（如启用前置）→ 腾讯云 CVM。
- **接入层**：Nginx 反向代理（HTTPS / HSTS / 基础 rate limit），监听 80/443 端口。
- **进程管理**：PM2（`ecosystem.config.js`）启动 `npm start`，自动重启与 log rotate。
- **应用层**：Next.js 16 SSR + serverless API routes + middleware。
- **数据**：Supabase（PostgreSQL + Auth + Storage），通过 HTTPS REST/Realtime API 跨网络访问。
- **限流**：Upstash Redis（应用层 user/IP 维度）+ in-memory fallback。
- **错误追踪**：Sentry。

> 备用 / 历史环境：项目曾经使用过 Vercel（`*.vercel.app` 域名），相关说明见 `docs/dev/public-registration-http-baseline-runbook.md`。当前公网生产部署以腾讯云为主。

**当前裸点**：

- Nginx 默认配置只防最基础的攻击；rate limit、connection limit、bot blocking 都需手工开启。
- 腾讯云 Web 应用防火墙（WAF）和 DDoS 高防（BGP/海外 / 海外 IP 高防包）默认未启用。
- 应用层限流是「按规矩进来的请求」级防护，挡不住 SYN flood、HTTP flood 这类网络层攻击。
- 没有第三方 CDN 或 WAF 前置（Cloudflare 是可选）。

## 2. 推荐启用顺序

### 2.1 第一层：Nginx 反向代理基础防护（必做）

腾讯云 CVM 上 Nginx 配置示例（`/etc/nginx/conf.d/abandonclaw.conf`）：

```nginx
# 限流定义放在 http 块（如 nginx.conf）：
# limit_req_zone $binary_remote_addr zone=api_general:10m rate=60r/m;
# limit_req_zone $binary_remote_addr zone=api_signup:10m rate=5r/10m;
# limit_req_zone $binary_remote_addr zone=api_high_cost:10m rate=20r/m;
# limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

server {
    listen 443 ssl http2;
    server_name your-domain.example.com;

    ssl_certificate     /etc/nginx/ssl/your-domain.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 客户端最大请求体（与 next.config 一致或更小）
    client_max_body_size 2m;
    client_body_timeout 30s;
    keepalive_timeout 30s;

    # 同 IP 并发连接上限（防 SYN 半连接占用）
    limit_conn conn_per_ip 50;

    # 全站基础限流
    limit_req zone=api_general burst=30 nodelay;

    # 注册接口更严格
    location = /api/auth/signup {
        limit_req zone=api_signup burst=2 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/conf.d/proxy_common.conf;
    }

    # 高成本接口
    location ~ ^/api/(practice|tts|scenes/generate|expression-map|explain-selection)/ {
        limit_req zone=api_high_cost burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/conf.d/proxy_common.conf;
    }

    # 默认转发到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/conf.d/proxy_common.conf;
    }

    # 限流命中返回受控 429（与应用层一致）
    error_page 503 = @ratelimit;
    location @ratelimit {
        return 429 '{"error":"Too many requests.","code":"RATE_LIMITED","details":null}';
        default_type application/json;
    }
}
```

`proxy_common.conf` 示例：

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Request-Id $request_id;
proxy_read_timeout 60s;
proxy_send_timeout 60s;
proxy_buffering off;
```

注意：`X-Forwarded-For` 头会被 `src/lib/server/rate-limit.ts` 的 `getClientIp` 读取作为客户端 IP，必须由 Nginx 注入。

**验收**：

- [ ] Nginx 配置文件已部署并 `nginx -t` 通过。
- [ ] HTTPS 证书有效，HSTS 头生效。
- [ ] `limit_req` 规则覆盖 `/api/auth/signup` 与高成本接口。
- [ ] `X-Forwarded-For` 正确传递到应用层。
- [ ] 触发限流时返回 429 而非 502/503。

### 2.2 第二层：腾讯云 WAF / DDoS 高防（公开开放强烈建议）

**启用步骤**：

1. **Web 应用防火墙（WAF）**：
   - 腾讯云控制台 → Web 应用防火墙 → SaaS 版（按域名计费）或独享版。
   - 配置防护域名指向 CVM 公网 IP。
   - 启用「基础防护规则」（SQL 注入 / XSS / 命令执行）。
   - 启用「自定义规则」：对 `/api/auth/signup` / `/api/practice/generate` 等高风险路径加 IP 频控规则。
   - 启用「Bot 管理」（识别 curl / 已知爬虫 UA）。
2. **DDoS 高防**：
   - 如果用户量预期可能被攻击：开通「DDoS 基础防护」（CVM 自带，免费）。
   - 公网开放后被攻击过：购买「DDoS 高防 IP」或「DDoS 高防包」，把流量先打到高防节点再回源。
3. **告警接入**：
   - 控制台 → 监控告警 → 告警策略 → 把 WAF 拦截事件 / DDoS 攻击事件接入企微 / 钉钉 / 邮箱。

**验收**：

- [ ] 腾讯云 WAF 已启用并接入域名。
- [ ] 至少配置 1 条 IP 频控自定义规则。
- [ ] DDoS 基础防护开启（或购买了高防包）。
- [ ] 告警接入 oncall 渠道。

### 2.3 第三层（可选）：Cloudflare 前置

**适用场景**：

- 用户基数预计超过 1000 / 月活。
- 已经被脚本攻击过一次。
- 需要更细粒度的 Bot Fight Mode（腾讯云 WAF 与 Cloudflare 各有所长，可叠加）。

**启用步骤**：

1. 把域名 DNS NS 切到 Cloudflare（免费版）。
2. Cloudflare 后台 → SSL/TLS → 设为 Full (strict)。
3. Security → Bot Fight Mode → ON。
4. Security → Settings → Security Level → High。
5. Rules → Rate Limiting Rules（与 Nginx 层叠加，更严格）。
6. Rules → Page Rules：排除 `/_next/static/*`。
7. Origin 回源到腾讯云 CVM 公网 IP（建议 Cloudflare → CVM 加白名单只允许 Cloudflare IP）。

**验收**：

- [ ] Cloudflare 前置完成（DNS NS 已切）。
- [ ] Bot Fight Mode 启用。
- [ ] CVM Nginx 层加 Cloudflare IP 白名单（避免被绕过 Cloudflare 直连）。
- [ ] Analytics 能看到 24 小时安全事件。

### 2.4 第四层：Upstash Redis 应用层增强（已落地）

应用层限流当前在 `src/lib/server/rate-limit.ts` 已用 Upstash。可以补：

- 注册接口加更严格的 IP rate limit（已有 `enforceRegistrationIpRateLimit`，确认阈值与 Nginx 层一致）。
- 高成本接口 IP 维度上限可比 user 维度更严（例如 user limit 5/min，IP limit 8/min）。

## 3. 异常流量识别

### 3.1 关键指标

| 指标 | 正常范围 | 异常阈值 | 看哪里 |
| --- | --- | --- | --- |
| 5xx 错误率 | < 0.5% | > 2% 持续 5 分钟 | Sentry |
| 429 限流命中 | < 5% | > 20% 持续 5 分钟 | Sentry / PM2 logs |
| `/api/auth/signup` 调用频率 | < 10/分钟 | > 100/分钟 | Nginx access log / 腾讯云 WAF |
| `/api/practice/generate` 调用频率 | < 50/分钟 | > 200/分钟 | Nginx access log / 腾讯云 WAF |
| 同一 IP 请求频率 | < 30/分钟 | > 100/分钟 | Nginx access log / Cloudflare |
| GLM 账单日消耗 | 按计划 | 超出预算 1.5x | GLM provider 后台 |

### 3.2 告警来源

按上线优先级：

1. **Sentry 告警**：5xx 异常聚合（已在 P1-1 配置入口）。
2. **腾讯云监控告警**：WAF 拦截事件、DDoS 攻击事件、CVM CPU / 内存 / 带宽超阈值。
3. **Cloudflare Notifications**（如启用）：DDoS attack detected、firewall events spike。
4. **Supabase 告警**：connection 池占满、CPU 高负载、storage 接近上限。
5. **GLM provider 账单告警**：日消耗超阈值。
6. **PM2 监控**：进程异常重启、CPU/内存持续高位（可选接 PM2 Plus 或自建监控）。

每个来源都应该至少接入一个 oncall 渠道（企微 / 钉钉 / 飞书 / 邮件 / 微信机器人）。

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

1. **立即**：腾讯云 WAF → 自定义规则 → 添加 IP 黑名单。
2. **或**：Nginx 配置加 `deny <ip>;` 后 `nginx -s reload`。
3. **或**（如启用 Cloudflare）Cloudflare → Security → Tools → IP Access Rules → block。
4. 把 `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 临时调低（修改 `.env.local` 或 PM2 ecosystem env，然后 `pm2 reload abandonclaw`）。
5. 在 `/admin/users` 找到该 IP 创建的所有账号，批量设为 `disabled`。
6. dev-log 记录事件。

### 4.3 全站流量异常

**症状**：

- Sentry 5xx 错误率突增到 > 5%。
- CVM CPU / 带宽持续高位告警。
- Supabase connection 池接近占满。

**响应**：

1. **立即**：在 `/admin/invites` 把注册模式切到 `closed`。
2. **立即**：在 `/admin` 临时关闭 `practice_generate` / `scene_generate` / `tts_generate` / `tts_regenerate` 等高成本 capability。
3. **立即**：腾讯云 WAF 启用「人机识别」全局模式；如未启用 WAF，Nginx 临时降低 `limit_req` 的 rate（reload 后生效）。
4. **立即**（如启用 Cloudflare）：Cloudflare → Security → "I'm Under Attack" mode → ON。
5. 评估是否需要回滚最近一次部署：
   - `git checkout <stable-tag>`
   - `pnpm install --frozen-lockfile && pnpm run build`
   - `pm2 reload abandonclaw`
6. 评估 Supabase 是否需要扩容（升级 Pro / Team 计划）。
7. 评估 CVM 是否需要临时升配（腾讯云控制台一键升配，或开通弹性公网带宽）。
8. 异常稳定后逐步恢复：先开 closed → invite_only，再恢复 capability，最后关闭 WAF 严格模式。
9. 24 小时内补 post-mortem `docs/dev/incidents/YYYY-MM-DD-<title>.md`。

### 4.4 GLM 账单暴涨

**症状**：

- GLM provider 日账单超预算。
- `/admin/status` `todayHighCostUsage.items` 显示某 capability `success_count` 异常高。

**响应**：

1. **立即**：在 `/admin` 临时关闭涉事 capability（quota 预占前会被拒绝）。
2. 检查是否单用户刷数 → 走 4.1 流程。
3. 检查是否 IP 多账号 → 走 4.2 流程。
4. 检查是否全站异常 → 走 4.3 流程。
5. 评估临时把 `DAILY_QUOTA_*` 调低（修改 PM2 ecosystem env 后 `pm2 reload abandonclaw`）。
6. dev-log 记录事件 + 实际 GLM 消耗 + 处置方案。

## 5. 预防性日常巡检

### 5.1 每周

- [ ] Sentry：浏览本周新增 issue，标记 resolved / ignored。
- [ ] 腾讯云监控：检查 CVM CPU / 带宽 / 内存趋势；检查 WAF 拦截事件。
- [ ] `/admin/status`：检查 todayHighCostUsage 是否异常。
- [ ] Supabase：检查 storage / connections / CPU 趋势。
- [ ] PM2：`pm2 status` 确认进程健康，`pm2 logs --lines 200` 抽查异常。

### 5.2 每月

- [ ] GLM provider 后台：核对账单与预算。
- [ ] 腾讯云 WAF：导出本月安全事件统计。
- [ ] Cloudflare（如启用）：导出本月安全事件统计。
- [ ] 检查 `access_status=generation_limited` / `disabled` 用户列表，决定是否解除。
- [ ] 检查 `learning_study_time_anomalies` 表，确认前端上报上限挡板有效。
- [ ] CVM 系统补丁：`apt update && apt upgrade -y`（在维护窗口）。

### 5.3 每季度

- [ ] 灾备演练（按 `disaster-recovery.md` 第 5 节）。
- [ ] 评估 Supabase / Upstash / GLM / Sentry / 腾讯云 计划与用量是否需要调整。
- [ ] 评估应急联系人是否变更（更新 `disaster-recovery.md` 第 6 节）。
- [ ] SSL 证书到期时间检查（如果手工管理而非 Let's Encrypt 自动续签）。

## 6. 不解决的事情

- 不替代腾讯云 / Cloudflare 平台层 DDoS 防护：只在他们之上做配置。
- 不引入第三方 WAF（如 Sucuri / Imperva）：成本与目标不匹配，等公开开放规模真正起来再评估。
- 不引入设备指纹 / 用户行为模型：见 `public-registration-readiness-plan.md` P2.2 全局风控。
- 不替代腾讯云 ICP 备案 / 内容安全合规：法律侧由用户负责。

## 7. 待用户首次执行

第一次准备公开开放前，必须：

- [ ] Nginx 反向代理配置部署并验证（按第 2.1 节示例）。
- [ ] 腾讯云域名 ICP 备案完成。
- [ ] HTTPS 证书申请（Let's Encrypt 或腾讯云 SSL）。
- [ ] 启用腾讯云 WAF 并配置基础规则。
- [ ] 评估是否前置 Cloudflare（用户量 > 1000/月或第一次被攻击后强烈推荐）。
- [ ] 配置 Sentry / 腾讯云监控 / Supabase / Cloudflare 告警接入 oncall 渠道。
- [ ] 演练一次「单账号刷接口」处置流程（用测试账号）。
- [ ] 演练一次「全站异常」紧急关闭流程（在 staging）。
- [ ] 在第 5 节巡检清单中确定执行人与频率。

## 8. 相关文档

- `docs/dev/release-readiness-assessment.md` P2-3
- `docs/dev/disaster-recovery.md`
- `docs/dev/public-registration-readiness-plan.md` 第 9 节攻击发生时最小处置流程
- `docs/dev/docs-audit-2026-05-15.md` 部署平台对应翻译表
- `openspec/specs/api-operational-guardrails/spec.md`
