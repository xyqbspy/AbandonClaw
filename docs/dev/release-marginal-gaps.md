# 上线边际问题跟踪

本文档回答一个问题:

> 业务主流程已经跑通、`release-readiness-assessment.md` 的 P0 已视为闭环之后,还剩哪些"边际问题"值得做、按什么顺序做、做完解决了什么。

它不替代:

- `release-readiness-assessment.md`:平台运维层 P0/P1/P2 缺口的统一入口(主线作业)。
- `backend-release-readiness-checklist.md`:上线前逐项勾选清单。
- `incident-response-runbook.md`:事故响应剧本。
- `disaster-recovery.md`:灾备与数据恢复手册。

本文档的覆盖范围是:**主流程跑通之后,那些"不做也能上线、但不做迟早会咬人"的二阶问题**。每一项按 ROI(出事概率 × 影响 / 解决成本)排序,而不是按技术分类。

## 1. 整体结论

业务防护层 + 平台运维层 P0 都已视为闭环(`release-readiness-assessment.md` P0-1/P0-2/P0-3),代码侧已具备 `invite_only` 小范围放行能力。

剩余的边际问题分三档:

| 档位 | 含义 | 行动节奏 |
| --- | --- | --- |
| **M0** | 已经写好代码 / 文档,只差按一下开关。不按 = 已投入的工作量直接打水漂。 | 今天就做,总成本 ~30 分钟 |
| **M1** | 出事概率不高,但出一次就会从小事故被放大成大事故。 | 排进本周 |
| **M2** | 等业务触发(公开开放 / 引入积分 / 第一次被刷)再做,提前做 = 过度工程。 | 触发后再启动 |

外加一档:

| 档位 | 含义 |
| --- | --- |
| **盲点** | 不在原 release-readiness-assessment 清单里、但属于同一性质(让小事故放大成大事故)的隐性路径。 |

## 2. M0:今天就做

### M0-1:Sentry 配 DSN

**等级**:M0

**为什么必须做**

`release-readiness-assessment.md` P1-1 已经把 `@sentry/nextjs` 接入完成,`toApiErrorResponse` 对 5xx 自动 capture 并注入 requestId tag。但生产环境如果没有 `NEXT_PUBLIC_SENTRY_DSN`,SDK 是 no-op:**线上任何 5xx 都消失在日志里,只能等用户截图反馈**。已经写好的代码白嵌一遍,可观测性投入归零。

**怎么做**

