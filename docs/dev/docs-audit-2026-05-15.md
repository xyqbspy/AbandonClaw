# 文档与 OpenSpec 关联性 / 冲突 audit（2026-05-15）

本文档回答一个问题：

> 项目所有文档（AGENTS.md / docs/ / openspec/ / dev-log）当前在路径、命名、关联、需求覆盖上有哪些不一致或缺口？

它是 release-readiness-assessment.md / disaster-recovery.md / incident-response-runbook.md 三份新文档落地后的一次性盘点，目的是让后续维护者能在单一文档看到所有冲突项与处置结论。

## 1. 部署平台冲突（高优先级）

### 1.1 当前真相

- **实际生产部署**：腾讯云（self-hosted VPS / 容器），通过 `ecosystem.config.js` 用 PM2 启动 `npm start`。
- **后端**：Supabase（PostgreSQL + Auth + Storage + Edge Functions 不使用）。
- **历史曾经使用过**：`*.vercel.app` 域名（见 `docs/dev/dev-log.md` 2026-05-13 baseline 验证记录）。当前已不再是主部署。

### 1.2 文档与现实的差距

| 文档 | 错位点 | 数量 |
| --- | --- | --- |
| `docs/dev/release-readiness-assessment.md` | 14 处 Vercel 假设（rotate 步骤 / Vercel project env / Vercel Observability / Vercel Firewall） | 高 |
| `docs/dev/disaster-recovery.md` | 4 处 Vercel 假设（事故响应 / 应急联系人模板） | 中 |
| `docs/dev/incident-response-runbook.md` | 12 处 Vercel 假设 + 全篇默认架构 | 高 |
| `docs/dev/dev-log.md`（本周新增条目） | 5+ 处「Vercel project env」「Vercel logs」 | 中 |
| `openspec/changes/archive/2026-05-15-add-sentry-error-tracking/`（proposal/design） | 「Vercel project env 配置 DSN」「Vercel raw logs」 | 中 |
| `docs/dev/public-registration-http-baseline-runbook.md` | Vercel 部署专项说明（如何看 deployment URL） | 低（保留：Vercel 仍可作为预发或备用环境） |

### 1.3 处置原则

- **新文档（本周三份）**：把 Vercel 改为「腾讯云（PM2）+ Supabase」主线，把 Vercel 降级为「可选 / 备用环境」。
- **已归档的 OpenSpec change**：按 OpenSpec workflow 「archive 后不修内容」原则不动；冲突由本 audit 兜底说明。
- **历史 dev-log 条目**：保留原始记录，不做事后改写；后续条目用新的部署描述。
- **public-registration-http-baseline-runbook.md**：保留 Vercel 章节作为「可选环境提示」，不删。

### 1.4 平台对应翻译表

| Vercel 假设 | 腾讯云对应 |
| --- | --- |
| Vercel project env（Settings → Environment Variables） | 服务器 `.env.local` 或环境变量管理工具（PM2 ecosystem env / systemd EnvironmentFile / 1Password Connect 等） |
| Vercel raw logs / Vercel Observability | 服务器日志（PM2 logs / journalctl / 自建 ELK） + Sentry |
| Vercel Firewall | Nginx 层限流 + iptables / fail2ban + 腾讯云 Web 应用防火墙（WAF）+ 腾讯云 DDoS 高防 |
| Vercel Notifications | 自建告警（PM2 webhook / Sentry / Supabase webhook） |
| Vercel Edge Network | Nginx 反向代理 + 腾讯云 CDN（如启用） |
| Vercel Attack Challenge Mode | Cloudflare（前置）或腾讯云 WAF 的「人机识别」 |
| `vercel rollback` | PM2 指向旧 build 目录 + reload，或 git checkout 上一个 tag 后 `pnpm run build && pm2 reload abandonclaw` |
| `*.vercel.app` 域名 | 用户自有域名（已 ICP 备案） |

## 2. 路径死链（中优先级）

### 2.1 现状