1. Sentry 后台 → 创建 Next.js 项目 → 拿到 DSN。
2. 在生产 CVM `.env.local` / PM2 ecosystem env 加:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
   ```
3. `pm2 reload abandonclaw --update-env`。
4. 在 Sentry 后台手工触发一次测试错误(或访问 `/api/sentry-test` 如已加路由),确认事件带 `requestId` tag。
5. 配 1 条最小告警:5 分钟内同一错误 > 10 次 → 邮箱 / 企微机器人。
6. 在 `dev-log.md` 记一行接入时间 + Sentry 项目链接。

**解决了什么**

- 内测期任何 5xx 5 分钟内有信号,事故响应从"等用户反馈"降到分钟级。
- 用户报某个 requestId 出错,直接 Sentry 搜到完整 stack + 上下文。
- 已经写好的 SDK / breadcrumb / capture 链路真正生效。

**验收**

- [ ] 生产 env 包含 `NEXT_PUBLIC_SENTRY_DSN`。
- [ ] Sentry 后台收到至少一条测试错误,带 `requestId` tag。
- [ ] 至少 1 条告警规则配上并验证通道可达。
- [ ] dev-log 留痕。

**完成时间**:2026-05-19
**完成摘要**:代码侧 Sentry 接入已在 `release-readiness-assessment.md` P1-1 完成，本轮复核当前工作区 `.env.local` 未加载 `NEXT_PUBLIC_SENTRY_DSN`，仍需用户在生产环境配置 DSN、验证测试事件与告警通道；本项当前为外部后台 blocked，不在仓库内伪装勾完成。

### M0-2:GitHub branch protection

**等级**:M0

**为什么必须做**

P1-2 已经把 `.github/workflows/ci.yml` 提交,lint / mojibake / unit test / scripts test / openspec validate 全跑。但 GitHub Settings 没有 branch protection 规则,意味着:

- 任何人可以直接 push 到 main 绕过 CI。
- 误把会跑挂的代码合进 main 不会被拦。
- 已经写好的 CI 等于装饰品。

**怎么做**

1. GitHub repo Settings → Branches → Add branch protection rule。
2. Branch name pattern:`main`。
3. 勾选:
   - Require a pull request before merging
   - Require status checks to pass before merging
     - Required:`CI / check`
   - Require branches to be up to date before merging
   - (可选)Require linear history
4. 故意提一个会失败的 PR(改个测试断言),验证 CI 能拦住合并。
5. dev-log 记一行启用时间。

**解决了什么**

- 主分支被保护,CI 不通过的代码合不进去。
- 团队成员误推或 force push 被拦。
- 已经写好的 lint / mojibake / spec validate 真正起到 gate 作用。

**验收**

- [ ] main 分支有 branch protection 规则。
- [ ] 实际提一个会挂 CI 的 PR 验证被拦。
- [ ] dev-log 留痕。

**完成时间**:2026-05-19
**完成摘要**:`.github/workflows/ci.yml` 已存在，但当前环境无 GitHub CLI / 后台权限，无法直接验证 `main` 的 branch protection 规则与拦截效果；本项仍需用户在 GitHub Settings 后台执行并留痕。

### M0-3:摘掉 `maintenance:check` 的 `continue-on-error`

**等级**:M0

**为什么必须做**

`.github/workflows/ci.yml` 中 `maintenance:check` 这一步带了 `continue-on-error: true`,原因是预先存在的 OpenSpec change `stabilize-auth-session-p0-smoke` 6.5 是人工冒烟任务待外部执行,未归档前会 fail。这是临时绕开标记。

**结果**:CI 里 `maintenance:check` 现在等于装饰品 — 真出 maintenance 违规(spec 漂移 / 未归档 change 堆积)不会拦,本意被消解。

**怎么做**

1. 确认 `stabilize-auth-session-p0-smoke` 是否已具备归档条件(6.5 冒烟已执行)。
2. 如已具备,归档该 change:`openspec archive stabilize-auth-session-p0-smoke`。
3. 编辑 `.github/workflows/ci.yml`,删除 `maintenance:check` 那一步的 `continue-on-error: true`。
4. 本地跑 `pnpm run maintenance:check` 确认通过。
5. 提 PR 验证 CI 这一步真的能拦失败。
6. dev-log 记一行。

**解决了什么**

- CI 的 maintenance gate 恢复真实拦截能力。
- 后续 spec 漂移 / 未归档 change 堆积会被 CI 当场暴露。
- 避免"绿色 CI = 真通过"的错觉。

**验收**

- [ ] `stabilize-auth-session-p0-smoke` 已归档。
- [ ] `ci.yml` 中 `maintenance:check` 不再带 `continue-on-error`。
- [ ] 故意提一个会触发 maintenance 违规的 PR 验证被拦。
- [ ] dev-log 留痕。

**完成时间**:2026-05-19
**完成摘要**:`harden-tts-warmup-p0p1` 已归档到 `openspec/changes/archive/2026-05-16-harden-tts-warmup-p0p1/`(原 6.5 "不提交等审核" 在代码 `0edf0e7` 合入 main 后失效,文档同步在 `c7d4b60`)。归档后 `pnpm run maintenance:check` 中 `openspec validate --all --strict` 已通过,active changes 阻塞从 2 降到 1。剩余阻塞 `stabilize-auth-session-p0-smoke` 6.5 是人工冒烟登录,确属外部 blocked;用户完成该冒烟并归档后,即可摘掉 `.github/workflows/ci.yml` 中 `maintenance:check` 的 `continue-on-error`。

## 3. M1:本周排进

### M1-1:灾备演练一次

**等级**:M1

**为什么必须做**

P1-3 已经完成 `disaster-recovery.md`,包含备份策略对比 / RPO / RTO 目标 / 4 类事故响应步骤 / 单表恢复方法 / 自建 `pg_dump` 兜底示例 / 季度演练 checklist。

但**手册没演练过等于没有**:

- 写过 Supabase restore 步骤,和真在后台点过一次 restore 区别巨大。
- RPO/RTO 数字现在是纸面承诺(24h / 2h),没经过实测验证。
- 出事时第一次执行恢复脚本就是真事故现场,操作错或慢都是问题。

**怎么做**

按 `disaster-recovery.md` 第 8 节首次执行清单:

1. 在 Supabase staging 项目(或等价副本环境)模拟"误删一张测试表"事故。
2. 按手册第 4-5 节执行恢复:
   - 选择最近备份点 → 创建恢复任务 → 等待完成。
   - 单表恢复方法:导出备份 → 在新 schema 重建 → INSERT 回原表。
3. 记录实际 RTO(从"发现误删"到"业务恢复"的真实时长)。
4. 把实测 RTO 写回 `disaster-recovery.md`,替换纸面数字。
5. 演练中发现的卡点(权限不够 / CLI 没装 / 备份保留期不够等)在手册标注。
6. dev-log 留痕。

**解决了什么**

- 验证手册可执行,不是空中楼阁。
- 实测 RTO 替换纸面承诺,可以对用户透明。
- 演练发现的卡点提前修复,真出事故时不会重复踩。
- 团队至少一个人执行过完整流程。

**验收**

- [ ] 在 staging 或等价环境完成一次恢复演练。
- [ ] 实测 RTO 写回 `disaster-recovery.md`。
- [ ] 演练发现的问题(若有)在手册标注修复路径。
- [ ] dev-log 留演练时间、实际 RTO、发现的问题。

### M1-2:Nginx 加 `limit_req` / `limit_conn` 基础规则

**等级**:M1

**为什么必须做**

P2-3(WAF / 平台层防护)整体是"公开开放前必做",但其中**最便宜的一档 — Nginx 内置 `limit_req` + `limit_conn`** 不需要额外采购,几行配置就能挡 99% 的脚本流量。代价远低于"GLM 账单一晚被刷出 4 位数"。

应用层 Upstash 限流只能挡住"按规矩进来的请求",挡不住底层 SYN flood 或 HTTP flood;Nginx 这一层是第一道挡墙。即便不上腾讯云 WAF / Cloudflare,这一步也值得现在做。

**怎么做**

按 `incident-response-runbook.md` 第 2 节配置(以下是最小可用版):

1. 在 Nginx 配置文件 http 段加:
   ```nginx
   limit_req_zone $binary_remote_addr zone=global:10m rate=60r/m;
   limit_req_zone $binary_remote_addr zone=signup:10m rate=5r/10m;
   limit_req_zone $binary_remote_addr zone=high_cost:10m rate=20r/m;
   limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;
   ```
2. 在 server 段加:
   ```nginx
   limit_conn conn_per_ip 50;
   limit_req zone=global burst=20 nodelay;

   location /api/auth/signup {
     limit_req zone=signup burst=2 nodelay;
     proxy_pass http://127.0.0.1:3000;
   }

   location ~ ^/api/(practice/generate|tts) {
     limit_req zone=high_cost burst=5 nodelay;
     proxy_pass http://127.0.0.1:3000;
   }
   ```
3. `nginx -t && nginx -s reload`。
4. 用 `ab` / `wrk` 自测一次,确认超过阈值返回 503/429。
5. 在 `incident-response-runbook.md` 标注实际启用时间和阈值。
6. dev-log 留痕。

**解决了什么**

- 网络层裸奔状态结束,常见脚本攻击在到达应用前被挡。
- GLM / Supabase 不再被一次低成本攻击直接打爆账单或连接数。
- 异常流量在 Nginx access log 可见,排查链路完整。

**验收**

- [ ] Nginx 配置含 `limit_req_zone` + `limit_conn`。
- [ ] `nginx -t` 通过且已 reload。
- [ ] 自测超阈值返回受控 503/429。
- [ ] dev-log 留启用时间和阈值。

**仓库内已备料(2026-05-19)**:`deploy/nginx.example.conf` + `deploy/nginx.proxy_common.example.conf` + `deploy/README.md` 提供可直接 cp 的配置模板,含 80→443 redirect / SSL / 限流 zone 引导 / 与应用层一致的 429 返回 / 限流阈值调优表。部署时只需替换 server_name 与证书路径,无需现场拼配置。

## 4. M2:等触发再做

这些是「现在做 = 过度工程」的项,记录触发条件,业务到位再启动。

### M2-1:CSP 切 enforce

**等级**:M2 | **触发条件**:report-only 观察 1-2 周,违规清单稳定

**为什么不现在做**:P2-1 已经上 `Content-Security-Policy-Report-Only`,提前切 enforce 会误伤正常业务(尤其 inline script / eval / 外部资源)。需要观察 violation 清单稳定后再切。

**仓库内已备料(2026-05-19)**:`next.config.ts` 已重构为通过 `CSP_ENFORCE=true` env 切到正式 `Content-Security-Policy` header,否则保持 `Content-Security-Policy-Report-Only`(与现状一致)。CSP directives 抽到 `src/lib/server/csp.ts`,带 6 个单测。boot-check 的 `cspMode` 字段已对接同一 helper,口径不会漂移。**M2-1 触发时只需在生产 env 加 `CSP_ENFORCE=true` 然后 `pm2 reload`,不需要再改任何代码**。

**怎么做**:

1. 观察期内每周看一次 `/api/csp-report` 或 Sentry 收集的 violation。
2. 真实业务被误拦的源(如 GLM / Supabase / Resend 域名)显式加入 `connect-src`。
3. 确认 1 周内无新增正常业务违规后,把 header key 从 `Content-Security-Policy-Report-Only` 改成 `Content-Security-Policy`。
4. 评估去掉 `'unsafe-inline'` / `'unsafe-eval'`(需重构内联 script,工作量较大,可单独 change)。

**解决了什么**:XSS 攻击 payload 在浏览器层被拦截,Mozilla Observatory 评分从 D 提到 B+。

### M2-2:腾讯云 WAF / DDoS 高防接入

**等级**:M2 | **触发条件**:公开渠道发布 / 第一次被脚本扫描 / 用户量 > 100 日活

**为什么不现在做**:WAF 按域名计费,内测期 invite_only 不暴露在不可控公网,M1-2 的 Nginx 已能挡常见脚本流量。提前接入是为不存在的威胁付费。

**怎么做**:按 `incident-response-runbook.md` 第 2 节启用顺序:

1. 腾讯云控制台 → Web 应用防火墙 → SaaS 版接入域名。
2. 启用基础防护规则 + 自定义 IP 频控 + Bot 管理。
3. 异常流量告警接到 oncall(企微 / 钉钉 / 飞书 / 邮件)。
4. (可选)Cloudflare 前置:DNS NS 切 CF,启用 Bot Fight Mode + Rate Limiting。

**解决了什么**:网络层 + 应用层之间多一层防护,DDoS / Bot 流量在到达 Nginx 前被拦,异常告警可触达。

### M2-3:合规页律师审阅

**等级**:M2 | **触发条件**:公开渠道发布 / ICP 备案 / 应用商店审核 / 真实欧盟用户出现

**为什么不现在做**:P2-4 已经把 `/privacy` / `/terms` 占位结构 + 注册 consent checkbox 落地,条款内容标 `__待法律审阅__`。内测期对邀请熟人来说,占位条款 + 同意流程已经形成"明示告知"的最小法律依据。

**怎么做**:

1. 找律师审阅占位条款,补充实际:
   - 联系方式(运营 / 法务 / 投诉)。
   - 数据存储区域(Supabase 实际部署 region)。
   - 适用法律 / 仲裁机构。
   - 真实数据分享对象(Supabase / Resend / GLM provider / Sentry / 腾讯云)。
2. 如果面向欧盟,加 Cookie 同意 banner(cookieconsent 等开源方案)。
3. 网站底部"隐私政策""服务条款"链接保留,内容替换。
4. dev-log 记审阅时间 + 下次审阅提醒。

**解决了什么**:处置用户行为有法律依据;应用商店 / 域名 / 投诉时可提供合规材料;万一被诉有明确条款约束双方权责。

### M2-4:服务端学习 session heartbeat

**等级**:M2 | **触发条件**:引入排行榜 / 付费会员 / 积分 / 公开等级

**为什么不现在做**:`release-readiness-assessment.md` P2-2 已经说明:当前小范围内测不引入榜单 / 付费 / 积分 / 公开等级,前端 60s+10s 上限挡板 + `learning_study_time_anomalies` 异常表已经够防统计被污染。**提前做 = 过度工程,且需要数据库表 / 服务端状态机 / 历史数据迁移,工程量很大**。

**怎么做**:触发后单独走 OpenSpec change `add-server-side-learning-session-heartbeat`,推进 session 状态机 / `learning_sessions` 表 / 服务端按 heartbeat 累计 / 前端 delta 降级为辅助校验 / 历史数据迁移策略。

**解决了什么**:学习时长变成可信数据,可以做榜单 / 积分 / 奖励而不被刷。

### M2-5:chunks / scene-detail 二轮拆分

**等级**:M2 | **触发条件**:下次大改 chunks 主链路 / scene 详情页

**为什么不现在做**:`architecture-audit-2026-05-16.md` §2.3 / §2.4 已经把这两个文件列为 P0 架构债,但 chunks 第二轮拆分(`decompose-chunks-page-r2`)已落地一轮(2368 → 2125 行,-10.3%)。继续拆是纯代码债清理,**不影响上线、不影响用户、不影响功能**;独立做收益分散。

**怎么做**:等下次有 chunks 业务改动时,把第三轮拆分(chunks-list-view 868 / chunks-page-sheets 449)作为该 change 的前置;scene-detail 同理。

**解决了什么**:页面入口文件回归可维护尺寸,AI 协作和人维护成本下降。

## 5. 盲点:不在原清单、但同性质的隐性路径

这三项不在 `release-readiness-assessment.md` P0-P2 清单里,但属于"小事故放大成大事故"的常见路径,本质和 M0/M1 同一性质。

### 盲点-1:今日真实用量没有人在看

**等级**:M1

**为什么必须做**

`/admin/status` 现在能看 `todayHighCostUsage.items`,但**没人每天去看 = 等于没有**。`DAILY_QUOTA_*` 阈值是否设对、有没有用户接近用满、有没有异常账号在刷,这些信号现在埋在 `/admin/status` 里没出口。

**怎么做**

选一种最低成本路径:

- **路径 A(推荐)**:Sentry 配每日 0 点 digest,把 `todayHighCostUsage.items` 用 `Sentry.captureMessage('daily-usage-snapshot', { extra: usage })` 写入,Sentry 日报自动汇总。
- **路径 B**:写个 PM2 cron 任务每日 0 点把快照 append 到 `dev-log.md` 或专门的 `docs/dev/usage-log.md`。
- **路径 C**:`/admin` 加个"昨日用量"卡片,每次打开 admin 时一眼可见。

任选一种即可,关键是**信号离开 `/admin/status` 主动出口**。

当前仓库已补 `pnpm run usage:snapshot` 执行入口,会把 `todayHighCostUsage` 以稳定文本 + JSON 两种格式输出到 stdout,可供 PM2 cron 或手工执行接线;实际每日调度与首日快照仍待目标环境完成。

**解决了什么**

- 阈值是否合理 → 一周数据后心里有数。
- 异常账号刷 → 第一天就发现,而不是月底账单暴涨才反应过来。
- quota 接近用满的用户 → 提前调阈值或主动联系,而不是等用户报错。

**验收**

- [ ] 选定一种快照路径并落地。
- [ ] 实际产生过至少 1 天的快照数据。
- [ ] dev-log 留实施时间和路径选择。

### 盲点-2:启动时打印 boot 自检日志

**等级**:M0

**为什么必须做**

PM2 `reload` 后,如果某个 env 没生效(比如 `NEXT_PUBLIC_SENTRY_DSN` 漏配 / `UPSTASH_REDIS_REST_URL` 误删),服务能正常起来,但**核心防护静默降级**:

- Sentry no-op:5xx 不上报。
- Upstash 缺失:rate-limit 退回 memory backend(`/admin/status` 能看到,但没人看)。
- CSP 报错收集失败:violation 永远丢。

这些都是"服务起来了 = 一切正常"的错觉杀手。

**怎么做**

在 Next.js `instrumentation.ts` 或 `next.config.ts` 启动入口,加一段最小自检:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const checks = {
      sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      resend: Boolean(process.env.RESEND_API_KEY),
      registrationMode: process.env.REGISTRATION_MODE ?? 'unset',
      cspMode: process.env.CSP_ENFORCE === 'true' ? 'enforce' : 'report-only',
    };
    console.log('[boot]', JSON.stringify(checks));
  }
}
```

PM2 `pm2 logs abandonclaw` 第一行就能看到当前 env 是否齐全。任何关键开关被关掉一眼可见。

**解决了什么**

- 部署后第一时间看一行日志就能判断 env 是否漂移。
- 防护静默降级在分钟级被发现,而不是事故后才察觉。
- 几乎零成本(~10 行代码)。

**验收**

- [ ] `instrumentation.ts` 或等价入口包含 boot 自检日志。
- [ ] PM2 启动后 `pm2 logs` 第一行可见 `[boot]` 输出。
- [ ] dev-log 留实施时间。

**完成时间**:2026-05-19
**完成摘要**:已在 `instrumentation.ts` 接入 `[boot]` 自检日志，输出 `sentry/upstash/resend` 就绪状态以及 `registrationMode/cspMode`，不打印密钥值；同时新增 `src/lib/server/boot-check.ts` 与 `src/lib/server/boot-check.test.ts`，本地测试通过。当前环境无 PM2，因此 `pm2 logs` 首行验证仍待目标环境执行。

### 盲点-3:紧急开关演练一次

**等级**:M1

**为什么必须做**

`access_status=disabled / generation_limited / readonly` + `/admin` 高成本 capability 紧急开关 这些都已实现,但**没人按过真实按钮**。第一次按按钮是事故时,按错或不熟悉就是问题:

- 高成本 capability 关闭路径在 `/admin` 哪里、怎么操作、关闭后多久生效?
- 用户切 `disabled` 后再恢复,session 是否需要主动 sign-out?
- `/admin/invites` 切回 `closed` 后已注册用户是否受影响?

这些只有真演练过才有答案,事故时没空翻文档。

**怎么做**

1. 在测试账号上演练 5 个场景,各计时:
   - 把高成本 capability(`practice-generate` 或 `tts`)在 `/admin` 关闭 → 验证返回受控 429/503 → 恢复。
   - 把测试账号切 `generation_limited` → 验证不能调 AI/TTS → 恢复 `active`。
   - 把测试账号切 `readonly` → 验证不能写学习进度 → 恢复。
   - `/admin/invites` 切 `closed` → 验证无邀请码不能注册 → 恢复 `invite_only`。
   - 把测试账号切 `disabled` → 验证主应用被拒 → 恢复并确认是否需要清 session。
2. 每项记录:操作路径 / 生效时间 / 恢复操作 / 副作用。
3. 把演练结果写进 `incident-response-runbook.md` 第 4 节"4 类事故响应剧本"对应位置,作为操作手册补充。
4. dev-log 留演练时间和发现的问题。

**解决了什么**

- 紧急按钮从"理论存在"变成"团队会按"。
- 每个开关的生效时长有实测数字,事故时可预估恢复时间。
- 副作用(session 残留 / 缓存延迟)提前发现并在剧本中标注。