仓库中 200+ 处文档使用 `[xxx](/d:/WorkCode/AbandonClaw/path/to/file.md)` 这种 absolute path 引用。这是从原工作目录 `D:\WorkCode\AbandonClaw\` 复制过来的旧路径，当前工作目录是 `C:\Users\xyqbspy\Desktop\文件\abandon-en\`，所有这些链接在新仓库下都是死链。

### 2.2 处置原则

- **历史 dev-log 条目**：不动，按 AGENTS.md「不顺手改无关代码」原则保留。
- **新文档**：用相对路径或纯文件名引用（例如 `[xxx](./public-registration-http-baseline-runbook.md)` 或 `公网开放 baseline runbook`）。
- **首要 stable 文档**（AGENTS.md / docs/README.md / docs/dev/README.md / 各 spec）：检查并修正路径（如确认存在错误才改）。

### 2.3 命名一致性附带问题

- `package.json` 项目名：`abandon-en`
- 各文档与 README 标题：`AbandonClaw`
- 这是历史 rename 残留。**不在本次范围**，留给单独的 cleanup change 处理。

## 3. 文档命名错位（低优先级）

### 3.1 incident-runbook vs incident-response-runbook

- `release-readiness-assessment.md` 第 498 行验收项写「事故响应剧本已写入 `docs/dev/incident-runbook.md`」
- 实际文件名：`docs/dev/incident-response-runbook.md`
- 已在「完成摘要」段落说明，但**该不一致仍存在**。

### 3.2 处置

- 把 release-readiness-assessment.md 验收项的引用名改为正确的 `docs/dev/incident-response-runbook.md`。
- 完成摘要中的解释文字一并简化。

## 4. 文档关联缺失（中优先级）

### 4.1 入口文档未引用本周新增 3 文档

- `docs/README.md` 高频问题入口表：未列「上线准备 / 事故响应 / 灾备」。
- `AGENTS.md` 第 4 节文档阅读入口：未提及新增文档。
- `docs/dev/README.md`：已加 release-readiness-assessment / disaster-recovery / incident-response-runbook，OK。

### 4.2 处置

- 在 `docs/README.md` 高频问题入口表新增 3 行（上线准备 / 事故响应 / 灾备）。
- AGENTS.md 不动（按其本意「只保留强约束和任务分流」，详细阅读入口由 `docs/dev/README.md` 承接，已经覆盖）。

## 5. CI 工作流隐含假设（中优先级）

### 5.1 现状

- `.github/workflows/ci.yml` 假设代码托管在 GitHub。
- 如果用户实际把代码托管在腾讯云 Coding / Gitee / 自建 GitLab，GitHub Actions 不会触发。

### 5.2 处置

- 在 `release-readiness-assessment.md` P1-2 节加注释：「本工作流假设代码托管在 GitHub。如使用 Coding / Gitee / GitLab，需要把工作流移植到对应平台（pipeline syntax 类似但不完全兼容）」。
- 不删 ci.yml（如代码确实在 GitHub 镜像，仍可生效）。
- 在 `incident-response-runbook.md` 第 4 节自建 pg_dump backup 也补一个「腾讯云 cron + COS 上传」备选方案。

## 6. 需求覆盖缺口（低优先级）

腾讯云部署相关的运维细节当前文档完全没有覆盖：

| 缺口 | 影响 | 建议 |
| --- | --- | --- |
| Nginx 反向代理配置（HTTPS / HSTS / 限流 / WebSocket） | 上线时维护者需自己摸索 | 在 `incident-response-runbook.md` 加 Nginx 示例片段 |
| PM2 reload / restart / log rotate | 部署故障时无法快速恢复 | 在 `disaster-recovery.md` 加 PM2 章节 |
| 域名 ICP 备案 / SSL 证书申请 | 公网开放前必须 | 在 `release-readiness-assessment.md` 加合规备注 |
| 腾讯云 WAF / DDoS 高防接入 | P2-3 文档默认 Vercel/Cloudflare，缺腾讯云原生方案 | 在 `incident-response-runbook.md` 第 2 节补腾讯云原生选项 |
| Supabase 与腾讯云之间的网络连通性（IP 白名单 / RTT / connection pool 配置） | 高并发下连接池可能耗尽 | 在 `disaster-recovery.md` 加备注，详细方案留 P2 |
| 腾讯云 cos / cdn 静态资源回源 | 静态资源加载慢 | 暂不收（Next.js 自身 cdn 能力足够，腾讯云 CDN 可选） |

### 6.1 处置原则

- 本 audit 只补「上线必需」的最小说明（Nginx / PM2 / ICP / 腾讯云 WAF）。
- 详细 Nginx 配置 / 腾讯云 WAF 规则 / Supabase connection pool 调优等留给后续 OpenSpec change 推进。

## 7. 修复方案与优先级

| 优先级 | 动作 | 涉及文件 |
| --- | --- | --- |
| P0 | 部署平台主线改为腾讯云（PM2）+ Supabase；Vercel 降级为「可选/备用」 | release-readiness-assessment.md / disaster-recovery.md / incident-response-runbook.md / dev-log.md（本周条目） |
| P0 | 修 incident-runbook 命名错位 | release-readiness-assessment.md |
| P1 | docs/README.md 高频问题入口表新增 3 行 | docs/README.md |
| P1 | release-readiness-assessment P1-2 加 CI 假设说明 | release-readiness-assessment.md |
| P1 | incident-response-runbook 第 2 节补腾讯云 WAF / DDoS 高防选项 + Nginx 示例 | incident-response-runbook.md |
| P1 | disaster-recovery 加 PM2 reload + 腾讯云 cron + COS 备份示例 | disaster-recovery.md |
| P2 | release-readiness-assessment 加 ICP 备案 / SSL 合规说明 | release-readiness-assessment.md |
| 不收 | 历史 dev-log Vercel 提及与 absolute path 死链 | （不动） |
| 不收 | 已归档 OpenSpec change 内的 Vercel 提及 | （不动） |
| 不收 | abandon-en vs AbandonClaw 命名不一致 | 留单独 cleanup |
| 不收 | Nginx 完整配置 / Supabase pool 调优 | 留单独 OpenSpec change |

## 8. 修复后验证

- `pnpm run text:check-mojibake` 通过。
- `pnpm run maintenance:check` 通过（active changes 状态不变）。
- 全文搜索 `Vercel` 在 release-readiness-assessment.md / disaster-recovery.md / incident-response-runbook.md 中只剩「可选 / 备用环境」语义，主线全部为「腾讯云 + Supabase」。
- `incident-runbook.md` 引用全部修正为 `incident-response-runbook.md`。

## 9. 不修复但记录

以下问题已识别，本次不处置，留 audit 文档作为 future tracking：

- 200+ 处 `/d:/WorkCode/AbandonClaw/...` 死链路径在历史 dev-log / backend-release-readiness-checklist 中：保留作历史快照。
- `AbandonClaw` 与 `abandon-en` 命名分裂：留待项目正式 rename 时统一。
- `*.vercel.app` 域名在 `public-registration-http-baseline-runbook.md` 与 `dev-log.md` 中作为示例：保留作 baseline 工具兼容性示例。

## 10. 相关文档

- `AGENTS.md`
- `docs/README.md`
- `docs/dev/README.md`
- `docs/dev/release-readiness-assessment.md`
- `docs/dev/disaster-recovery.md`
- `docs/dev/incident-response-runbook.md`
- `docs/dev/dev-log.md`
- `openspec/specs/project-maintenance/spec.md`