**验收**

- [ ] 5 个紧急开关均演练过。
- [ ] `incident-response-runbook.md` 第 4 节补充实操步骤和生效时长。
- [ ] dev-log 留演练时间和发现的问题。

## 6. 落地节奏建议

| 时间窗 | 动作 |
| --- | --- |
| 今天 / 30 分钟内 | M0-1(Sentry DSN) + M0-2(branch protection) + M0-3(maintenance 标记) + 盲点-2(boot 自检) |
| 本周 | M1-1(灾备演练) + M1-2(Nginx limit_req) + 盲点-1(用量快照) + 盲点-3(开关演练) |
| 公开开放前 | M2-1(CSP enforce) + M2-2(WAF) + M2-3(合规律师) |
| 引入榜单/付费/积分前 | M2-4(服务端 heartbeat) |
| 下次大改 chunks/scene | M2-5(组件二轮拆分) |

### 仓库内已备料汇总(2026-05-19)

下表只列代码侧已完成、剩余动作完全在仓库外的项,供生产部署 / 后台操作时按图索骥:

| 项 | 仓库内已就位 | 触发时还需做 |
| --- | --- | --- |
| **盲点-1** 用量快照 | `pnpm run usage:snapshot` + lib + 测试 | PM2 cron 接线 |
| **盲点-2** boot 自检 | `instrumentation.ts` + `boot-check.ts`(10 字段) + 测试 | 部署后看 `pm2 logs` 首行 `[boot]` |
| **M0-3** 解锁 maintenance gate | `harden-tts-warmup-p0p1` 已归档,active changes 阻塞 2→1 | 完成 `stabilize-auth-session-p0-smoke` 6.5 人工冒烟,归档,再摘 `continue-on-error` |
| **M1-2** Nginx 限流 | `deploy/nginx.example.conf` + `proxy_common` + `deploy/README.md` | CVM 上 cp 配置 + 改 server_name/证书 + `nginx -s reload` |
| **M2-1** CSP enforce | `next.config.ts` 已 env 化,`CSP_ENFORCE=true` 即切,6 测试 | 观察 1-2 周违规清单后 `CSP_ENFORCE=true` + `pm2 reload` |

## 7. 跟踪机制

每完成一项:

1. 在本文档对应小节末尾追加 `**完成时间**:YYYY-MM-DD` 和 `**完成摘要**:...`(参照 `release-readiness-assessment.md` 模式)。
2. 在 `dev-log.md` 留一条对应记录。
3. 若涉及主链路或用户可感知变化,同步 `CHANGELOG.md`。
4. 若涉及 stable spec 改动,按 Spec-Driven 流程走 OpenSpec change。

新发现的边际问题按本文同一格式(等级 / 为什么 / 怎么做 / 解决了什么 / 验收)在末尾追加新章节,不删除历史结论。

## 8. 相关文档

- `docs/dev/release-readiness-assessment.md` — 主线 P0/P1/P2 缺口跟踪(本文档的姊妹)
- `docs/dev/backend-release-readiness-checklist.md` — 上线前逐项勾选清单
- `docs/dev/disaster-recovery.md` — 灾备与数据恢复手册
- `docs/dev/incident-response-runbook.md` — 平台层防护与事故响应手册
- `docs/dev/public-registration-readiness-plan.md` — 公网开放注册执行计划
- `docs/dev/dev-log.md` — 每次落地与发现的过程记录
