# Dev Log

### [2026-05-16] TTS warmup P0/P1：observability + cancel + Redis signed URL + cooldown ladder + 推荐 scene 预热
- 类型：Cleanup + 工程加固（同源 OpenSpec change `harden-tts-warmup-p0p1`，未走 archive）
- 状态：代码已落地并提交（commit `0edf0e7`），50/50 测试全绿

#### 背景
上轮 04dba5a 落地了"一天内不重复请求 + warmup 内存防护"。剩余的 TTS 预热架构问题：
1. 用户从 scene A 切到 scene B，A 排队和在飞的 warmup 不会被打断，浪费带宽
2. sentence/chunk 失败后下次入队直接 reset 重跑，没有节流，疑难内容反复打 msedge-tts
3. 服务端 signed URL 缓存是进程内 Map，PM2 cluster 模式下每个 worker 各自一份，命中率被打折
4. Today 只 warm continueLearning 的 scene，3 个推荐 scene 点进去前都得现场加载
5. idle scheduler 因为页面 hidden / 滚动 / 弱网静默跳过，生产没法回答 warmup 实际命中率

#### OpenSpec change
- `openspec/changes/harden-tts-warmup-p0p1/`（proposal + tasks；specs/ 为空，本次未提 spec delta，按"工程加固"定位不走完整 Spec-Driven archive 流程）

#### 本次落地
- §1 Observability：`scene-audio-warmup-scheduler` 任务转折（loaded/failed/skipped）发 `warmup_task_finished`（附 status/kind/sceneSlug/priority/source/durationMs）；promote / reset / cancel 路径发 `warmup_task_promoted` / `warmup_task_reset` / `warmup_task_cancelled`；`scheduleSceneIdleAudioWarmup.shouldPauseRound` 命中 page-hidden/save-data-or-2g/playback-loading/interaction-recent 时发 `warmup_idle_round_skipped`。
- §2 Cross-scene cancel：`cancelWarmupsBySceneSlug(slug)`，queued → skipped，loading → `AbortController.abort()`；维护 `taskAbortControllers: Map<key, AbortController>`，进入 loading 时创建、终态清理；`requestTtsUrl` / `ensureSentenceAudio` / `ensureChunkAudio` / `ensureSceneFullAudio` 接 optional `AbortSignal`；`use-scene-detail-playback` cleanup 时调 cancel。
- §3 推荐 scene 背景预热：`today-page-client` 在 sceneList 加载完后，复用 `src/lib/cache/scene-prefetch.ts` 的 `scheduleScenePrefetch`，对前 2 个推荐 scene（排除 continueSlug）发起 background warm；saveData/2g 自带跳过，scheduler 内部 200/120 自动 prune，不需要 today 一侧额外清理。
- §4 Redis signed URL：新建 `src/lib/server/tts/signed-url-cache.ts`，Upstash 优先 + 内存 Map fallback；`UPSTASH_REDIS_REST_URL` 缺失时退化保持本地零配置；`service.ts` 把原 in-memory `signedUrlCache` 替换为 helper 调用，`pendingSignedUrlRequests` 仍保留为进程内短时去重。
- §5 sentence/chunk failure cooldown 泛化：`audioRetryFailureRecords` Map + ladder `[0, 5s, 60s, 300s, 1800s]`（1=立即可重试、2=5s、3=60s、4=300s、5+=1800s 上限）；命中 throw + `tts_request_cooling_down` 事件，成功（含 cache 命中）清零；scene_full 走自己的 45s `sceneFullFailureCooldowns` 独立路径不进入泛化。
- §5.7 bug fix（测试发现）：原 `getAudioRetryCooldown` 在 cooldown 过期时把 record 整条 delete，下一次 `markAudioRetryFailure` previous=null、ladder 永远停在 1 次失败。改为保留 failureCount，按 `lastFailedAt` 静默 30min 后才视为新一轮（与 ladder 上限 1800s 对齐）。

#### 验证
- 单测 50/50 通过：`scene-audio-warmup-scheduler.test.ts` (14) + `tts-api.test.ts` (16) + `tts-api.scene-loop.test.ts` (2) + `tts-warmup-registry.test.ts` (7) + `today-page-client.test.tsx` (6) + 新建 `signed-url-cache.test.ts` (5)
- `pnpm run lint`：无新增 warning（仅 2 个旧 warning 不在改动文件内）
- `npx tsc --noEmit`：本次触动文件无新增错误（其它 pre-existing test 错误未动）
- `pnpm run text:check-mojibake`：通过

#### 文档同步（本轮）
- `docs/system-design/audio-tts-pipeline.md`：§4.1 改"signed URL 缓存是进程内 Map"→ Upstash Redis + 内存 fallback；新增 §5.4 sentence/chunk 失败 cooldown ladder；新增 §7.8 跨 scene cancel；新增 §7.9 today 推荐 scene 背景预热；新增 §15.4 scheduler lifecycle 事件清单（`warmup_task_*` / `warmup_idle_round_skipped` / `tts_request_cooling_down`）
- `CHANGELOG.md`：2026-05-16 加 2 条用户可感知（推荐 scene 点开零等待 + 切场景自动打断后台预热）

#### 剩余风险 / 不收项
- OpenSpec change `harden-tts-warmup-p0p1` 当前 specs/ 为空、未走 archive。本次按"工程加固 + 后台收口"定位，不改用户契约（产品语义沿用现有 spec：弱网跳过 / scene full 45s 冷却 / warmup observability），如果后续要严格走 Spec-Driven 完成态再补 delta 并归档。
- `audioRetryFailureRecords` 是进程内 Map，没有上限或 LRU 裁剪。当前单用户单会话 cache key 量级（每 scene 几十 sentence + chunk）下不构成问题；如果某天 key 量级跨 100k，再考虑加裁剪。
- Upstash Redis 失败时退化到 fallback Map，但 fallback Map 不跨 worker 共享。线上 Upstash 长时间不可用时，PM2 多 worker 命中率会回到改造前。helper 已加 `console.warn`，可以从 PM2 log 看到。
- 跨 scene cancel 触发点目前只在 `use-scene-detail-playback` cleanup。如果未来有别的页面级离开 scene 入口（例如全局路由 hook），需要补一次调用，否则旧任务还是会跑完。

### [2026-05-15] 文档 audit：腾讯云部署修正 + 命名/引用收口
- 类型：Cleanup / 文档修正
- 状态：已完成

#### 背景
本周新增的 `release-readiness-assessment.md` / `disaster-recovery.md` / `incident-response-runbook.md` 三份文档全部基于 Vercel 假设，但项目实际生产部署是腾讯云 CVM + PM2 + Supabase（`ecosystem.config.js` 已经是 PM2 配置）。同时还有命名错位（`incident-runbook` vs `incident-response-runbook`）与文档入口缺失。

#### 本次落地
- 新增 `docs/dev/docs-audit-2026-05-15.md`：6 类问题（部署平台冲突 / 路径死链 / 命名错位 / 关联缺失 / CI 假设 / 平台特定缺口）的盘点与处置方案，含 Vercel→腾讯云对应翻译表。
- `docs/dev/incident-response-runbook.md` 重写：架构改为「腾讯云 CVM + PM2 + Nginx + Supabase」，新增 Nginx 反向代理示例、腾讯云 WAF / DDoS 高防接入说明、4 层防护启用顺序、事故响应剧本中的 PM2 reload / git checkout 回滚步骤。
- `docs/dev/disaster-recovery.md`：新增 2.0 章节（应用进程崩溃 / 部署回滚），新增 4.2 腾讯云 CVM cron + COS 上传备份示例，4.3 备份保留策略调整为腾讯云 COS lifecycle，应急联系人模板把 Vercel 改为腾讯云 CVM。
- `docs/dev/release-readiness-assessment.md` 修正 14 处 Vercel 表述：rotate 步骤改为「生产 CVM `.env.local` / PM2 ecosystem env + `pm2 reload`」，P2-3 整段重写为腾讯云 WAF 主线，P1-2 加 GitHub 平台假设说明，加 ICP 备案合规备注，修复 `incident-runbook.md` → `incident-response-runbook.md` 命名错位。
- `docs/dev/dev-log.md` 本周条目（P0-1 / P0-3 / P1-1 / P2-3）的 Vercel 表述统一改为腾讯云 CVM；2026-05-13 历史 baseline 验证条目保留作历史快照。
- `docs/README.md` 高频问题入口表新增 4 行：上线准备评估 / 灾备 / 平台层防护 / docs audit。
- `docs/dev/README.md` 新增 docs-audit-2026-05-15 入口；incident-response-runbook 描述改为 Nginx / 腾讯云 WAF / Cloudflare。

#### 不修改的事项（按 audit 第 9 节决定）
- 200+ 处历史 dev-log / backend-release-readiness-checklist 的 `/d:/WorkCode/AbandonClaw/...` 死链路径：保留作历史快照，按 AGENTS.md「不顺手改无关代码」原则不动。
- 已归档 OpenSpec change（`add-sentry-error-tracking` / `add-csp-report-only`）内的 Vercel 提及：按 OpenSpec workflow「archive 后不修内容」原则不动；冲突由 audit 文档兜底说明。
- `AbandonClaw` 与 `abandon-en` 项目名分裂：留待项目正式 rename 时统一。
- `*.vercel.app` 在 `public-registration-http-baseline-runbook.md` 作为可选环境提示：保留。

#### 验证
- `pnpm run text:check-mojibake`：通过。
- `pnpm run maintenance:check`：active changes 状态不变（`stabilize-auth-session-p0-smoke` 6.5 仍待用户外部执行，与本轮无关）。
- 全文搜索 Vercel 在新 3 文档与本周 dev-log 条目中：只剩「可选 / 备用环境」语义，主线全部为「腾讯云 + Supabase」。

#### 剩余风险
- 用户实际部署细节（Nginx 配置 / 域名 / 证书 / WAF 规则）仍依赖用户在腾讯云控制台与 CVM 执行；纯文档不能替代真实部署。
- audit 文档自身留作 future tracking，下次发现新冲突时在这里追加，避免散落。

### [2026-05-15] P2-2 / P2-3 / P2-4 完成节点：合规与 WAF 文档收口，heartbeat 延期
- 类型：Spec-Driven（P2-4）+ Cleanup（P2-3）+ 节奏说明（P2-2）
- 状态：代码侧与文档侧已完成；外部账号配置与法律审阅待用户执行

#### P2-4 合规声明（add-compliance-pages 已归档）
- 新增 `/privacy` 与 `/terms` 占位页面（marketing layout），覆盖隐私 6 项 + 服务条款 7 项核心结构，全部标 `__待法律审阅__`，底部加显眼免责说明。
- 注册页 `src/app/(auth)/signup/page.tsx` 加 consent checkbox：未勾选时按钮 disabled + 提交时双重 toast 拦截。
- 测试更新：`page.test.tsx` 5 个用例（含新增 disabled 验证）全过；invite_only 与 redirect 测试加 click consent 步骤。
- spec delta `auth-api-boundaries` 新增「注册流程必须包含明示同意条款步骤」requirement + 2 scenario。
- 必须用户在外部执行：找律师审阅 `/privacy` 与 `/terms` 内容并替换 `__待法律审阅__` / `__待用户填写__` 字段（联系邮箱、数据区域、适用法律、仲裁机构）。

#### P2-3 平台层防护与事故响应（incident-response-runbook.md）
- 新增 `docs/dev/incident-response-runbook.md`：覆盖 Nginx 基础防护 → 腾讯云 WAF/DDoS → Cloudflare 前置 → Upstash 应用层 4 层防护启用顺序、异常流量关键指标与阈值表、4 类事故响应剧本、周/月/季度巡检节奏。
- 必须用户在外部执行：部署 Nginx 反向代理 + 启用腾讯云 WAF + 评估 Cloudflare 前置 + 配置 Sentry / 腾讯云监控 / Supabase 告警接入 oncall。

#### P2-2 服务端学习 session heartbeat 延期
- 当前小范围内测阶段不引入榜单 / 付费 / 积分 / 公开等级，前端 60s/10s 上限挡板（已在 P0-B 落地）已经足够防止统计被污染。
- 按 release-readiness-assessment.md 节奏表保留到「引入榜单 / 付费 / 积分前」再启动，届时单独走 OpenSpec change `add-server-side-learning-session-heartbeat` 完整推进 session 状态机 / 数据库表 / 服务端累计 / 前端 delta 降级 / 历史数据迁移。

#### 验证
- `node --import tsx --import ./src/test/setup-dom.ts --test src/app/(auth)/signup/page.test.tsx`：5/5 通过。
- `pnpm run build`：通过，新增 `/privacy` 与 `/terms` 路由注册成功。
- `pnpm run text:check-mojibake`：通过。

#### 剩余风险
- 占位条款未审阅前不构成法律承诺；如未审阅就上线公开服务存在合规风险。
- WAF 与告警依赖用户在腾讯云 / Cloudflare / Sentry 后台配置；纯文档不能替代真实启用。
- Sentry / WAF / 告警 oncall 渠道未接入前，事故响应仍依赖用户主动观察。

### [2026-05-15] P2-1 完成：接入 CSP report-only 与 violation 收集
- 类型：Spec-Driven / 安全策略
- 状态：代码侧已完成，观察期与切正式 enforce 待外部执行

#### 背景
按 `release-readiness-assessment.md` P2-1，next.config.ts 安全头此前没有 CSP，浏览器层 XSS 防御缺失。直接上线严格 policy 风险高，OWASP 推荐 report-only 收集真实违规后再切正式。

#### OpenSpec change
- `openspec/changes/archive/2026-05-15-add-csp-report-only/`（已归档）。
- 修改 capability：`api-operational-guardrails` 增加「浏览器层 XSS 防御必须由 CSP 提供」requirement + 2 scenario。

#### 本次落地
- `next.config.ts` 增加 `Content-Security-Policy-Report-Only` 头，覆盖 default-src/script-src/style-src/img-src/font-src/connect-src/media-src/frame-ancestors/base-uri/form-action/object-src 与 report-uri；connect-src 显式列 Supabase / Upstash / Sentry / GLM / OpenAI / 自定义 GLM provider。
- 新增 `src/app/api/csp-report/route.ts`：兼容 application/csp-report（旧标准）与 application/reports+json（新 Reporting API）；解析 violation → Sentry.captureMessage("CSP violation") + console.warn；IP 维度 30/分钟 限流，防垃圾上报刷爆 Sentry quota；返回 204 / 400 / 429 受控状态码。

#### 测试
- 新增 `src/app/api/csp-report/route.test.ts` 5 个用例：两种 payload 格式 + 非法 JSON + 非法字段 + 限流命中。5/5 通过。
- `pnpm run build`：通过，新路由注册成功。

#### 必须由用户在外部系统执行的后续动作
1. 上线后 1-2 周观察 Sentry 中 CSP violation 数量与分布。
2. 真实业务无误拦后，把 next.config.ts 的 `Content-Security-Policy-Report-Only` 切为 `Content-Security-Policy`。
3. 评估去掉 'unsafe-inline' / 'unsafe-eval'（需要 Next.js script tag 重构 + nonce 支持，工作量较大）。
4. 在 Mozilla Observatory 检查安全评分变化。

#### 剩余风险
- report-only 模式不阻塞资源，但仍可能触发用户浏览器 console 警告；普通用户察觉不到。
- 当前 connect-src 列表是基于已知上游域名；若未来引入新上游，需要更新 policy。

### [2026-05-15] P1-2 完成：最小 CI 工作流
- 类型：Cleanup / 工程基础设施
- 状态：代码侧已完成，GitHub branch protection 与首次 CI run 待用户配置

#### 背景
按 `release-readiness-assessment.md` P1-2，仓库无 `.github/workflows/*.yml`，PR 没有自动 gate。本次刚收口的错误响应规范、middleware code 字段、requestId 链路一致性、Sentry 接入容易被未来未跑测试的改动无意打破。

#### 本次落地
- 新增 `.github/workflows/ci.yml`：
  - 触发：PR 到 main、push 到 main
  - 并发控制：相同 ref 取消进行中的旧 run
  - timeout: 15 分钟
  - 步骤：checkout → pnpm install (frozen) → lint → mojibake → maintenance guardrails → unit tests → script tests → openspec validate
  - 用 `pnpm/action-setup@v4` + `actions/setup-node@v4` 设 Node 20 + pnpm 10 + pnpm 缓存
- `maintenance:check` 步骤标 `continue-on-error: true`，原因：预先存在的 change `stabilize-auth-session-p0-smoke` 6.5 人工冒烟任务待用户外部执行，未归档前会 fail；归档后须移除该标记。

#### 同时归档 add-sentry-error-tracking
- 由于 `maintenance:check` 要求所有 active changes 完成，本次顺手把 P1-1 change 归档到 `openspec/changes/archive/2026-05-15-add-sentry-error-tracking/`。
- 同步把 spec delta 合入主 stable spec `openspec/specs/api-operational-guardrails/spec.md`，新增「未知服务端异常必须被错误追踪系统捕获」requirement 与 3 个 scenario。
- tasks.md status 改为 done，2.4 `withSentryConfig` 转入不收项说明（不需要 source map upload）。

#### 必须由用户在外部系统执行的后续动作
1. GitHub repo settings → Branches → 给 `main` 加 branch protection rule，要求 CI / check 必须通过才能合并。
2. （可选）启用 Dependabot / Renovate 做依赖自动更新。
3. 待 `stabilize-auth-session-p0-smoke` 完成 6.5 人工冒烟并归档后，移除 ci.yml 里 `maintenance:check` 的 `continue-on-error: true`。

#### 验证
- 本地 `pnpm run lint`：通过（2 个 warning，0 error）。
- 本地 `pnpm run text:check-mojibake`：通过。
- 本地 `pnpm run maintenance:check`：因预先存在 change 失败 1 项，已说明并 continue-on-error 兜住。
- 本地 `pnpm run test:scripts`：14/14 通过。
- 本地 `pnpm run spec:validate`：33 项全过。

#### 剩余风险
- 首次 PR 在 GitHub 实际跑 CI 时，可能因 actions/setup-node 缓存策略或 pnpm 版本差异需调整。
- branch protection 不启用时，CI 失败的 PR 仍可强行合并；用户必须在 GitHub 后台开启保护。

### [2026-05-15] P1-1 完成：接入 Sentry 错误追踪
- 类型：Spec-Driven / 可观测性收口
- 状态：代码侧已完成，Sentry 后台与生产 CVM env 待用户配置

#### 背景
按 `release-readiness-assessment.md` P1-1，服务端 5xx 错误此前只走 console，缺事故告警与聚合。requestId 链路本周已完整收口，是接入 Sentry 的最佳时机。

#### OpenSpec change
- `openspec/changes/add-sentry-error-tracking/` 包含 proposal / design / tasks / spec delta。
- 已修改 capability：`api-operational-guardrails` 增加 3 个 scenario：未知异常必须上报、AppError 不上报、DSN 缺失 no-op。

#### 本次落地
- 安装 `@sentry/nextjs@10.53.1`。
- 新增 `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation.ts`。
- `src/lib/server/api-error.ts`：对 status >= 500 的未知异常调用 `Sentry.captureException` 并注入 `requestId` tag；用 dependency injection 让单测可隔离。
- `src/lib/server/logger.ts`：`logApiError` 增加 Sentry breadcrumb，保留原 console 输出。
- `beforeSend` hook 过滤 cookie / authorization / *token* 字段，避免 PII 上报。
- `.env.example` 增加 `NEXT_PUBLIC_SENTRY_DSN` 占位与说明。
- 扩展 `api-error.test.ts` 4 个 case：5xx 未知异常上报、AppError 不上报、legacy Unauthorized/Forbidden 不上报、非 Error 类型上报。

#### 不上报的错误
- AppError 子类（ValidationError / AuthError / ForbiddenError / NotFoundError / RateLimitError / DailyQuotaExceededError / SceneParseError / TtsGenerationError）。
- 通过 `mapLegacyMessageToStatus` 识别为 401/403 的 legacy `new Error("Unauthorized" | "Forbidden")`。
- 4xx 业务错误。

#### 必须由用户在外部系统执行的后续动作
1. Sentry.io 注册账号或登录现有 organization。
2. 创建项目（platform 选 Next.js）。
3. 复制 DSN（Settings → Projects → Client Keys）。
4. 生产 CVM `.env.local` / PM2 ecosystem env 配置 `NEXT_PUBLIC_SENTRY_DSN`，`pm2 reload abandonclaw` 生效。
5. 在 Sentry Alerts 配置至少 1 条告警规则：
   - 单一错误 5 分钟出现 > 10 次 → 告警
   - 错误率 > 1% 持续 5 分钟 → 告警
6. 把告警渠道接到 oncall 入口（Slack / 邮件 / 微信机器人）。
7. 触发一次 5xx（任何 unauthenticated 路由打异常 body 即可）确认 Sentry 收到事件且 tag 包含 requestId。

#### 验证
- `node --import tsx --test src/lib/server/api-error.test.ts`：4/4 通过。
- 全量 70 个相关测试无 regression。
- `pnpm run build`：通过，Sentry SDK 集成无影响。

#### 剩余风险
- DSN 未配置前 Sentry 是 no-op，生产事故仍只能看 PM2 logs；用户必须先完成上述后台动作。
- 未启用 Sentry Performance / Tracing：等真有 p95 监控需求再开，避免免费额度被消耗。
- 告警规则与 oncall 渠道在 Sentry 后台手工配置，不在代码内固化，避免与运维耦合。

### [2026-05-15] P0-2 / P0-3 状态：工具就绪，待外部执行
- 类型：Cleanup / 验证收口
- 状态：代码侧无改动，工具链已确认可执行

#### P0-2 baseline 工具就绪
- `pnpm run load:public-registration-baseline --dry-run --config-file=scripts/load-samples/public-registration-http-baseline.sample.json` 输出正常，所有 cookie/邀请码字段以 `[provided]` 脱敏预览展示。
- sample 配置完整覆盖 16 个场景。
- 实际执行需要用户准备：
  1. 复制 sample 到 `tmp/public-registration-http-baseline.local.json`，替换真实 baseUrl/origin/cookies/inviteCode/outputPath。
  2. 在浏览器登录目标环境拿到 verified、unverified、generation_limited、readonly、quota_exhausted、admin 共 6 个 cookie。
  3. 至少 3 个不同账号的 cookie 用于 IP 限流验证（cookieA|||cookieB|||cookieC 拼接）。
  4. 在 `/admin/invites` 生成有效邀请码。
  5. 跑全量：`pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json`。
  6. 第一层场景必须全部 `passed`，并把结果摘要写回 dev-log。

#### P0-3 邮箱 provider 验证就绪
- 代码侧无改动；Resend / EMAIL_FROM / EMAIL_VERIFICATION_CODE_SECRET 在 .env.example 已列出。
- 实际执行需要用户：
  1. 生产 CVM `.env.local` / PM2 ecosystem env 配置 `RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_VERIFICATION_CODE_SECRET`，`pm2 reload abandonclaw` 生效。
  2. Resend 后台 → Domains → 完成 SPF/DKIM 验证。
  3. 用真实可收件邮箱跑 `signup-email-code-sent` 场景验证收件成功。
  4. 用收到的验证码补跑 `invite-only-signup-with-invite-succeeds`。

#### 剩余风险
- baseline 与邮件链路在外部完成前，「目标环境真的可放行」尚不可证。
- P0-2 + P0-3 验收 checkbox 在 release-readiness-assessment 中保留为未勾，待用户实际执行后回写。

### [2026-05-15] P0-1 完成：清理 .env.example 真实 secret
- 类型：Cleanup / 安全收口
- 状态：代码侧已完成，secret rotate 待用户在外部系统执行

#### 背景
按 `docs/dev/release-readiness-assessment.md` P0-1，`.env.example` 当前包含真实 GLM_API_KEY、SUPABASE_SERVICE_ROLE_KEY、ADMIN_EMAILS。虽然 `.gitignore` 用 `.env*` 兜住未进 git history，但模板文件含真 secret 极易误传。

#### 本次落地
- `.env.example` 完全重写为占位符模板：
  - 所有 secret 用 `__REPLACE_ME__` 标记
  - 完整覆盖 GLM / Supabase / 域名 / 邮箱 / 注册 / 限流 / quota / 上游 / 备用 provider 全部 env
  - 每个变量加注释说明用途与配置来源
- 顶部加警告说明：复制为 .env.local 替换占位符；不要把真实 secret 写入模板。

#### 必须由用户在外部系统执行的后续动作
1. Supabase 后台 → Project Settings → API → Reset `service_role_key`，旧 key 立即失效。
2. GLM provider 后台撤销旧 `GLM_API_KEY`，生成新 key。
3. 在生产 CVM `.env.local` / PM2 ecosystem env 中更新对应 secret 为新值，`pm2 reload abandonclaw` 生效。
4. 检查本地 `.env.local` 是否已用新 key。
5. 如 `ADMIN_EMAILS` 中的 admin 账号怀疑被钓鱼，重置该账号 Supabase 密码并启用 2FA（如可用）。

未执行前，旧 secret 仍可被任何拿到旧值的人使用。

#### 验证
- `cat .env.example` 不包含任何 `sb_secret_` / `sk-` 前缀字符串。
- `pnpm run text:check-mojibake .env.example` 通过。

#### 剩余风险
- secret rotate 在外部完成前，泄露窗口仍存在。
- 仓库历史从未 commit 过 .env.example 真值（已确认 git ls-files .env.example 为空），但本地工作目录历史副本可能存在，需用户检查本地 git 客户端 stash 与未提交工作。

### [2026-05-15] 上线准备评估与缺口跟踪文档落地
- 类型：Cleanup / 文档新增
- 状态：文档已提交，缺口处置按节奏推进

#### 背景
当前业务防护层（限流 / quota / 邀请码 / 邮箱验证 / access_status / requestId / admin 紧急开关）已经达到 `invite_only` 小范围内测可放行的标准。但平台运维层（可观测性聚合 / CI / 备份恢复 / 安全策略 / 合规）仍有较明显缺口，且散落在多份文档中，缺统一入口。

#### 本次落地
- 新增 `docs/dev/release-readiness-assessment.md`，覆盖业务防护层之外的 10 个缺口：
  - P0：`.env.example` secret 清理 + rotate、目标环境 baseline 跑通、邮箱 provider 配置确认。
  - P1：Sentry 接入、最小 CI 工作流、备份恢复方案与演练。
  - P2：CSP、服务端学习 session heartbeat、WAF / Bot 防护、合规声明。
- 每个缺口记录背景、为什么必须做、怎么做、预期效果、验收标准。
- 在 `docs/dev/README.md` 添加文档入口。

#### 验证
- 文档结构与 `backend-release-readiness-checklist.md` / `public-registration-readiness-plan.md` 平行，不重复语义。
- 引用其他文档的链接路径与现有约定一致。

#### 剩余风险
- 文档只是评估和处置指引，缺口本身尚未实际处置；按节奏表逐项推进。
- 上线前 P0 三项必须先完成，否则不建议放行任何外部用户。

### [2026-05-15] Today starter、Scene 保存来源与 Review 消费链路收尾
- 类型：完成态收尾 / 主学习闭环测试与文档同步
- 状态：已完成，准备提交到 `main`

#### 背景
本轮在已完成 builtin starter / Today 推荐 / scene chunk 保存 / Chunks 用户态读取后，继续确认 `user_phrase -> Review due -> Review submit` 的最小消费链路，同时收口 starter path 顺序和 scene 来源字段的稳定口径。

#### 本次收口
- Today starter recommendation 改为以 `isStarter = true` 的 starter path 为准，优先按 `starterOrder` 推荐；已开始但未完成的 starter 在没有 `continueLearning` 对象时会被优先接回。
- builtin scene seed 补齐 `title`、`starterOrder`、core phrase `order/chunkType/type`，scene list API 透出 `starterOrder`。
- Scene 保存 chunk 时明确透传 `sourceType: "scene"`，并补测试锁定保存 payload 保留来源场景、来源句子和来源 chunk。
- Chunks 列表测试锁定从 `/api/phrases/mine` 读取用户态 scene 表达，而不是读取 builtin 原始 chunk。
- Review service 测试锁定 due 来源为 `user_phrases`、`next_review_at <= now` 或 `null` 可消费、builtin-only phrase 不直接进入 due。
- Review submit 测试锁定写 `phrase_review_logs`、推进 `user_phrases` 状态，并补无显式 idempotency key 时按用户与 normalized payload 去重。
- 同步 `today-learning-contract`、`scene-entry`、`today-recommendation` 与正式 `CHANGELOG.md`。

#### 验证
- `pnpm exec node --import tsx --test src/lib/server/review/service.user-phrase-flow.test.ts`
- `pnpm exec node --import tsx --test src/app/api/review/handlers.test.ts`
- `pnpm exec node --import tsx --test src/lib/server/phrases/logic.test.ts src/lib/server/review/service.logic.test.ts`

#### 剩余风险
- 本轮仍未连接真实 Supabase 环境做浏览器账号级端到端验收；已通过服务端与交互层测试锁定最小数据契约。
- starter / builtin phrase 仍依赖生产环境已执行对应 SQL 与 seed；未执行时会按既有空态或受控错误降级。

### [2026-05-14] Today 新用户默认学习路径推荐
- 类型：Spec-Driven / Today 主链路推荐与新手承接
- 状态：实现完成，待后续 archive `today-starter-recommendation`

#### 背景
P0 已补齐 builtin starter scenes 与元字段，P1 已让 `/scenes` 能展示 Start Here 和新手路径，但 `/today` 对新用户仍可能只有后台式入口或空状态，缺少“今天从这里开始”的明确承接。

#### 本次改动
- 在 `learning dashboard` 服务端聚合里新增 `starterRecommendation`，由服务端纯函数统一产出 continue / start_starter / next_starter / next_daily / empty 五类结果。
- 推荐逻辑优先复用已有 `continueLearning`，没有进行中场景时再按 builtin starter 的 `level -> sort_order -> is_featured` 稳定选择首个或下一个场景；starter 全完成后降级到 `daily_life / time_plan / social`。
- Today 顶部首要任务卡片改为消费服务端 recommendation，展示场景标题、说明、推荐理由、level、预计时长、进度与 CTA，同时保留 review、expressions 与 learning path 现有区块。
- 补充 Today 主卡片最小交互测试，以及推荐纯函数测试，覆盖新用户、continue、部分 starter、starter 全完成、空场景、字段缺失与 review 共存。

#### 已验证
- `node --import tsx --test src/lib/server/learning/today-primary-recommendation.test.ts`
- `node --import tsx --test src/lib/server/learning/service.logic.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/today/components/today-page-client.test.tsx`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/today/components/today-sections.test.tsx src/features/today/components/today-page-selectors.test.ts`
- `pnpm run build`

#### 本轮收口项
- 收口新用户首次进入 `/today` 没有明确学习入口的问题。
- 收口 Today 首要任务推荐散落在前端推断中的风险，改为服务端稳定聚合字段。
- 收口 starter 场景缺失、字段不完整或 scene 删除时的空状态降级。

#### 明确不收项
- 不重构 review 主流程，不改变 review summary 优先级。
- 不改 chunks、TTS、scene detail 或 `/scenes` 页面已有主流程。
- 不新增复杂推荐模型或 AI 推荐。

#### 剩余风险
- 推荐排序当前依赖 scenes 元字段完整性；若生产环境尚未执行 P0 starter scenes SQL/seed，Today 会安全降级到 empty recommendation，而不是补猜场景。

### [2026-05-14] Scenes 视觉参考稿收口
- 类型：Spec-Driven / `/scenes` 移动端视觉与交互收紧
- 状态：已完成本轮代码与测试收口，仍待 change archive / stable spec / maintenance 收尾

#### 本次收口
- 去掉顶部“学习场景”和顶部功能入口，首屏直接以“推荐路径”开头。
- 将循环播放调整到底部次要动作“复习”按钮位置，主按钮只服务“开始/继续学习”。
- 将“生成场景 / 导入自定义”收进筛选与操作区的更多菜单，保留现有组件、回刷和错误处理链路。
- 按 `scenesNew.html` 补齐筛选与操作区：横向分类 pill、等级 / 来源下拉、排序按钮和更多操作按钮。
- 统一场景卡片、底部按钮和列表文案层级，按 `scenesNew.html` 的移动端视觉方向收紧。

#### 已验证
- `node --import tsx --test src/app/(app)/scenes/scene-display.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/app/(app)/scenes/page.interaction.test.tsx`
- `pnpm run build`

### [2026-05-14] Scenes 移动端新手路径与筛选体验改造
- 类型：Spec-Driven / Scenes 学习入口体验升级
- 状态：实施完成，等待 archive / stable spec 收尾

#### 背景
P0 已经补齐 builtin starter scenes 和元字段，但 `/scenes` 首屏仍更像场景管理页。新用户进入后虽然能看到数据，却不清楚应该先学什么，生成 / 导入入口的优先级也高于“开始学习 / 继续学习”主线。

#### 本次改动
- 将 `/scenes` 改造成移动端优先学习入口：吸顶标题区、推荐路径横滑卡片、粘性筛选区、纵向场景卡片和底部主 CTA。
- 新增 `scene-display.ts` selector / utility，收口 `level/category/source_type` 筛选、推荐排序、starter packs、状态映射和主 CTA 判定。
- 推荐路径改为基于真实 scenes 数据组合 `Start Here / Everyday Survival / Time and Plans / Simple Social`，不再写死 mock 内容。
- 保留并降级展示生成 / 导入 / review pack 入口，复用现有导入、生成、删除、预热和随机复习链路。
- 场景卡片现在展示 level、分类、来源、时长、学习目标、学习状态、进度条和 CTA。

#### 已运行验证
- `node --import tsx --test src/app/(app)/scenes/scene-display.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/app/(app)/scenes/page.interaction.test.tsx`
- `pnpm run build`

#### 本轮收口
- scenes 首屏主入口从“生成 / 导入优先”调整为“开始学习 / 继续学习优先”。
- 筛选、排序、pack 组合和底部 CTA 逻辑从页面 JSX 中抽离到稳定 selector 层，后续 P1/P2 不需要继续在页面里堆业务规则。

#### 明确不收项
- 不做 Today 与 Scenes 的统一推荐引擎。
- 不改 scene detail、TTS、review、chunks 主逻辑。
- 不做远程搜索和桌面端完整信息架构重排。

#### 剩余风险
- 当前底部“复习表达”按钮仍是基于 scene list 完成态做最小降级，不是接入正式 review due 聚合。
- OpenSpec archive、stable spec sync 和 maintenance 收尾仍需在进入完成态前补齐。

### [2026-05-13] 收口项目验证码作为注册邮箱验证依据
- 类型：Spec-Driven / 认证主链路语义收口
- 状态：实施中，待 archive `disable-supabase-confirm-email-after-code-signup`

#### 背景
注册页已经有“发送 6 位邮箱验证码 -> 输入验证码 -> 提交注册”的主体验，但 Supabase Confirm email 仍会让新账号在注册后处于未确认状态，导致用户完成项目验证码后还被重复拦到 `/verify-email`，甚至登录失败排查时误以为账号不存在或密码错误。

#### 本次改动
- 注册服务改为通过 Supabase admin 创建已确认邮箱用户：项目 6 位验证码校验通过且账号创建成功后，用户即满足主应用邮箱验证判定。
- `/auth/callback` 与 `/verify-email` 保留为旧账号、手工补救或未来 Supabase 邮件能力兼容入口，不再作为新注册主链路必需步骤。
- 登录页将 `invalid_credentials` 映射为安全中文提示，不拆分邮箱存在性，避免账号枚举。
- baseline runner 的有效邀请码注册成功场景预期改为 `emailVerificationRequired=false`。
- 同步 `email-verification-flow`、`auth-api-boundaries` stable spec、认证领域规则、上线 runbook 和上线检查清单。

#### 已运行验证
- `node --import tsx --test src/lib/server/registration.test.ts src/app/api/auth/signup/route.test.ts middleware.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/signup/page.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`

#### 本轮收口
- 新注册主链路不再同时依赖项目验证码和 Supabase Confirm email 两套邮箱验证。
- middleware 继续使用认证层 confirmed 状态作为主应用放行依据，不新增第二套 profile 邮箱验证字段。
- 登录错误提示更可理解，但仍不泄露邮箱是否存在。

#### 明确不收项
- 不做密码找回完整流程。
- 不做邮件投递监控、退信处理、域名信誉或模板系统。
- 不批量迁移历史未确认账号；如生产已有旧账号，单独通过后台或 Supabase 控制台处理。
- 不改变邀请码、注册 IP 频控、daily quota 或账号 access_status 语义。

#### 完成态 Review
- 对照 proposal / design / spec delta，本轮实现已覆盖：项目验证码通过后使用 Supabase admin 创建 `email_confirm=true` 用户、注册响应返回 `emailVerificationRequired=false`、登录错误提示保持安全中文文案、`/auth/callback` 与 `/verify-email` 仅作为兼容入口保留。
- stable spec 已同步 `email-verification-flow` 与 `auth-api-boundaries`；领域规则、baseline runbook、上线检查清单和正式 `CHANGELOG.md` 已同步本轮用户可感知变化。
- baseline runner 已支持 `signup-email-code-sent`、`--signup-email`、`--signup-email-code` 与 `--resolve-ip`，但生产邮箱 provider 仍需先配置后才能补齐真实成功链路证据。

#### 最终验证
- `node --import tsx --test src/lib/server/registration.test.ts src/lib/server/signup-email-code.test.ts src/app/api/auth/signup/route.test.ts src/app/api/auth/signup/email-code/route.test.ts middleware.test.ts scripts/load-public-registration-http-baseline.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/signup/page.test.tsx"`
- `pnpm exec openspec validate disable-supabase-confirm-email-after-code-signup --strict --no-interactive`
- `pnpm exec openspec validate --all --strict --no-interactive`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm run maintenance:check`
- `git diff --check`

#### 剩余风险
- 生产环境仍必须配置 `RESEND_API_KEY` 与 `EMAIL_FROM` 并 redeploy，否则 `signup-email-code-sent` 会继续返回 `Email provider is not configured.`。
- 生产邮件配置修复后，还需要按 runbook 重新获取目标域有效 cookie，补跑 `signup-email-code-sent` 与 `invite-only-signup-with-invite-succeeds` 等真实 HTTP baseline。

### [2026-05-13] 上线前真实 HTTP baseline 阻断核对
- 类型：Fast Track / 发布前验证留证
- 状态：阻断，暂不具备公开放行证据

#### 背景
准备直接补齐公网开放前的真实 HTTP baseline 证据，目标环境为 `https://abandon-claw.vercel.app`，预期注册模式为 `invite_only`。本轮不改业务代码，只验证上线前准备是否具备可放行证据。

#### 已执行
- `pnpm run maintenance:check`
  - OpenSpec 全量校验通过。
  - 乱码检查通过。
  - 未发现未收尾 active change。
- `pnpm run load:public-registration-baseline --dry-run --config-file=tmp/public-registration-http-baseline.local.json`
  - baseline 配置可读取，目标环境、Origin、输出路径和已提供 cookie 字段可预览。
- 尝试执行安全全量 baseline，并显式置空占位 cookie / 邀请码，避免误把占位值当真实前提。
- 尝试单独补跑：
  - `registration-mode-visible`
  - `invite-only-signup-without-invite-rejected`
  - `origin-mismatch-rejected`
  - `admin-status-shows-backend-and-usage`
- 网络探测：
  - `Resolve-DnsName abandon-claw.vercel.app`
  - `Invoke-WebRequest https://abandon-claw.vercel.app/api/auth/signup`
  - `Test-NetConnection abandon-claw.vercel.app -Port 443`
- 补强 baseline runner：
  - 新增 `--resolve-ip` / `BASELINE_RESOLVE_IP`，允许只在 baseline 进程内覆盖目标域名解析。
  - 已运行 `node --import tsx --test scripts/load-public-registration-http-baseline.test.ts`。
  - 已运行 `pnpm exec tsc --noEmit --pretty false`。
- 尝试使用 Vercel 常见入口 IP 补跑：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --resolve-ip=76.76.21.21 --scenario=registration-mode-visible ...`
  - `curl.exe --resolve abandon-claw.vercel.app:443:76.76.21.21 https://abandon-claw.vercel.app/api/auth/signup`
- 通过 GitHub Deployments API 核对最新 Vercel production deployment：
  - 最新 deployment SHA 为 `7fda5251fa5e290b6428c1eadee8fae82327b1ee`，状态为 `success`。
  - `target_url` / `environment_url` 为 `https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app`。
- 使用最新 deployment URL 补跑：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --base-url=https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app --origin=https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app --scenario=registration-mode-visible ...`
  - `curl.exe --resolve abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app:443:76.76.21.21 https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app/api/auth/signup`
- 按当前机器访问 Vercel 所需方式设置本地代理后补跑：
  - `$env:NODE_OPTIONS="--use-env-proxy"`
  - `$env:HTTPS_PROXY="http://127.0.0.1:7897"`
  - `$env:HTTP_PROXY="http://127.0.0.1:7897"`
  - `registration-mode-visible` 使用 `https://abandon-claw.vercel.app` 通过，返回 `mode=invite_only`、`source=runtime`。
  - `signup-ip-rate-limit-hits-429` 通过，6 次请求中出现 3 次 `429`。
  - `invite-only-signup-without-invite-rejected` 首轮因 runner 未带 `emailCode` 返回 `400 VALIDATION_ERROR`；修正 runner 后再次执行时被刚才的注册 IP 频控窗口拦截，返回 `429 RATE_LIMITED`，`retryAfterSeconds=510`。
  - `origin-mismatch-rejected` 返回 `401 Unauthorized`，说明当前 `verifiedCookie` 无效或不适用于目标域，未能实际验证 Origin 拒绝。
  - `admin-status-shows-backend-and-usage` 返回 `401 Unauthorized`，说明当前 `adminCookie` 无效或不适用于目标域。
- 补强 baseline runner：
  - 新增 `signup-email-code-sent` 场景。
  - 新增 `--signup-email` 与 `--signup-email-code`，让“有效邀请码注册成功”能显式带同一邮箱收到的验证码。
- 使用 `signup-email-code-sent` 补跑邮箱验证码发送：
  - 首次被注册 IP 频控挡住，返回 `429 RATE_LIMITED`，`retryAfterSeconds=31`。
  - 等待窗口后再次补跑，返回 `401 AUTH_UNAUTHORIZED`，错误为 `Email provider is not configured.`。
- 已运行 `pnpm run build`，本地生产构建通过。

#### 结果
- baseline 实际执行在连接目标环境时中断，错误为 `fetch failed` / `UND_ERR_CONNECT_TIMEOUT`。
- 当前机器解析 `abandon-claw.vercel.app` 得到的地址不符合正常 Vercel 入口预期，且 443 连接超时。
- Vercel 入口 IP `76.76.21.21:443` 本身可连接，但用 `abandon-claw.vercel.app` 作为 Host / SNI 覆盖到该 IP 后仍出现 `ECONNRESET`。
- 最新 Vercel deployment URL 也被当前网络解析到异常地址；覆盖到 `76.76.21.21` 后仍出现 `ECONNRESET`。
- GitHub 侧可以证明 Vercel deployment 成功，但当前执行环境无法对 `*.vercel.app` 完成真实 HTTP baseline。
- 设置本地代理后，短域名 `https://abandon-claw.vercel.app` 可访问，且注册模式与注册 IP 频控通过。
- 邮箱验证码发送在生产环境失败，错误为 `Email provider is not configured.`，这是邀请注册成功链路的上线阻断项。
- 仍未形成完整可放行 baseline：当前本地 cookie 已失效或不适用于目标域，登录态 / admin / Origin / 高成本接口相关场景未通过；注册频控窗口内也需要等待后再补跑无邀请码场景。

#### 结论
- 代码、OpenSpec 收尾检查与本地生产构建通过。
- 目标短域名在代理下可访问，公网注册模式和注册 IP 频控已有真实 HTTP 证据。
- 上线前真实环境验证仍未完成；生产环境必须先配置邮箱验证码发送依赖，否则邀请注册成功链路不可用。
- 邮箱配置修复后，还需要重新获取目标域可用的 verified / admin / unverified / restricted 测试账号 cookie 并补跑完整 baseline。

#### 后续补跑入口
- 优先使用 GitHub deployment status 里的最新 `target_url`，不要继续假设 `https://abandon-claw.vercel.app` 一定存在。
- 当前机器访问 Vercel 需要先设置代理：
  - `$env:NODE_OPTIONS="--use-env-proxy"`
  - `$env:HTTPS_PROXY="http://127.0.0.1:7897"`
  - `$env:HTTP_PROXY="http://127.0.0.1:7897"`
- 使用短域名重新执行：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json`
- 邮箱配置修复后，先补跑：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --scenario=signup-email-code-sent --signup-email=<真实可收信邮箱>`
  - 收到 6 位验证码后，再跑 `invite-only-signup-with-invite-succeeds`，并传入同一个 `--signup-email`、`--signup-email-code` 和有效 `--invite-code`。
- 补跑前必须重新准备目标域有效 cookie，并等待注册 IP 频控窗口结束或换等价环境。
- 若使用当前最新 deployment URL，命令形态为：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --base-url=https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app --origin=https://abandon-claw-hcfr4bi22-xyqbspys-projects.vercel.app`
- 若只是本机 DNS 污染但目标域名已确认绑定，可临时补跑：
  - `pnpm run load:public-registration-baseline --config-file=tmp/public-registration-http-baseline.local.json --resolve-ip=76.76.21.21`
- 若只先恢复核心放行证据，至少补跑并记录：
  - `registration-mode-visible`
  - `invite-only-signup-without-invite-rejected`
  - `signup-ip-rate-limit-hits-429`
  - `unverified-app-redirects-to-verify-email` 或 `unverified-api-rejected`
  - `origin-mismatch-rejected`
  - `practice-generate-normal`
  - `user-rate-limit-hits-429`
  - `ip-rate-limit-hits-429`
  - `admin-status-shows-backend-and-usage`

### [2026-05-12] 收口主应用界面、后台 UI 与加载反馈
- 类型：Fast Track / UI 与交互一致性收口
- 状态：已完成

#### 背景
最近几轮围绕主应用顶部导航、`today`、`progress`、`demo` 和 `admin` 做了多次视觉和交互收口。改动不改变学习状态、注册准入、账号处置或高成本能力的业务语义，但属于用户可感知变化，需要同步正式 changelog 和 UI 维护文档，避免后续继续按旧页面结构理解。

#### 本次改动
- 主应用顶部栏和移动端菜单重做，并把“当前位置”抽成全局面包屑能力。
- `today` 页面简化为更轻的每日学习入口，减少重复卡片和说明。
- `progress` 页面按新视觉重做，保留热力图和成长足迹，并把指标口径收口为表达资产、复习正确率和最近 7 天趋势。
- `demo` 页面按新的产品展示风格重做，强调场景、表达沉淀和复习闭环。
- `admin` 首页和邀请码页按后台专属 UI 重做，并保留用户、邀请码、场景、表达库、导入场景、变体、AI 缓存、TTS 缓存和可观测性入口。
- admin 输入框、下拉框、按钮、focus 背景、圆角、cursor 和时间展示做一致性收口。
- 新增全局 route pending 蒙层，并为 admin server action 表单新增 `AdminSubmitButton`，用 `useFormStatus()` 展示“处理中...”。

#### 已运行验证
- `pnpm exec eslint "src/components/admin/admin-action-button.tsx" "src/components/layout/route-pending-overlay.tsx" "src/app/(app)/layout.tsx" "src/app/(app)/admin/page.tsx" "src/app/(app)/admin/invites/page.tsx" "src/app/(app)/admin/users/page.tsx" "src/app/(app)/admin/phrases/page.tsx"`
- `node --import tsx --test "src/app/(app)/admin/invites/page.test.tsx" "src/app/(app)/admin/users/page.test.tsx" "src/app/(app)/admin/page.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

#### 明确不收项
- 不改变 admin 账号处置、邀请码使用、注册模式、高成本紧急开关等服务端语义。
- 不启动本地 dev server。
- 不提交 `tmp/` 下的本地 cookie、邀请码或 baseline 配置。
- 不把 `demo.html`、`adminui.html`、`progress.html` 这些参考稿作为正式运行页面。

### [2026-05-11] 接入注册邮箱验证码
- 类型：Spec-Driven / 注册邮箱验证码前置校验
- 状态：实施完成，待 archive `add-email-code-signup-verification`

#### 背景
上一轮邮箱验证复用 Supabase 邮件链接确认，能处理 `/auth/callback`、未验证拦截和重发验证邮件，但注册页没有“发送验证码、输入验证码”的体验。本轮将注册主流程改为邮箱验证码前置校验，避免“邮箱验证”语义在产品体验和代码实现之间继续漂移。

#### 本次改动
- 新增 `registration_email_verification_codes`，验证码只存 hash、过期时间、错误次数和消费状态。
- 新增 `/api/auth/signup/email-code`，在注册未关闭时发送 6 位邮箱验证码，并复用注册 IP 频控。
- `/api/auth/signup` 新增 `emailCode`，在创建 Supabase Auth 用户前校验验证码，账号创建成功后消费验证码。
- `/signup` 增加发送验证码按钮、验证码输入和移动端可用布局；`invite_only` 下同时要求邀请码和验证码。
- 同步 `auth-api-boundaries`、`email-verification-flow` stable spec 和公开注册验证文档。

#### 明确不收
- 不做邮件投递监控、退信处理、模板系统、短信验证码、设备指纹、WAF 或复杂风控评分。
- 不删除 `/auth/callback` 和 `/verify-email`，它们继续作为 Supabase 链接确认与未验证拦截兼容入口。

### [2026-05-11] 接入邮箱验证闭环
- 类型：Spec-Driven / 公网注册邮箱验证闭环
- 状态：已完成并归档 `complete-email-verification-flow`

#### 背景
注册入口已经调用 Supabase Auth 创建邮箱账号，也通过 middleware 阻止邮箱未验证用户进入主应用和受保护 API，但缺少显式 `/auth/callback` 回跳和 `/verify-email` 重发验证邮件入口。这样会让“邮箱验证是否真的接入”过度依赖外部默认配置，用户注册后也缺少自助补发路径。

#### 本次改动
- 注册时向 Supabase `signUp` 显式传入项目内 `/auth/callback` 验证回跳地址。
- 新增 `/auth/callback`，使用 Supabase server client 交换邮件链接中的 code，并只跳转到安全站内目标。
- 新增 `/api/auth/resend-verification`，用于在 `/verify-email` 重发 signup 验证邮件。
- `/verify-email` 增加注册邮箱输入和重发验证邮件按钮。
- 同步 `email-verification-flow` stable spec、`auth-api-boundaries`、公开注册验证指南、runbook 和上线检查清单。

#### 已运行验证
- `pnpm exec tsc --noEmit`
- `node --import tsx --test src/lib/server/registration.test.ts src/lib/server/email-verification.test.ts src/app/api/auth/signup/route.test.ts src/app/api/auth/resend-verification/route.test.ts src/app/auth/callback/route.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(auth)/verify-email/page.test.tsx'`
- `pnpm exec openspec validate complete-email-verification-flow --strict --no-interactive`
- `pnpm exec openspec validate --all --strict --no-interactive`
- `pnpm run maintenance:check`
- `git diff --check`

#### 明确不收项
- 不自建验证码、邮箱 token 表或邮件投递系统。
- 不做邮件模板、域名信誉、退信监控或到达率统计。
- 不做管理员手动标记邮箱已验证。
- 真实环境仍必须确认 Supabase Auth 已开启邮箱确认，并把目标域名 `/auth/callback` 加入 Redirect URLs。

### [2026-05-11] 推进 admin 高成本紧急开关
- 类型：Spec-Driven / 公网开放应急控制
- 状态：已完成并归档 `add-admin-high-cost-emergency-controls`

#### 背景
公网小范围开放已经有 user/IP 限流、daily quota 和账号降级，但 readiness plan 中“一键关闭高成本入口”仍缺少后台实现。若某个生成或 TTS capability 异常消耗成本，管理员需要能在后台临时关闭。

#### 本次改动
- 复用 `app_runtime_settings` 保存被关闭的 high-cost capability 列表。
- `reserveHighCostUsage()` 在 quota 预占前检查 capability 是否被关闭；关闭时返回受控 `HIGH_COST_CAPABILITY_DISABLED`，不触发 quota 预占或上游调用。
- `/admin` 增加高成本紧急开关面板，可关闭和恢复 practice / scene / TTS 等 capability。
- admin action 继续复用 `requireAdmin()`，非法 capability 返回受控失败。

#### 已运行验证
- `pnpm exec tsc --noEmit`
- `node --import tsx --test src/lib/server/high-cost-usage.test.ts 'src/app/(app)/admin/actions.test.ts'`
- `node --import tsx --test src/app/api/practice/generate/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/tts/regenerate/route.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/admin/page.test.tsx'`
- `pnpm exec openspec validate add-admin-high-cost-emergency-controls --strict --no-interactive`
- `pnpm exec openspec validate --all --strict --no-interactive`
- `pnpm run maintenance:check`
- `git diff --check`

#### 明确不收项
- 不做完整配置中心、审批流、定时开关或历史回滚列表。
- 不做自动异常检测或自动关闭。
- 不做按用户/IP/设备/来源维度的动态规则。

### [2026-05-11] 推进 admin 注册模式控制入口
- 类型：Spec-Driven / 注册准入开关后台化
- 状态：已完成并归档 `add-admin-registration-mode-control`

#### 背景
管理员已经可以在 `/admin/invites` 生成邀请码，但注册模式仍只能通过 `REGISTRATION_MODE` 环境变量切换，导致“发码”和“打开邀请注册”不在同一个后台闭环里。

#### 本次改动
- 新增 `app_runtime_settings` 运行时配置表，用于保存 `registration_mode`。
- 注册入口读取模式时优先使用后台运行时配置，缺失或异常时回退 `REGISTRATION_MODE`，最终兜底 `closed`。
- `/admin/invites` 增加注册模式面板，可查看当前模式、来源、最近修改人和时间，并切换 `closed`、`invite_only`、`open`。
- admin action 写入口继续复用 `requireAdmin()`，非法模式返回受控失败。

#### 已运行验证
- `pnpm exec tsc --noEmit`
- `node --import tsx --test src/lib/server/registration.test.ts src/app/api/auth/signup/route.test.ts src/lib/server/admin/service.test.ts 'src/app/(app)/admin/actions.test.ts'`
- `node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/admin/invites/page.test.tsx'`
- `pnpm exec openspec validate add-admin-registration-mode-control --strict --no-interactive`
- `pnpm exec openspec validate --all --strict --no-interactive`
- `pnpm run maintenance:check`
- `git diff --check`

#### 明确不收项
- 不做完整配置中心、审批流、定时切换或历史回滚列表。
- 不做自动发码、邮件/短信发送或邀请批次联动。
- 不改变 `closed` 的保守默认语义。

### [2026-05-11] 推进 admin 邀请码管理入口
- 类型：Spec-Driven / 公网注册准入运营工具
- 状态：已完成并归档 `add-admin-invite-code-management`

#### 背景
公网注册当前支持 `invite_only`，但邀请码发放仍依赖手工 SQL：维护者需要自己生成 hash、写入 `registration_invite_codes`，再用 SQL 查询使用记录。这个流程安全但不适合日常测试和小范围发放。

#### 本次改动
- 新增 `/admin/invites` 最小邀请码管理页。
- 管理员可自动批量生成或手动创建邀请码；明文只在生成成功后展示一次，数据库仍只保存 hash。
- 管理员可查看邀请码状态、使用次数、过期时间和使用记录。
- 使用记录展示注册 email、attempt 状态、失败原因、auth user id 和时间。
- 对已注册账号展示最小活动摘要：username、`access_status`、邮箱验证状态、学习统计和今日高成本用量摘要。
- 管理员可停用邀请码，并调整 `max_uses` 或过期时间。

#### 已运行验证
- `pnpm exec tsc --noEmit --pretty false`
- `node --import tsx --test src/lib/server/admin/service.test.ts 'src/app/(app)/admin/actions.test.ts' 'src/app/(app)/admin/invites/page.test.tsx' src/lib/server/registration.test.ts 'src/app/api/auth/signup/route.test.ts'`
- `pnpm exec openspec validate --all --strict --no-interactive`
- `pnpm run maintenance:check`
- `git diff --check`

#### 明确不收项
- 不做公开申请邀请码。
- 不做邮件、短信或站内信自动发送。
- 不做 recipient、渠道、批次、活动归因。
- 不做完整邀请码审计后台、异常排行或用户画像。

### [2026-05-11] 收口注册入口同 IP 频控
- 类型：Spec-Driven / 公网注册滥用前置防护
- 状态：已完成并归档 `add-registration-ip-rate-limit`

#### 背景
公开注册入口已经服务端化，也已经有邀请码、邮箱验证和高成本接口 user/IP 限流，但批量注册仍可以在“账号创建前”消耗邀请码查询、Auth 注册和 profile 资源。本轮补的是最前面的注册 IP 频控，而不是继续扩后台。

#### 本次改动
- 在 `src/lib/server/rate-limit.ts` 增加注册专用频控配置与 helper：
  - `getRegistrationIpRateLimitConfig()`
  - `enforceRegistrationIpRateLimit()`
- 新增 `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 与 `REGISTRATION_IP_LIMIT_WINDOW_SECONDS` 两个专用环境变量；未配置时使用保守默认值 `3 次 / 10 分钟`。
- `/api/auth/signup` 抽出 `handleSignupPost()`，并在 `invite_only` / `open` 模式下于邀请码校验和 Auth 注册前执行同一 IP 频控。
- 命中频控时返回受控 429 与 `requestId`，且不会继续进入 `registerWithEmailPassword()`，因此不会写 invite attempt、消耗邀请码或触发 Auth 注册。
- 公网 baseline 新增 `signup-ip-rate-limit-hits-429` 场景，当前安全口径限定在 `invite_only` 环境执行，避免在 `open` 模式真实造号。
- 同步公网开放计划、baseline runbook、后端发布清单、账号边界规则和稳定规范。

#### 验证
- 已运行：
  - `pnpm exec tsc --noEmit --pretty false`
  - `node --import tsx --test src/lib/server/rate-limit.test.ts src/lib/server/registration.test.ts 'src/app/api/auth/signup/route.test.ts'`
  - `node --import tsx --test scripts/load-public-registration-http-baseline.test.ts`

#### 明确不收项
- 不做验证码、邮箱域名策略、设备指纹、IP 信誉库或全局风控评分。
- 不做注册来源分析后台、异常 IP 看板或长期趋势报表。
- 不扩展到更复杂的按邮箱/设备/指纹组合注册风控。

#### 剩余风险
- 共享出口网络下的多用户可能更早命中同一 IP 阈值；当前只提供保守默认值与环境变量调节，不做白名单或信誉策略。
- baseline 中的注册 IP 频控场景当前只安全支持 `invite_only` 环境；`open` 模式若要验证，需要额外设计无副作用测试数据策略。
- 真实公网环境仍需按 runbook 补跑并留存结构化结果，确认当前限流后端实际为 Upstash。

### [2026-05-11] 收口最小 admin 用户状态处置入口
- 类型：Spec-Driven / 管理员账号处置入口
- 状态：已完成并归档 `add-admin-access-status-controls`

#### 背景
P0-B 已经把 `profiles.access_status`、daily quota 和高成本入口边界落进代码，但异常账号处置仍主要依赖 SQL。对于小范围公网开放，这会让“发现异常账号”到“真正止血”之间继续依赖人工查库和手工更新，和 readiness checklist 的执行口径也不一致。

#### 本次改动
- 新增 `/admin/users` 最小用户管理页，支持按 `email / userId / username / access_status` 筛选用户。
- 新增 admin service 用户列表与 `profiles.access_status` 更新能力，列表返回 `userId`、`email`、`username`、`accessStatus`、`createdAt` 最小字段。
- 新增 admin-only server action，用于切换 `active`、`disabled`、`generation_limited`、`readonly`，并返回受控 success / danger notice。
- 后台首页与导航补上“用户”入口，避免仍需手输路径进入。
- 补齐回归测试：
  - admin service 用户查询与状态更新
  - admin action 的非管理员拒绝、非法状态拒绝、成功更新
  - `/admin/users` 页面最小渲染与筛选参数透传
  - 继续保留 `/admin` 与 `/api/admin/status` 的非管理员防护测试
- 同步 `auth-api-boundaries` stable spec，新增 `admin-user-access-controls` stable spec，并把 `/admin/users` 写入公网开放计划、发布检查清单和账号边界规则文档。

#### 关键决策
- 本轮不额外补 admin HTTP route，继续以 `/admin/users` + server action 作为受控修改入口。
- 原因是现有后台操作已经统一走 server action / notice / revalidate 模式，先补 route 只会扩大表面积，不增加当前最小处置闭环价值。

#### 验证
- 已运行：
  - `pnpm exec tsc --noEmit --pretty false`
  - `node --import tsx --test middleware.test.ts src/app/api/admin/status/route.test.ts src/lib/server/admin/service.test.ts 'src/app/(app)/admin/actions.test.ts' 'src/app/(app)/admin/admin-page-state.test.ts'`
  - `node --import tsx --test 'src/app/(app)/admin/users/page.test.tsx'`

#### 明确不收项
- 不做完整运营后台、用户详情页、批量状态切换、审计日志或自动风控规则。
- 不做注册 IP 频控、邮箱域名策略、设备指纹或长期成本趋势。
- 不把 `/admin/users` 扩成完整 CRM 或异常排行榜。

#### 剩余风险
- 当前用户查询基于 `auth.admin.listUsers()` + `profiles` 组合，适合小规模处置，不适合作为大规模运营后台的最终方案。
- `/admin/users` 只覆盖最小处置闭环，没有用户详情、最近活跃、今日用量明细或 requestId 历史。
- 真实公网环境仍需要按 baseline runbook 补跑实际 cookie / invite code / 限流证据；本轮不替代真实环境留证。

### [2026-05-09] 收口公网开放真实 HTTP baseline 入口
- 类型：Spec-Driven / 发布前验证链路
- 状态：已完成并归档 `record-public-registration-http-baseline`

#### 背景
P0-A / P0-B 的代码防护已经就位，但公开前“真实 HTTP baseline”仍停留在清单要求和零散单接口脚本层。继续这样会让开放前检查依赖人工临时拼命令，也会让脚本、清单和完成态记录继续漂移。

#### 本次改动
- 抽出 `scripts/load-api-baseline-lib.ts`，复用单接口 baseline 的环境加载、请求执行、统计和 JSON 输出能力。
- 新增 `scripts/load-public-registration-http-baseline.ts` 与 `scripts/load-public-registration-http-baseline-lib.ts`，支持按场景执行：
  - 注册模式可见性
  - `closed` / `invite_only` 注册结果
  - 未验证邮箱主应用重定向 / 高成本 API 拒绝
  - Origin 拒绝
  - 正常高成本调用
  - user 限流 / IP 限流
  - daily quota
  - `generation_limited`
  - `readonly`
  - `/api/admin/status`
- runner 支持 `--config-file`、`--output` 和 blocked/skipped 结果，不会在缺少 cookie、邀请码或其他前提时静默跳过场景。
- 新增 sample：
  - `scripts/load-samples/phrases-save.sample.json`
  - `scripts/load-samples/public-registration-http-baseline.sample.json`
- 新增脚本 `pnpm run load:public-registration-baseline`。
- 新增操作手册 `docs/dev/public-registration-http-baseline-runbook.md`，统一说明 baseline 的前提准备、配置字段、执行顺序、blocked 判断和结果留证方式。
- 同步后端发布清单、公网开放计划和 stable spec，统一 baseline 执行口径。

#### 验证
- 已运行：
  - `node --import tsx --test scripts/load-public-registration-http-baseline.test.ts`
  - `pnpm run load:public-registration-baseline --dry-run --config-file=scripts/load-samples/public-registration-http-baseline.sample.json`
  - `pnpm run load:api-baseline --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json`
  - `pnpm exec openspec validate record-public-registration-http-baseline --strict --no-interactive`
  - `pnpm run maintenance:check`

#### 剩余风险
- 当前只完成了 runner、sample 和记录口径，没有替代真实 Supabase / Upstash / cookie / 邀请码 前提。
- `daily-quota-exceeded`、`generation_limited`、`readonly`、`admin status` 等场景仍需要真实环境或专门测试账号补跑。
- 本轮不做自动登录、自动造号、自动发邀请码或自动清理测试数据。

### [2026-05-09] 公网开放 P0-B 落地
- 类型：Spec-Driven / 成本防护与账号降级
- 状态：已完成并归档 `harden-public-registration-p0b`

#### 背景
P0-A 已经把注册模式、邀请码、邮箱验证和 user/IP 短窗口限流收住，但仍缺少“按天控成本”“快速降级异常账号”“防学习时长明显污染”这三块最小能力。本轮聚焦 P0-B，不扩展到完整运营后台或复杂风控。

#### 本次改动
- 新增 `supabase/sql/20260509_public_registration_p0b.sql`：
  - `profiles.access_status`
  - `user_daily_high_cost_usage`
  - `learning_study_time_anomalies`
  - `reserve_daily_high_cost_usage` / `mark_daily_high_cost_usage`
  - `user_scene_progress.last_study_seconds_at`
- 新增 `src/lib/server/high-cost-usage.ts`，集中定义 capability、默认 daily quota、预占、成功/失败标记和今日 usage 摘要。
- `practice_generate`、`scene_generate`、`similar_generate`、`expression_map_generate`、`explain_selection`、`tts_generate`、`tts_regenerate` 已接入“参数校验后、上游调用前”的 daily quota 预占。
- `assertProfileCanEnterApp`、`assertProfileCanGenerate`、`assertProfileCanWrite` 已接入主 profile helper、高成本入口和学习/表达写入口；`generation_limited` 也覆盖到 `manual-assist` 与表达 enrich 这类 AI 边路。
- 学习时长写入增加最小防污染：单次最大 60 秒，同一 `user + scene` 最小 10 秒接受间隔，异常写入 `learning_study_time_anomalies`。
- `/api/admin/status` 增加 `todayHighCostUsage` 摘要。
- 同步公网开放计划、后端发布清单、auth 边界和 learning overview 文档。

#### 验证
- 已运行：
  - `pnpm exec tsc --noEmit`
  - `pnpm exec tsx --test src/app/api/practice/generate/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/tts/regenerate/route.test.ts src/app/api/phrases/handlers.test.ts src/lib/server/auth-access-status.test.ts src/lib/server/high-cost-usage.test.ts src/lib/server/learning/study-time-guard.test.ts`
  - `pnpm exec openspec validate harden-public-registration-p0b --strict --no-interactive`
  - `pnpm exec openspec validate api-operational-guardrails --strict --no-interactive`
  - `pnpm run maintenance:check`
  - `git diff --check`

#### 剩余风险
- `manual-assist`、表达 enrich 等 AI 边路已经接入 `generation_limited`，但本轮没有把它们纳入 daily quota capability 列表，后续可按真实成本再评估是否并入。
- 仍未实现完整运营后台、封禁/解除封禁 UI、注册 IP 频控、长期成本趋势和 session heartbeat。
- 当前轮未连接真实 Supabase/Upstash 生产环境执行完整 HTTP baseline；小范围开放前仍需按公网开放计划补跑并记录。

### [2026-05-08] 修复 Review 场景回补 practice set 锚点
- 类型：Spec-Driven / Review 场景回补写回链路
- 状态：已完成并归档 `fix-review-scene-practice-set-id`

#### 背景
Review 场景回补任务来自历史 `user_scene_practice_attempts`，但 due item 没有暴露真实 `practice_set_id`。前端用 `review-inline:*` 合成 `practiceSetId` 后调用 scene practice run / attempt API，会和服务端 `user_scene_practice_sets` 归属校验冲突。

#### 本次改动
- Review due scene practice item 新增 `practiceSetId`，由服务端从 attempt 的 `practice_set_id` 映射。
- Review 页提交场景回补时复用真实 `practiceSetId`，不再生成临时 inline ID。
- 缺失 `practiceSetId` 时阻断提交并给出受控失败，不调用 scene practice mutation。
- 同步 `review-practice-signals`、`scene-practice-generation` stable spec 和 `review-writeback` 文档。

#### 明确不收项
- 不迁移历史缺失 `practice_set_id` 的异常数据。
- 不重写 Review 场景回补候选生成、排序或题目来源策略。
- 不放宽 scene practice set 服务端归属校验。

#### 验证
- 已运行：
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
  - `node --import tsx --test "src/app/(app)/review/review-page-messages.test.ts"`
  - `pnpm exec tsc --noEmit`
  - `pnpm exec eslint "src/app/(app)/review/page.tsx" "src/app/(app)/review/review-page-messages.ts" "src/app/(app)/review/page.interaction.test.tsx" "src/app/(app)/review/review-page-messages.test.ts" "src/lib/server/review/service.ts" "src/lib/utils/review-api.ts"`
  - `pnpm exec openspec validate fix-review-scene-practice-set-id --strict --no-interactive`
  - `pnpm run maintenance:check`

### [2026-05-08] 收口 Scene 主控区布局与训练入口形态
- 类型：Spec-Driven / Scene 主学习视图交互层级调整
- 状态：已完成并归档 `refine-scene-primary-controls-layout`

#### 背景
Scene 主学习视图已经有“当前下一步”任务条，但返回、标题和循环播放仍散落在 LessonReader 内部，训练进度入口也仍是默认吸边文本悬浮入口，导致主任务和辅助入口层级不够清晰。

#### 本次改动
- 当前下一步任务条收口为唯一主控区，统一承载返回、标题、当前步骤、循环播放次级动作和当前步骤主 CTA。
- 任务条新增顶部折叠按钮，默认折叠，只保留标题、返回、当前步骤与当前操作；展开后再展示辅助说明和右下角训练入口提示。
- 循环播放按钮迁移到当前步骤主 CTA 左侧，文案固定为“循环播放”，图标位于文字右侧，继续复用既有 `toggleSceneLoopPlayback` 逻辑。
- LessonReader 训练模式通过 render prop 把循环播放状态暴露给 Scene 任务条，移除训练模式内部重复的返回/标题/循环播放头部。
- `SceneTrainingCoachFloatingEntry` 改为问号图标按钮点击展开，移除默认吸边/拖拽文本入口，保留展开后的完整训练进度、步骤列表、统计摘要和已完成步骤快捷入口。
- 同步 `scene-training-flow` 和 `learning-loop-overview` 稳定规范。

#### 明确不收项
- 不改变音频播放队列、TTS fallback、循环播放底层实现或统计口径。
- 不改变 Scene training step 推导、学习状态写回、practice / variant 生成策略、API、数据库或完成判定。
- 不重写训练进度面板内部信息结构。

#### 验证
- 已运行：
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/scene-training-coach-floating-entry.test.tsx"`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
  - `pnpm exec tsc --noEmit`
  - `pnpm exec openspec validate refine-scene-primary-controls-layout --strict`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run text:check-mojibake`
  - `pnpm run maintenance:check`
  - `git diff --check`
### [2026-05-07] 收口 Scene 任务条与训练悬浮入口职责
- 类型：Spec-Driven / Scene 用户动作层级修正
- 状态：已完成并归档 `separate-scene-training-entry-roles`

#### 背景
Scene 主学习视图新增“当前下一步”任务条后，右下角训练悬浮框仍保留当前步骤主 CTA 与“下一步”提示，导致两个入口表达同一行动指令。

#### 本次改动
- 任务条保留为唯一“当前下一步 + 主 CTA”入口。
- 训练悬浮入口收口为完整进度、步骤列表、统计摘要和已完成步骤辅助快捷入口。
- 移除悬浮面板底部重复的当前步骤主 CTA 与“下一步”提示。
- 同步 `scene-training-flow` 和 `learning-loop-overview` 稳定规范。

#### 明确不收项
- 不改变训练步骤推导、学习状态、写回、完成判定、practice / variant 生成策略或浮层拖拽定位。

#### 验证
- 已运行：
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/scene-training-coach-floating-entry.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
  - `pnpm exec tsc --noEmit`
  - `pnpm exec openspec validate separate-scene-training-entry-roles --strict`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run text:check-mojibake`
  - `pnpm run maintenance:check`
  - `git diff --check`

### [2026-05-07] 收口 OpenSpec archive 乱码防护
- 类型：Spec-Driven / 维护规则与归档文本防护
- 状态：已完成并归档 `guard-openspec-archive-mojibake`

#### 背景
`clarify-scene-review-next-step` 归档后的 `tasks.md` 出现乱码，而 `text:check-mojibake` 对 `openspec/changes/archive/` 整体跳过，导致归档证据链没有被完成态检查覆盖。

#### 本次改动
- 修复当前已发现的归档 `tasks.md`，恢复可读 UTF-8。
- `text:check-mojibake` 保留历史 archive 默认跳过，但额外扫描本轮新建、暂存、修改或未跟踪的 archive 文本文档。
- `maintenance:check` 纳入乱码扫描，完成态维护检查不再只依赖人工单独运行文本检查。
- 同步 `project-maintenance` stable spec，明确本轮触碰的 OpenSpec archive 文档必须保持可读 UTF-8。

#### 明确不收项
- 不全量清理历史 archive 目录。
- 不引入新的编码检测依赖。
- 不改变 OpenSpec CLI 行为、产品功能、API、数据库或学习主链路。

#### 验证
- 已运行：
  - `pnpm run text:check-mojibake`
  - `pnpm exec openspec validate guard-openspec-archive-mojibake --strict`
  - `pnpm exec openspec validate --all --strict`
  - `git diff --check`
  - `pnpm run maintenance:check`

### [2026-05-07] 收口 Scene / Review 下一步主路径
- 类型：Spec-Driven / Scene 与 Review 用户动作层级
- 状态：已完成并归档 `clarify-scene-review-next-step`

#### 背景
Scene 与 Review 主链路已经能完成训练、练习、变体和复习写回，但用户可见层仍容易被浮动入口、来源回看和管理动作稀释。本轮只调整展示层级，把“当前该做什么”放回主路径，不改变后端状态、调度或 AI 评分语义。

#### 本次改动
- Scene 主学习视图新增“当前下一步”任务条，复用现有 training session、practice snapshot 与 variant unlock 状态。
- 右下角训练浮动入口保留完整进度、步骤列表和快捷入口，不再作为唯一下一步提示。
- variant-study 页保留“基于此变体生成练习”为学习主动作，将“删除变体”降为辅助危险操作。
- Review 来源场景入口增加“辅助回看”分区，继续保留查看原场景 / 回到场景继续练，但不抢底部主 CTA。

#### 本轮收口项
- Scene 主视图能直接看到当前下一步与主动作。
- Scene 变体学习页的学习动作与删除管理动作分层。
- Review 来源回看与场景回补入口明确为辅助路径。

#### 明确不收项
- 不新增数据库字段、API 字段或 AI 评分。
- 不改变 scene session、practice run / attempt / complete、review submit 或 Review 调度算法。
- 不重写 Scene practice / variant 生成策略。
- 不抽全局页面骨架，不做全站视觉重构。

#### 验证
- 已运行：
  - `pnpm exec tsc --noEmit`
  - `pnpm run test:interaction:scene-detail`
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
  - `node --import tsx --test "src/app/(app)/review/review-page-selectors.test.ts" "src/app/(app)/review/review-page-messages.test.ts"`
  - `pnpm run lint`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run maintenance:check`
  - `pnpm run text:check-mojibake`
  - `git diff --check`

### [2026-05-07] 收口维护检查阻塞与 practice generate 死代码
- 类型：Fast Track / Cleanup / 测试维护
- 状态：已完成

#### 背景
Review 递进式练习收尾后，仓库仍有两类维护尾巴：`tsc --noEmit` 被旧测试夹具类型阻塞，`lint` 被 React hooks 新规则和 unused 代码阻塞；同时 `practice/generate` 在迁入统一 `request-schemas` 后仍残留旧本地校验 helper。

#### 本次改动
- 补齐 chunks、scene、TTS、practice generate 相关测试夹具类型，让 `pnpm exec tsc --noEmit` 恢复通过。
- 收口 `pnpm run lint` 的 error / warning：删除未用 import 与变量，补齐安全的 hook dependency，保留必要的 URL / 训练态同步说明。
- 删除 [src/app/api/practice/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/practice/generate/route.ts) 中已不被 handler 使用的旧 `toValidPayload`、`measureScenePayload`、体积限制常量和 `sanitizeExerciseCount`；请求校验继续由 `src/lib/server/request-schemas.ts` 承接。

#### 影响范围
- 影响模块：测试夹具、lint 维护、`practice/generate` 死代码清理。
- 是否影响主链路：否。
- 是否影响用户可感知行为：否。
- 是否需要同步正式 CHANGELOG：否。

#### 验证
- 已运行：
  - `pnpm exec tsc --noEmit`
  - `pnpm run lint`
  - `node --import tsx --test src/app/api/practice/generate/route.test.ts src/lib/server/request-schemas.test.ts src/lib/utils/practice-generate-api.test.ts`
  - `pnpm run maintenance:check`
  - `pnpm run text:check-mojibake`
  - `git diff --check`

### [2026-05-07] Review 递进式练习正式信号收口
- 类型：Spec-Driven / Review 递进式练习正式化
- 状态：已完成并归档 `formalize-review-progressive-practice`

#### 背景
Review 已经具备微回忆、熟悉度、变体改写、完整输出和最终反馈阶段，但迁移改写与完整输出覆盖此前缺少稳定后端信号。本轮按产品北极星“回忆、使用、迁移”收口，不把页面训练位继续停留在本地草稿语义。

#### 本次改动
- 为 `phrase_review_logs` 增加 `variant_rewrite_status`、`variant_rewrite_prompt_id`、`full_output_coverage` nullable 字段与约束。
- 普通表达 review submit 会写入变体改写完成状态、固定改写方向和完整输出目标表达覆盖结果。
- 新增确定性目标表达覆盖 helper，只判断完整输出是否包含目标表达，不调用 AI。
- due 排序和下一次复习节奏保守消费新增信号，继续保留 `again / hard / good` 主方向。
- `getReviewSummary()` / learning dashboard 增加迁移改写、目标表达覆盖和未覆盖摘要字段，Today 只消费服务端摘要。
- 更新 Review 页面提交 payload、调度提示和阶段文案，明确新增结果是正式训练信号但不是 AI 质量评分。
- 同步 review progressive practice、practice signals、scheduling rules 和 writeback 文档。

#### 本轮收口项
- 变体改写完成状态进入正式事件层。
- 完整输出是否覆盖目标表达进入正式事件层。
- 新增信号的 API schema、服务端写入、summary、调度解释、页面提交与文档边界同步。

#### 明确不收项
- 不引入 AI 评分、语法评分、自然度评分或语气评分。
- 不把用户改写草稿或完整输出全文沉淀为长期表达资产字段。
- 不重写 `again / hard / good` 主调度算法。
- 不让 `today` 直接解释原始 `phrase_review_logs`。
- 不改变 scene practice 回补正式链路。

#### 验证
- 已运行：
  - `node --import tsx --test src/app/api/review/handlers.test.ts src/lib/server/review/service.logic.test.ts "src/app/(app)/review/review-page-selectors.test.ts" src/features/today/components/today-page-selectors.test.ts`
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx" src/features/today/components/today-page-client.test.tsx`
  - `pnpm exec eslint "src/app/(app)/review/page.tsx" "src/app/(app)/review/review-page-stage-panel.tsx" "src/app/(app)/review/review-page-selectors.ts" "src/app/(app)/review/use-review-page-data.ts" src/app/api/review/handlers.ts src/lib/server/review/service.ts src/lib/server/request-schemas.ts src/lib/utils/review-api.ts src/lib/utils/learning-api.ts src/features/today/components/today-page-selectors.ts src/features/today/components/today-page-client.tsx`
  - `node_modules\.bin\openspec.CMD validate formalize-review-progressive-practice --strict`
  - `node_modules\.bin\openspec.CMD archive formalize-review-progressive-practice --yes`
  - `node_modules\.bin\openspec.CMD validate --all --strict`
  - `pnpm run maintenance:check`
  - `pnpm run text:check-mojibake`
  - `git diff --check`
- 已尝试：
  - `pnpm exec tsc --noEmit`，当前被既有 unrelated 测试类型问题阻塞，已确认其中本轮相关的 Today 默认 dashboard 缺字段问题已修复；剩余阻塞来自 chunks / scene / tts / practice-generate 旧测试类型。

### [2026-05-06] 收口 Chunks 工作台用户动作层级
- 类型：Spec-Driven / Chunks 工作台体验收口
- 状态：已完成并归档 `streamline-chunks-workbench`

#### 背景
Chunks 页面同时承载表达库、句子沉淀、relation / cluster、expression map、AI 候选和 review 入口，普通用户的学习主路径容易被高级整理动作稀释。本轮按产品北极星收口为“表达资产用于回忆、使用、迁移”。

#### 本次改动
- 表达卡片补上“查看详情”主入口，并让表达复习、来源场景回流优先于 expression map 等整理动作。
- 句子卡片补上来源场景回流，保留句中表达提取，不再把 sentence 当成 expression review 入口展示。
- 将“查看详情”和“查看整组”文案分开，避免同一层级动作含义混淆。
- 把“补全当前 chunk”改为“补全当前表达”，减少用户可见技术名词。
- 同步 `chunks-data-mapping`、`component-library` 和 stable spec，明确入口层级调整不得改变保存、relation、cluster、map、review session 与缓存失效副作用。

#### 本轮收口项
- 新增 `chunks-workbench-user-path` stable spec。
- 为 `chunks-data-contract` 增加“入口层级调整不得破坏数据副作用契约”。
- 明确 Chunks 详情、expression map、cluster 操作容器继续留在 feature 私有边界。

#### 明确不收项
- 不改数据模型、后端 relation / cluster 语义、review 调度算法或 AI 生成策略。
- 不删除 expression map、AI 候选、cluster 维护、move / detach / merge 等高级能力。
- 不把 `FocusDetailSheet`、`ExpressionMapSheet`、`MoveIntoClusterSheet` 上移到 shared。

#### 验证
- 已运行：
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/app/(app)/chunks/page.interaction.test.tsx" "src/app/(app)/chunks/use-manual-sentence-composer.test.tsx"`
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/chunks/components/focus-detail-actions.interaction.test.tsx" "src/features/chunks/components/focus-detail-content.interaction.test.tsx"`
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/use-generated-similar-sheet.test.tsx" "src/app/(app)/chunks/use-expression-cluster-actions.test.tsx" "src/features/chunks/components/expression-map-sheet.interaction.test.tsx"`
  - `node --import tsx --test "src/app/(app)/chunks/chunks-page-logic.test.ts" "src/app/(app)/chunks/chunks-save-contract.test.ts" "src/app/(app)/chunks/chunks-focus-detail-presenters.test.ts"`
  - `pnpm exec openspec validate --changes "streamline-chunks-workbench" --strict`
  - `pnpm exec openspec validate --specs --strict --no-interactive`
  - `pnpm run text:check-mojibake`
  - `pnpm run maintenance:check`
  - `git diff --check`

### [2026-04-22] 瘦身核心维护入口文档
- 类型：Spec-Driven / 核心维护文档瘦身
- 状态：已完成

#### 背景
前几轮已经完成维护检查脚本、archive 收尾和入口可读性第一轮优化，但 `AGENTS.md` 仍承载了过多执行细则，`docs/README.md`、`CHANGELOG.md` 与维护手册之间也需要进一步明确职责边界。

#### 本次改动
- 精简 `AGENTS.md`，只保留强约束、任务分流、修改前输出、OpenSpec 红线、测试/文档/提交约束。
- 重写 `docs/README.md` 为短入口，保留文档分层、最小阅读路径和常见问题定位。
- 更新 `docs/dev/project-maintenance-playbook.md`，承接从 `AGENTS.md` 迁出的执行细则入口。
- 在 `CHANGELOG.md` 顶部声明正式发布记录边界，避免写入过程性维护记录。
- 同步 `openspec/specs/project-maintenance/spec.md`，固定 AGENTS 瘦身与核心入口可读性要求。

#### 本轮收口项
- `AGENTS.md` 从长规则文档收敛为强约束入口。
- 核心文档入口改成短路径，降低 Fast Track 和普通维护阅读成本。
- `CHANGELOG.md` 明确只记录用户可感知变化，开发过程回到 dev-log。

#### 明确不收项
- 不清理所有历史 archive 和旧 proposal。
- 不重写所有 feature-flow、domain-rules 或 system-design 文档。
- 不新增自动文档格式化或乱码修复工具。

#### 影响范围
- 影响模块：`AGENTS.md`、`docs/README.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/dev-log.md`、`CHANGELOG.md`、`openspec/specs/project-maintenance/spec.md`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否改业务代码、API、数据库、缓存或 UI：否

#### 测试 / 验证
- 已运行：
  - `pnpm exec openspec validate slim-core-maintenance-docs --strict`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run text:check-mojibake`
  - `git diff --check`
  - `pnpm run maintenance:check`

### [2026-04-30] 强化 AI 协作中文输出规则
- 类型：Spec-Driven / 维护规范
- 状态：已完成并归档 `enforce-chinese-ai-output`

#### 背景
本轮发现“所有输出使用中文”虽然已经写在 `AGENTS.md`，但 stable spec 和接需求模板没有形成同等清晰的长期契约，后续模型只读取部分项目规范时仍可能输出纯英文回答或生成英文任务项。

#### 本次改动
- 在 `AGENTS.md` 明确不得在用户未要求时输出纯英文回答。
- 在 `docs/dev/change-intake-template.md` 增加“输出语言”检查项。
- 在 `openspec/specs/project-maintenance/spec.md` 新增 AI 协作输出默认中文的 requirement。
- 新增并归档 `openspec/changes/archive/2026-04-30-enforce-chinese-ai-output/`，记录本轮收口项、不收项和风险边界。

#### 明确不收项
- 不批量重写历史 archive、历史 dev-log 或既有英文技术术语。
- 不做全量文档乱码清理。

#### 验证
- 已运行：
  - `rg -n "不得.*纯英文|默认使用中文|输出语言|AI 协作输出" AGENTS.md docs/dev/change-intake-template.md openspec/specs/project-maintenance/spec.md openspec/changes/archive/2026-04-30-enforce-chinese-ai-output`
  - `git diff --check`
  - `pnpm run maintenance:check`
- 结果：
  - OpenSpec 全量校验通过。
  - `git diff --check` 仅提示工作区 CRLF warning。
  - `pnpm run maintenance:check` 仍因上一轮 `prepare-scene-random-review-audio` 已完成但未归档而失败；本轮 `enforce-chinese-ai-output` 已归档。
  - `pnpm exec openspec list --json`

### [2026-04-30] scenes 随机复习播放改为 review pack 优先
- 类型：Spec-Driven / 音频播放链路
- 状态：已完成并归档 `prepare-scene-random-review-audio`

#### 背景
scenes 列表随机复习播放原本依赖逐场景播放结束后由页面 JS 切到下一段。后台、锁屏或移动端省电策略下，当前音频可以继续播，但下一段切换和重新 `play()` 不稳定。用户目标是让场景列表复习尽量支持后台连续播放。

#### 本次改动
- scenes 随机复习播放优先组装少量合格场景为单个 `scene review pack`，通过一个 loop 音频播放。
- review pack 详情加载优先读 scene detail cache，未命中再请求接口并写回缓存。
- 本轮播放内复用已加载 scene detail，减少 pack 失败回退后的重复读取。
- review pack 组包改为最佳努力策略，单个候选详情加载失败时跳过该候选，其他可用场景仍可继续组包。
- review pack 失败时回退逐场景 scene full 队列，并保留失败跳过和整轮失败停止提示。

#### 明确不收项
- 不做完整离线 / PWA。
- 不承诺所有浏览器锁屏或后台状态下都允许启动新音频。
- 不引入 ffmpeg 或新的音频拼接服务。
- 不把 scene full 自动降级为逐句串播。

#### 验证
- 已运行：
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx"`
  - `node --import tsx --test "src/lib/utils/tts-api.scene-loop.test.ts"`
  - `pnpm exec openspec validate prepare-scene-random-review-audio --strict`
  - `pnpm exec openspec validate --all --strict`
  - `git diff --check`
- 结果：
  - scenes 交互测试 17 条通过。
  - scene loop TTS 测试 5 条通过。
  - OpenSpec 单 change 与全量校验通过。
  - `git diff --check` 仅提示工作区 CRLF warning。

### [2026-04-30] scenes review pack 改为固定顺序预准备
- 类型：Spec-Driven / 音频播放链路
- 状态：已完成并归档 `prepare-deterministic-scene-review-pack`

#### 背景
上一轮 review pack 已经把“播放开始后依赖 JS 切下一段”的问题降到最低，但仍保留随机起点。随机起点会让页面难以提前准备用户马上要播放的 pack，点击后仍可能等待 scene detail 或 `/api/tts`。用户目标是后台连续播放，随机不是必须。

#### 本次改动
- scenes 复习入口从“随机播放”收敛为“循环播放”。
- 合格场景按当前列表顺序取前几个，生成 deterministic review pack。
- 页面识别出合格场景后，会后台预准备同一个 review pack。
- 用户点击时优先播放同一 pack payload，从而最大化 scene detail cache、浏览器 Cache Storage 和内存 URL 命中。
- review pack 失败时仍保留逐场景 scene full 回退队列。

#### 明确不收项
- 不做完整离线 / PWA。
- 不引入 Media Session。
- 不新增服务端专用音频包 API。
- 不引入 ffmpeg 或新的音频拼接服务。
- 不承诺所有浏览器锁屏或后台状态下都允许启动新音频。

#### 验证
- 已运行：
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx"`
  - `node --import tsx --test "src/lib/utils/tts-api.scene-loop.test.ts"`
  - `pnpm exec openspec validate prepare-deterministic-scene-review-pack --strict`
  - `pnpm exec openspec validate --all --strict`
  - `git diff --check`
  - `pnpm run maintenance:check`
- 结果：
  - scenes 交互测试 17 条通过。
  - scene loop TTS 测试 5 条通过。
  - OpenSpec change 与全量校验通过。
  - `git diff --check` 仅提示工作区 CRLF warning。
  - archive 后 `pnpm run maintenance:check` 通过。

### [2026-04-30] 强化 scenes review pack 准备态与弱网策略
- 类型：Spec-Driven / 音频播放链路
- 状态：已完成并归档 `enhance-scene-review-pack-readiness`

#### 背景
scenes 循环复习已经通过 review pack 降低后台切歌依赖，但自动准备状态不可见、弱网下仍会主动准备较重音频，且 pack 准备和回退缺少本地事件，后续排查不够直接。

#### 本次改动
- review pack 队列改为同日稳定顺序：同一天内 pack key 和 payload 稳定，跨天自然变化。
- 导出并复用统一弱网 / 省流量判断；弱网下跳过自动准备，用户点击后仍可尝试准备并播放。
- hook 暴露 `reviewPackPrepareStatus`，scenes 循环播放按钮通过 title 展示准备中、已准备好、弱网跳过或准备失败状态。
- 新增本地事件记录 review pack 准备开始、准备完成、准备跳过、准备失败、播放开始和回退逐场景队列。

#### 明确不收项
- 不做 Media Session。
- 不做完整离线 / PWA / Service Worker。
- 不新增服务端专用 review pack API。
- 不改变 `/api/tts` 协议或浏览器 Cache Storage 容量策略。
- 不接跨设备或服务端 BI。

#### 验证
- 已运行：
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx"`
  - `node --import tsx --test "src/lib/utils/tts-api.scene-loop.test.ts"`
  - `pnpm exec openspec validate enhance-scene-review-pack-readiness --strict`
  - `pnpm exec openspec validate --all --strict`
  - `git diff --check`
  - `pnpm run build`
- 结果：
  - scenes 交互测试 18 条通过。
  - scene loop TTS 测试 5 条通过。
  - OpenSpec 单 change 与全量校验通过。
  - `git diff --check` 仅提示工作区 CRLF warning。
  - Next.js 构建通过。

### [2026-04-30] 同步较大改动到产品与技术总览
- 类型：Spec-Driven / 维护规范与 meta 文档
- 状态：已完成并归档 `sync-major-change-meta-docs`

#### 背景
scenes 循环复习后台播放已经同步到 CHANGELOG、音频 system-design 和 audio stable spec，但它同时属于产品能力亮点和音频技术链路变化，也需要进入 `docs/meta/product-overview.md` 与 `docs/meta/technical-overview.md`。否则后续对外介绍或新维护者读取 meta 文档时，会继续看到旧现状。

#### 本次改动
- 在产品总览补充 scenes 循环复习后台播放的用户价值、关键能力和稳定性优化口径。
- 在技术总览补充 deterministic review pack、浏览器音频缓存命中、后台预准备和单个 `<audio loop>` 连续播放的技术口径。
- 在 project-maintenance stable spec 中新增“较大改动必须同步产品与技术总览”规则。
- 在接需求模板增加产品/技术总览同步检查项。

#### 明确不收项
- 不重写整份产品总览或技术总览。
- 不清理历史 dev-log 和历史 archive。
- 不新增自动检测脚本；先通过 stable spec 与接入模板约束。

#### 验证
- 已运行：
  - `pnpm exec openspec validate sync-major-change-meta-docs --strict`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run maintenance:check`
  - `git diff --check`
- 结果：
  - OpenSpec 单 change 与全量校验通过。
  - archive 后 `pnpm run maintenance:check` 通过。
  - `git diff --check` 仅提示工作区 CRLF warning。

### [2026-04-20] 收紧完成态提交与正式 CHANGELOG 收口规则
- 类型：文档 / 规范治理
- 状态：已完成
#### 背景
此前仓库已经补上“Spec-Driven 完成态提交前必须先收尾”的主规则，但正式 `CHANGELOG.md` 的进入条件仍然偏松，容易在“新功能已经作为完成态收尾提交”时漏记用户可感知变化。

#### 本次改动
- 继续统一 `AGENTS.md`、`openspec/specs/project-maintenance/spec.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/openspec-workflow.md` 的口径：
  - 若本次属于完成态提交 / 收尾提交，必须先完成 tasks、文档、stable spec、archive，再提交代码。
  - 若本次收尾结果已进入或将直接进入 `main`，且存在用户可感知变化，则必须同步更新正式 `CHANGELOG.md`。
  - 若代码尚未进入 `main`，不得把过程性记录提前写入正式 `CHANGELOG.md`。
- 补写“按句子生成场景”能力的正式 `CHANGELOG.md` 条目，避免明显用户新功能遗漏发布记录。

#### 影响范围
- 影响模块：`AGENTS.md`、`openspec/specs/project-maintenance/spec.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/openspec-workflow.md`、`CHANGELOG.md`
- 是否影响主链路：否
- 是否影响用户可感知行为：否，本轮仅补齐规则与发布记录

#### 测试 / 验证
- 待执行：
  - `pnpm run text:check-mojibake`
  - `git diff --check`
  - 关键规则检索确认口径一致

### [2026-04-20] 收敛 stable spec 与维护入口边界
- 类型：文档 / 规范治理
- 状态：已完成
#### 背景
随着 `openspec/specs/*`、`docs/*` 和 `AGENTS.md` 持续演进，仓库里逐渐出现了三类问题：
- 维护入口文档之间的流程口径不完全一致，尤其是 Fast Track / Spec-Driven、OpenSpec 阶段与 CHANGELOG 更新规则。
- 部分 stable spec 已经归档进主规范，但仍保留归档占位文案、混合格式或缺少长期文档归宿说明。
- `learning-loop-overview` 逐步吸收了 today、chunks、review、sentence、scene 音频等专项细节，开始偏离“闭环总览”定位。

#### 本次改动
- 对齐并收口维护入口文档：
  - 更新 `AGENTS.md`，补齐 `system-design / docs/dev` 阅读入口，统一 Spec-Driven 触发条件、OpenSpec 阶段和 CHANGELOG 规则。
  - 更新根 `README.md`，统一 OpenSpec 触发口径、本地运行推荐入口与 `docs/dev/*` 实际路径。
  - 更新 `docs/README.md`、`docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md`，固定“总入口 -> dev 目录页 -> 维护主手册 -> openspec workflow” 的导航关系。
- 收口 stable spec 的基础质量：
  - 清掉 10 份 stable spec 中残留的 `TBD - created by archiving change ...` Purpose 占位。
  - 统一 `openspec/specs/*` 的开头格式，移除残留的 `# <capability> Specification` 顶级标题，全部统一为 `## Purpose` 起始。
  - 为一批专项 capability 的 `Purpose` 补充“在学习闭环中承接什么边界”的说明，形成从总览 spec 到专项 spec、再从专项 spec 回指总览职责的双向导航。
- 补齐 spec 到 docs 的长期归宿导航：
  - 更新 `docs/system-design/README.md`，补充常见 stable spec 与实现文档的对照。
  - 更新 `docs/domain-rules/README.md`，补充当前承接的 stable spec 范围。
  - 更新 `docs/README.md`，补充 stable spec 应转去 `domain-rules / system-design / feature-flows / dev` 哪一层继续看的查找建议。
- 收窄 `learning-loop-overview` 的职责边界：
  - today 聚合契约指回 `today-learning-contract`
  - chunks 数据副作用与缓存一致性指回 `chunks-data-contract` 与 `runtime-cache-coherence`
  - review 阶段、正式信号、排序节奏与来源契约分别指回 `review-progressive-practice`、`review-practice-signals`、`review-scheduling-signals`、`review-source-contract`
  - sentence 内部推进与完成语义指回 `sentence-progression` 与 `sentence-completion-tracking`
  - scene 音频按钮与播放编排指回 `audio-action-button-consistency` 与 `audio-playback-orchestration`
- 额外补了两份专项 spec 的边界说明：
  - `review-experience` 明确只承接完成反馈与下一步入口体验
  - `scene-full-audio-reliability` 明确只承接 scene full 专项可靠性边界
  - `scene-practice-generation` 明确只承接练习题生成质量与生成中反馈边界
- 继续收窄句子相关 capability 的职责：
  - `sentence-completion-tracking` 明确只承接服务端记录、API 暴露与聚合消费语义
  - `scene` 内部步骤、`scene_practice` 与 `done` 推进继续统一回指 `sentence-progression`
  - 进一步收紧 `sentence-completion-tracking` 的 API 与聚合表述，不再把 `scene_practice` / `done` 并列写成自身主职责
- 反向补强维护规则，减少后续零散修补：
  - 在 `AGENTS.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/openspec-workflow.md`、`docs/dev/README.md` 增加“稳定性收口检查”要求
  - 明确需求开始阶段就要判断是否同时暴露旧规则漂移、重复语义、缺失文档、缺失测试或边界不清
  - 明确 proposal / tasks / dev-log 需要记录“本轮收口项 / 明确不收项”，避免已识别问题再次以后补修补的方式反复出现
  - 继续把这套规则落到 `docs/dev/change-intake-template.md` 与 `openspec/specs/project-maintenance/spec.md`，让接需求阶段就能结构化记录稳定性收口项
  - 继续把这套规则落到 `docs/dev/openspec-workflow.md` 的 `proposal / design / tasks` 模板正文，减少提案创建后再人工补结构
  - 继续把这套规则落到 `.codex/skills/openspec-propose`、`.codex/skills/openspec-apply-change`、`.codex/skills/openspec-explore`，避免自动生成或实施阶段仍沿用旧口径
  - 继续把这套规则落到仓库级 `README.md` 与 `.codex/skills/openspec-archive-change`，补齐从总入口到归档阶段的最后一段口径

#### 影响范围
- 影响模块：`AGENTS.md`、根 `README.md`、`docs/README.md`、`docs/dev/*`、`docs/domain-rules/README.md`、`docs/system-design/README.md`、`openspec/specs/*`
- 是否影响主链路：否，不改变业务实现或用户可见功能
- 是否影响用户可感知行为：否
- 是否需要同步文档：本轮已同步完成

#### 测试 / 验证
- 已运行检索与人工回读：
  - 检查 `openspec/specs/*` 中 `TBD - created by archiving change` 已清零
  - 检查 `openspec/specs/*` 中 `# <capability> Specification` 顶级标题已清零
  - 回读 `AGENTS.md`、根 `README.md`、`docs/README.md`、`docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md`
  - 回读 `learning-loop-overview` 与相关专项 spec，确认总览与专项 capability 的职责边界已收窄
- 未运行测试：
  - 未跑代码单测 / 交互测试，因为本轮仅涉及文档与规范文本

#### 风险 / 未完成项
- 当前主要完成了入口治理和边界收口，但没有对所有 capability 做逐条语义审计，仍可能存在个别细部措辞重叠。
- 文档体系已经更稳定，但后续新增 capability 若不继续遵守“总览不重复展开专项规则”的原则，仍可能再次漂移。

#### 后续计划
- 后续若继续治理，优先做专项 capability 的增量守护，而不是再次大范围改写总览 spec。
- 若后续出现新的跨层规则冲突，优先先收 `Purpose` 和目录入口说明，再决定是否需要动 `Requirements`。

### [2026-04-17] TTS 预热收益指标与本地 summary
- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
scene detail 已经具备 block-first 预热、idle 增量预热、播放驱动提权和 scene full 准备态，但原有 observability 只能看到 hit / miss / ready / fallback，无法判断某次命中是否真正来自预热。
#### 本次改动
- 新增 `src/lib/utils/tts-warmup-registry.ts`，按 TTS cache key 记录短时 warmup 状态和来源。
- 首屏预热、idle 预热和播放驱动提权会分别标记 `initial`、`idle`、`playback`。
- sentence / block / chunk / scene full 播放事件新增 `wasWarmed` 与 `warmupSource` 字段。
- 新增 chunk 播放 hit / miss 本地事件：`chunk_audio_play_hit_cache` / `chunk_audio_play_miss_cache`。
- `/admin/observability` 增加 TTS 预热收益 summary，展示 block warm/cold hit rate、scene full ready/fallback 和来源拆分。
- 更新 `docs/system-design/audio-tts-pipeline.md`，补充 warmup registry、事件字段和 summary 口径。
#### 影响范围
- 影响模块：`tts-api`、`audio-warmup`、`scene-audio-warmup-scheduler`、`client-events`、`admin observability`
- 是否影响主链路：否，不改变播放 API 或 `/api/tts` 协议
- 是否影响用户可感知行为：管理端可看到更多本地统计；普通用户无直接变化
- 是否需要同步文档：是，已同步音频链路文档
#### 测试 / 验证
- `node --import tsx --test src/lib/utils/tts-warmup-registry.test.ts src/lib/utils/audio-warmup.test.ts src/lib/utils/scene-audio-warmup-scheduler.test.ts src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/utils/client-events.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/components/admin/client-events-panel.test.tsx`
#### 风险 / 未完成项
- summary 只基于当前浏览器最近事件，样本量小的时候 gain 可能波动。
- 不接正式 BI、不跨设备同步、不写数据库。
- 正式 `CHANGELOG.md` 按仓库规则留待合并 `main` 后再更新。

### [2026-04-16] 第六阶段：真实学习闭环验收与最小可回看化
- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
前五阶段已经把后端接口治理、数据边界、上线准备、today 编排、音频可靠性和学习反馈补到一条可上线主链路，但客户端业务事件仍然只停留在 console，缺少最小可回看能力；同时，`review` 在队列清空后还缺少更自然的“这轮先收住了”收束反馈，真实学习闭环也缺一份可执行验收清单。
#### 本次改动
- 扩展 `src/lib/utils/client-events.ts`，为客户端业务事件与失败摘要增加本地持久化、读取、清理和订阅能力，默认保留最近 `120` 条记录。
- 新增 `/admin/observability` 页面与 `ClientEventsPanel`，支持查看最近业务事件、关键字筛选、按 `event / failure` 分类过滤与一键清空。
- `review` 队列清空时，阶段面板会展示“这轮回忆先收住了”的结果摘要，并提供返回 `today` 的 CTA。
- 新增 [real-learning-loop-acceptance-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/real-learning-loop-acceptance-checklist.md)，把 `today -> scene -> save phrase -> review -> return today` 的真实链路验收步骤收成文档。
- 更新 [backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)，补上 `/admin/observability` 可见性和真实学习闭环验收要求。
#### 影响范围
- 影响模块：`client-events`、`admin`、`review`、`docs/dev`
- 是否影响主链路：是，但属于低风险体验收口
- 是否影响用户可感知行为：是，`review` 队列清空反馈更自然，管理端可以本地回看最近业务事件
- 是否需要同步文档：是
#### 测试 / 验证
- `node --import tsx --test src/lib/utils/client-events.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/components/admin/client-events-panel.test.tsx`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 当前业务事件仅保存在本地浏览器，不是正式埋点或跨设备日志链路。
- 正式 `CHANGELOG.md` 仍按仓库规则留待合并 `main` 后再更新。
### [2026-04-16] 第五阶段：学习结果反馈与最小业务级可观测性

- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
第四阶段已经把 `today` 编排和音频可靠性收口到了可上线基线，但页面里的“我刚完成了什么、下一步为什么是这个”反馈仍偏弱。同时，当前已有 `requestId` 和服务端结构化日志，客户端关键学习动作还缺最小业务级事件摘要，排查用户在哪一步掉线仍不够直接。
#### 本次改动
- 新增 `src/lib/utils/client-events.ts`，提供最小 `recordClientEvent()` / `recordClientFailureSummary()`。
- `today` continue 卡片补充结果摘要，复用 `phrasesSavedToday / savedPhraseCount / dueReviewCount` 展示当前成果与下一步。
- `today` 打开 continue 场景与 review 时，分别记录 `today_continue_clicked`、`today_review_opened`。
- review 提交成功后，复用 `submitPhraseReviewFromApi()` 的 `summary` 给出“还剩多少”或“本轮先收住”的差异化提示，并记录 `review_submitted`。
- scene 学习 session 首次完成时，toast 会附带“已沉淀多少表达 / 下一步建议”，并记录 `scene_learning_completed`。
- scene full 播放失败时，记录 `tts_scene_loop_failed`；若能定位到当前句或首句，则提供“改为逐句跟读” CTA，点击后记录 `tts_scene_loop_fallback_clicked`。
- 同步更新 `today`、`review`、`audio` 相关文档与本阶段 OpenSpec tasks。
#### 影响范围
- 影响模块：`today`、`review`、`scene detail`、`lesson audio`、`docs/feature-flows`、`docs/system-design`
- 是否影响主链路：是
- 是否影响用户可感知行为：是
- 是否需要同步文档：是
#### 测试 / 验证
- `node --import tsx --test src/lib/utils/client-events.test.ts "src/app/(app)/scene/[slug]/scene-detail-notify.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/lesson/audio/use-lesson-reader-playback.test.tsx src/features/today/components/today-sections.test.tsx`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx" "src/features/today/components/today-page-client.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 当前业务事件仍只输出到客户端 console，还没进入正式埋点链路。
- 正式 `CHANGELOG.md` 继续按仓库规则留待合并 `main` 后更新；本轮已在 `openspec/changes/improve-learning-feedback-and-observability/changelog.md` 准备草案。

### [2026-04-16] 第四阶段：today 编排解释、TTS 可靠性与最小安全头

- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
第四阶段的目标是把前三阶段已经建立的接口治理基线继续往“体验稳定”和“可上线”推进一小步，重点不再是新增平台层，而是收口 `today` 的任务解释一致性、TTS 批量重生成与 scene full 播放的稳定性，以及补上最小安全头基线。
#### 本次改动
- `today` 任务构建逻辑现在会为任务补齐稳定元数据：`priorityRank`、`shortReason`、`explanationSource`。
- `today` 页面在学习路径区块顶部新增首要任务解释，能够明确说明当前为什么先推荐 continue / repeat / review。
- `playSceneLoopAudio()` 在 scene full 失败时改为抛出受控中文提示，不再直接暴露原始错误。
- `regenerateChunkTtsAudioBatch()` 改成有界并发执行，当前并发上限为 `3`，并对失败项做结构化日志记录与最终汇总抛错。
- `next.config.ts` 新增最小安全头：`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`。
- 同步更新了音频链路文档、today 推荐文档、发布检查清单与本阶段 OpenSpec tasks。
#### 影响范围
- 影响模块：`today`、`tts`、`next.config.ts`、`docs/dev`、`docs/system-design`、`docs/feature-flows`
- 是否影响主链路：是，但属于低风险收口，不改变学习主语义
- 是否影响用户可感知行为：是，today 页面会显示更明确的推荐原因，scene full 错误提示更稳定
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/features/today/components/today-page-selectors.test.ts`
  - `node --import tsx --import ./src/test/setup-dom.ts --test src/features/today/components/today-sections.test.tsx src/features/today/components/today-page-client.test.tsx`
  - `node --import tsx --test src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/server/tts/service.test.ts src/app/api/tts/regenerate/route.test.ts`
  - `node --import tsx -e "const mod = await import('./next.config.ts'); const config = mod.default?.default ?? mod.default; console.log(typeof config.headers)"`
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 这次只补了最小安全头，没有引入 CSP，避免误伤现有前端资源加载。
- `tts` 的上游 `Connect Error: {}` 仍然是已知异常，这次只是把错误收口和日志链路补得更清楚。
- 本轮没有改动 today 的服务端推荐排序，只是把现有优先级与解释来源显式化。

### [2026-04-15] 第三阶段：真实 HTTP baseline 与上线清单

- 类型：压测 / 验证 / 文档
- 状态：进行中
#### 背景
第三阶段要求把第二阶段已有的 in-process baseline 扩展到真实 HTTP 入口，并补一份可执行的上线前检查清单。真实入口下除了业务处理本身，还会经过 middleware、Origin 校验、cookie 鉴权和限流逻辑，结果更接近实际部署。
#### 本次改动
- 通过 `preview` 启动真实 HTTP 服务，并修复了两个直接阻塞构建的历史问题：
  - `scripts/load-api-baseline.ts` 的重复 `dryRun` 字段
  - `src/lib/server/request-schemas.ts` 的类型收窄不足
  - `src/app/api/practice/generate/route.ts` 缺失的校验常量与引用
- 用 service role 创建临时已确认用户和最小测试数据，拿到真实登录 cookie。
- 新增 [docs/dev/backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)。
#### HTTP baseline 结果
- `review submit`
  - 20 req / 并发 5
  - `200 x20`
  - P50 `743.25ms`
  - P95 `6089.40ms`
  - 平均 `2102.61ms`
- `learning progress`
  - 20 req / 并发 5
  - `200 x20`
  - P50 `713.69ms`
  - P95 `10120.13ms`
  - 平均 `3165.54ms`
- `practice generate`
  - 10 req / 并发 3
  - `200 x5`, `429 x5`
  - P50 `1399.83ms`
  - P95 `3244.33ms`
  - 平均 `1798.58ms`
  - 说明：当前结果验证了共享限流在真实 HTTP 入口下会按预期触发
- `tts`
  - 10 req / 并发 2
  - `200 x9`, `500 x1`
  - P50 `861.42ms`
  - P95 `7868.17ms`
  - 平均 `2237.09ms`
  - 说明：预览日志出现一次 `Connect Error: {}`，当前先按已知异常记录
#### 额外发现
- 第一轮 baseline 使用 `Origin: http://127.0.0.1:3000` 时，所有受保护写接口都返回 `403`
- 原因不是鉴权，而是 preview 环境内部识别的允许来源是 `http://localhost:3000`
- 将 `Origin` 改为 `http://localhost:3000` 后，真实 HTTP baseline 可正常进入业务链路
#### 测试 / 验证
- `pnpm preview:up`
- `node --import tsx scripts/load-api-baseline.ts ...`
- `node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts src/lib/server/rate-limit.test.ts`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 数据库侧独立冒烟验证 `4.2` 还没完成
- `tts` 的单次 `500` 还需要后续结合上游连接稳定性再看

### [2026-04-15] 第三阶段：数据库策略脚本验证

- 类型：验证 / 脚本 / 文档
- 状态：已完成
#### 背景
第三阶段最后一个缺口是 `4.2`：需要给数据库侧最小权限补一轮可重复执行的冒烟验证。但当前不计划直接改数据库，也没有额外的独立 SQL 执行环境，所以最稳妥的方式是补一个脚本验证当前仓库里的 `supabase/sql` 是否确实声明了审计中依赖的 RLS / policy。
#### 本次改动
- 新增 [scripts/validate-db-guardrails.ts](/d:/WorkCode/AbandonClaw/scripts/validate-db-guardrails.ts)
- 在 [package.json](/d:/WorkCode/AbandonClaw/package.json) 增加 `validate:db-guardrails`
- 脚本覆盖 11 张关键用户态表的最小策略声明检查：
  - `user_scene_progress`
  - `user_daily_learning_stats`
  - `user_scene_sessions`
  - `user_phrases`
  - `phrase_review_logs`
  - `user_phrase_relations`
  - `user_expression_clusters`
  - `user_expression_cluster_members`
  - `user_scene_practice_runs`
  - `user_scene_practice_attempts`
  - `user_scene_variant_runs`
#### 验证结果
- `pnpm run validate:db-guardrails`
- 结果：`11/11` 通过，未发现缺失的 RLS / policy 声明
- `pnpm run text:check-mojibake` 通过
#### 影响范围
- 影响模块：`scripts`、`package.json`、`docs/dev`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
#### 风险 / 未完成项
- 该脚本验证的是仓库 migration 声明，不是目标数据库实例的实时状态
- 若后续要做更强校验，仍建议在独立数据库环境里补一次真实 SQL 冒烟

### [2026-04-15] 第三阶段：数据库侧最小权限盘点

- 类型：审计 / 文档 / OpenSpec 实施
- 状态：已完成
#### 背景
第三阶段的首要任务是确认第二阶段切回用户上下文后的用户态表，数据库侧是否已有足够的 RLS / SQL 承接。如果没有，需要补 migration；如果已有，就要把现状和边界正式写清楚。
#### 本次改动
- 审计了 `supabase/sql` 下与 `learning / review / phrases / practice / variant` 相关的 migration。
- 确认 `user_scene_progress`、`user_daily_learning_stats`、`user_scene_sessions`、`user_phrases`、`phrase_review_logs`、`user_phrase_relations`、`user_expression_clusters`、`user_expression_cluster_members`、`user_scene_practice_runs`、`user_scene_practice_attempts`、`user_scene_variant_runs` 已有现存 RLS 或等效 SQL 约束承接当前用户态读写。
- 在 [docs/dev/server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md) 补充了表级策略映射、后台白名单入口和回滚说明。
#### 影响范围
- 影响模块：`supabase/sql`、`docs/dev`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 本轮以策略盘点和 migration 审计为主，暂未新增自动化测试。
#### 风险 / 未完成项
- 当前仍未验证真实数据库环境下的策略冒烟，需要留到 `4.2` 配合可用环境再执行。
- 本轮没有新增 SQL migration，因此不会引入新的数据库权限回归风险。

### [2026-04-15] 收口 phrases 剩余后台权限入口

- 类型：修复 / 接口治理 / 文档
- 状态：已完成
#### 背景
第二阶段收紧到后面，`phrases` 模块只剩共享 `phrases` 表和 AI enrich 还在业务 service 里直接创建 `service role` client。虽然权限范围已经很小，但边界还不够显式，不利于后续继续审计和收口。
#### 本次改动
- 新增 `src/lib/server/phrases/admin-repo.ts`，集中承接共享 `phrases` 表与 AI enrich 相关的后台白名单读写。
- `src/lib/server/phrases/service.ts` 改为只调用受限仓储入口，不再直接创建 `service role` client。
- 清理 `src/lib/server/review/service.ts` 中残留的无用 admin import。
#### 影响范围
- 影响模块：`phrases`、`review`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 待本轮最小测试与导入级 smoke check 一并验证
#### 风险 / 未完成项
- 共享 `phrases` 表与 AI enrich 仍保留后台权限，只是已显式隔离到白名单 repo
- 多实例共享限流、统一参数校验和最小压测仍待后续任务完成

### [2026-04-15] 收口高风险写接口的请求 schema 入口

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
第二阶段的 `3.2` 要求把高风险写接口的参数校验从零散 route 逻辑收口到统一入口。当前 `review submit`、`learning progress/complete`、`phrases save/save-all` 已经有校验，但实现分散，`phrases` 里还存在重复 normalize 逻辑。
#### 本次改动
- 新增 `src/lib/server/request-schemas.ts`，集中承接高风险写接口的请求解析与 normalize 逻辑。
- `review submit`、`learning progress`、`learning complete` 现在统一通过 schema helper 生成规范 payload。
- `phrases save`、`phrases save-all` 复用同一套请求 normalize 规则，避免两处维护相同字段默认值和裁剪逻辑。
#### 影响范围
- 影响模块：`review`、`learning`、`phrases`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/lib/server/idempotency.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/phrases/save/route.ts`
  - `src/app/api/phrases/save-all/route.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 当前只收口了 `review / learning / phrases` 的一批高风险写接口，高成本生成接口还未并入统一 schema 入口。
- 这一步保持旧规则不变，没有顺带收紧字段限制或补新错误码。

### [2026-04-15] 继续收口高成本生成接口的请求 schema

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
在 `review / learning / phrases` 的高风险写接口完成统一 schema 入口后，高成本生成接口里仍有一批分散校验逻辑，主要集中在 `explain-selection`、`scenes/generate`、`scenes/import`。
#### 本次改动
- 扩展 `src/lib/server/request-schemas.ts`，新增高成本生成接口的请求解析与 normalize helper。
- [src/app/api/explain-selection/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/explain-selection/route.ts) 改为复用统一 schema 入口。
- [src/app/api/scenes/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/scenes/generate/route.ts) 改为复用统一 schema 入口。
- [src/app/api/scenes/import/handlers.ts](/d:/WorkCode/AbandonClaw/src/app/api/scenes/import/handlers.ts) 改为复用统一 schema 入口。
#### 影响范围
- 影响模块：`explain-selection`、`scenes/generate`、`scenes/import`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/app/api/explain-selection/route.test.ts src/app/api/scenes/import/handlers.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/explain-selection/route.ts`
  - `src/app/api/scenes/generate/route.ts`
  - `src/app/api/scenes/import/handlers.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- `practice/generate` 仍保留独立的重量级校验与 payload 体积检查，尚未并入统一 schema 入口。
- 这一步仍然保持旧规则不变，没有追加更严格的字段限制。

### [2026-04-15] 收口 practice generate 的请求 schema 入口

- 类型：修复 / 接口治理 / 测试
- 状态：已完成
#### 背景
高成本生成接口里最后一个还保留独立请求校验的入口是 `practice/generate`。这条链路有自己的 scene 体积限制和 `exerciseCount` 规范化逻辑，如果不一起收口，`3.2` 仍然不算闭环。
#### 本次改动
- 扩展 `src/lib/server/request-schemas.ts`，新增 `practice/generate` 的请求解析、scene 体积限制和 `exerciseCount` 规范化逻辑。
- [src/app/api/practice/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/practice/generate/route.ts) 的 handler 改为复用统一 schema 入口。
- 保留模型 fallback 和响应校验逻辑不变，没有改练习题生成语义。
#### 影响范围
- 影响模块：`practice/generate`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/app/api/practice/generate/route.test.ts`
- 额外导入验证：
  - `src/lib/server/request-schemas.ts`
  - `src/app/api/practice/generate/route.ts`
- 已运行：
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- `practice/generate` 文件里原有的本地校验 helper 还残留在文件中，但 handler 已经不再使用；后续可以单独做一轮死代码清理。
- 这一步仍然保持旧规则不变，没有追加更严格的字段限制。

### [2026-04-15] 将高成本接口限流升级为共享存储优先

- 类型：修复 / 接口治理 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段的 `3.1` 要求高成本接口在多实例部署下也保持一致限流。此前的 `rate-limit.ts` 只使用进程内 `Map`，在多实例环境里会被实例切换绕过。
#### 本次改动
- 重写 `src/lib/server/rate-limit.ts`，保持 `enforceRateLimit` 名称和入参不变，但底层升级为：
  - 优先使用 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 提供的共享存储
  - 共享存储异常时自动回退到进程内内存限流
- 新增 [src/lib/server/rate-limit.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/rate-limit.test.ts)，覆盖内存模式、共享模式和共享失败 fallback。
- 相关高成本路由改为 `await enforceRateLimit(...)`，不改变业务错误契约。
- 更新 [.env.example](/d:/WorkCode/AbandonClaw/.env.example) 说明共享限流环境变量。
#### 影响范围
- 影响模块：`rate-limit`、`tts`、`practice/generate`、`explain-selection`、`scenes/import`、`scenes/generate`
- 是否影响主链路：是，但只影响超限判定与多实例一致性
- 是否影响用户可感知行为：是，多实例下的限流会更稳定
- 是否需要同步文档：是
#### 测试 / 验证
- 待本轮最小测试与路由回归一并验证
#### 风险 / 未完成项
- 当前共享后端只接了 Upstash REST 约定，没有再抽象更多 provider。
- 共享后端失败时会退回本地内存限流，保证可用性优先，但这意味着极端故障下会退回单实例行为。

### [2026-04-15] 补最小压测脚本与执行入口

- 类型：工具 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段的 `4.2` 需要把“最小压测脚本 + 结果记录”补齐。当前仓库没有现成的 load script，也没有统一的执行入口。
#### 本次改动
- 新增 [scripts/load-api-baseline.ts](/d:/WorkCode/AbandonClaw/scripts/load-api-baseline.ts)，提供零依赖的最小压测脚本，支持：
  - `base-url / path / method`
  - `requests / concurrency`
  - `body-file`
  - `cookie / origin`
  - `idempotency-key-prefix`
  - `dry-run`
- 新增 [scripts/load-handler-baseline.ts](/d:/WorkCode/AbandonClaw/scripts/load-handler-baseline.ts)，提供当前环境可执行的 in-process handler baseline，直接压：
  - `review-submit`
  - `learning-progress`
  - `practice-generate`
- 新增 [scripts/load-samples/practice-generate.sample.json](/d:/WorkCode/AbandonClaw/scripts/load-samples/practice-generate.sample.json) 作为最小样例 payload。
- 在 [package.json](/d:/WorkCode/AbandonClaw/package.json) 增加 `load:api-baseline` 和 `load:handler-baseline` 脚本入口。
#### 测试 / 验证
- 已运行：
  - `node --import tsx scripts/load-api-baseline.ts --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json --requests=6 --concurrency=2`
- 已运行：
  - `node --import tsx scripts/load-handler-baseline.ts --requests=30 --concurrency=5`
- in-process baseline 结果：
  - `review-submit`：30 req / 并发 5，状态全 `200`，P50 `0.38ms`，P95 `10.04ms`，平均 `2.1ms`
  - `learning-progress`：30 req / 并发 5，状态全 `200`，P50 `0.44ms`，P95 `0.65ms`，平均 `0.47ms`
  - `practice-generate`：30 req / 并发 5，状态全 `200`，P50 `0.64ms`，P95 `2.18ms`，平均 `0.9ms`
- 已运行：
  - `node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts`
  - `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- 还没有在真实可访问的本地/预览服务上拿到 HTTP 层基线。
- 当前记录的是 in-process handler baseline，更适合做代码回归对比，不等价于完整网络链路压测。

### [2026-04-15] 第二阶段先补关键写接口幂等与数据边界盘点

- 类型：修复 / 接口治理 / 测试 / 文档
- 状态：已完成
#### 背景
第二阶段原本同时包含数据边界收紧、关键写接口一致性和共享限流升级，但共享限流缺少现成基础设施，数据库边界收紧又会直接触及主链路和 RLS。为了先降低真实线上风险，这一轮优先落了关键写接口幂等去重、`service role` 使用盘点和 `phrases` 写接口来源校验补齐。
#### 本次改动
- 新增 `src/lib/server/idempotency.ts`，提供统一的服务端幂等 key 构造、header 读取和进程内去重 helper。
- `review submit` 现在会对相同幂等 key 或相同请求指纹做短窗口去重，避免 review 结果和 summary 连续写两次。
- `learning start/pause/progress/complete` 现在会对同一场景、同一请求指纹做短窗口去重，降低重复点击和网络重试带来的重复推进。
- `phrases save`、`phrases save-all` 接口补上了来源校验，并接入相同的服务端去重能力。
- `phrases save-all` 开始复用统一对象数组校验 helper，减少局部手写校验。
- 新增 [server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md)，记录 `scene / learning / review / phrases` 当前 `service role` 使用点、暂定白名单和后续迁移优先级。
- 补充把 `scene` 仓储里的用户态读取切到 `createSupabaseServerClient`，优先收紧 `listVisibleScenes*` 和 `listUserSceneProgressBySceneIds` 这批由 RLS 可直接承接的查询。
- 继续把 `review / phrases` 的第一批纯用户态读取切到 `createSupabaseServerClient`，包括 review summary、due review、短语 mine 列表、关系查询和 cluster 只读查询。
- 再继续把 `learning` 的第一批用户态读取切到 `createSupabaseServerClient`，覆盖 progress/session 前置读取、continue/today/overview/list 聚合和 repeat run 续接读取。
- 进一步把 `learning` 的自有写表 helper 切到 `createSupabaseServerClient`，包括 `upsertDailyStats`、`upsertProgress`、`upsertSession`。
- 继续把 `review / phrases` 的用户自有写表切到 `createSupabaseServerClient`，包括 `submitPhraseReview`、`user_phrases` 写入、`user_phrase_relations`、expression cluster/member、daily stats 和 scene progress 镜像计数。
- 再继续把 `practice / variant` 运行态读写 helper 切到 `createSupabaseServerClient`，包括 practice run、attempt、repeat continue 和 variant run 相关用户表。
- 继续把 `expression-clusters` 服务层切到 `createSupabaseServerClient`，让 cluster/member 的用户自有读写与移动/合并链路统一走用户上下文。
#### 影响范围
- `src/lib/server/idempotency.ts`
- `src/app/api/review/handlers.ts`
- `src/app/api/learning/scenes/[slug]/*`
- `src/app/api/phrases/save/route.ts`
- `src/app/api/phrases/save-all/route.ts`
- `src/lib/server/validation.ts`
#### 测试 / 验证
- 已运行：
  - `node --import tsx --test src/lib/server/idempotency.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 额外导入验证：
  - `src/app/api/phrases/save/route.ts`
  - `src/app/api/phrases/save-all/route.ts`
  - `src/app/api/learning/scenes/[slug]/progress/route.ts`
  - `src/app/api/learning/scenes/[slug]/complete/route.ts`
  - `src/lib/server/scene/repository.ts`
  - `src/lib/server/scene/service.ts`
  - `src/lib/server/review/service.ts`
  - `src/lib/server/phrases/service.ts`
  - `src/lib/server/learning/service.ts`
#### 风险 / 未完成项
- 当前幂等去重仍是进程内存级，无法覆盖多实例部署。
- 本轮已完成 `scene / review / phrases / expression-clusters / learning / practice / variant` 主要用户自有读写迁移；共享 `phrases` 表和 AI enrich 仍未完全迁移。
- 共享限流升级和最小压测脚本仍待后续继续完成。

### [2026-04-14] 落地后端接口治理第一阶段基线

- 类型：修复 / 维护规范 / 测试
- 状态：已完成

#### 背景
当前后端接口层虽然已经有基础鉴权、部分参数校验和上游超时控制，但接口治理能力仍然分散在各个 route 和 handler 里：
- 缺少统一 `requestId`，接口报错后很难把 middleware、route 和 service 串起来排查。
- 高成本接口缺少统一限流基线，容易被短时间重复请求放大成本。
- 受保护写接口缺少统一同源来源校验，cookie 鉴权下仍存在基础跨站调用风险。
- 未知内部错误虽然大多会走 fallback 文案，但响应结构没有统一追踪标识，日志也主要依赖散点 `console`。

这次实现按 OpenSpec `govern-backend-api-guardrails` change 落地第一阶段基线，只改入口治理，不改学习/复习/场景的业务语义。

#### 本次改动
- 新增 `src/lib/server/request-context.ts`，统一生成、读取和透传 `x-request-id`。
- 新增 `src/lib/server/logger.ts`，约束接口错误日志至少输出 `requestId`、路径、方法和错误上下文。
- 新增 `src/lib/server/request-guard.ts`，提供最小同源来源校验 helper。
- 新增 `src/lib/server/rate-limit.ts`，提供进程内窗口限流 helper。
- 扩展 `src/lib/server/errors.ts`，新增 `RateLimitError`。
- 扩展 `src/lib/server/api-error.ts`，让显式应用错误与未知内部错误都返回 `requestId`，并同步写回响应头。
- 改造 `middleware.ts`，为受保护请求补充 `x-request-id` 透传。
- 为第一批高风险接口接入入口治理：
  - `tts`
  - `tts/regenerate`
  - `scenes/import`
  - `scenes/generate`
  - `practice/generate`
  - `explain-selection`
- 为第一批核心写接口接入同源来源校验：
  - `review/submit`
  - `learning/scenes/[slug]/start`
  - `learning/scenes/[slug]/pause`
  - `learning/scenes/[slug]/progress`
  - `learning/scenes/[slug]/complete`
- 补充并更新了 middleware、api-error、限流、来源校验及关键 route 的自动化测试。

#### 影响范围
- 影响模块：服务端接口入口治理、统一错误响应、请求级追踪
- 影响页面/接口：AI 生成、TTS、释义、学习进度、复习提交
- 是否影响主链路：是
- 是否影响用户可感知行为：是
现在超限请求、跨站来源请求和未知内部错误的接口响应会更早、更稳定地收口
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：
  - `node --import tsx --test middleware.test.ts src/lib/server/api-error.test.ts src/lib/server/request-guard.test.ts src/lib/server/rate-limit.test.ts src/app/api/tts/regenerate/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/practice/generate/route.test.ts src/app/api/scenes/import/handlers.test.ts src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts`
- 导入验证：
  - `src/app/api/scenes/generate/route.ts`
  - `src/app/api/tts/route.ts`
  - `src/app/api/learning/scenes/[slug]/complete/route.ts`
- 未验证部分：
  - 未跑全量单测 / 交互测试
  - 未做多实例环境下的限流验证

#### 风险 / 未完成项
- 当前限流仍是进程内窗口限流，只适合第一阶段基线，不覆盖多实例一致性。
- 同源来源校验当前采用最小策略，对 `Origin` 缺失请求默认放行，优先避免误伤现有调用链。
- 这轮没有处理 `service role` 收紧、数据库权限边界和写接口幂等保护。
- 这轮没有把所有受保护写接口和所有高成本接口一次性全覆盖，仍保留残余风险。

#### 后续计划
- 第二阶段继续处理用户态接口的数据访问边界，减少对 `service role` 的直接依赖。
- 为关键写链路补幂等 / 并发保护。
- 如有真实流量压力，再把限流从进程内方案升级到共享存储方案。

本文档用于记录开发过程中的实际改动、重构说明、验证情况、影响范围与后续待办。
它不是正式发布用 CHANGELOG，也不要求只记录用户可感知变化。

---

## 使用原则

适合记录：
- 重构
- 删除旧功能
- 调整实现方式
- 补测试
- 修复局部问题
- 开发中间态决策
- 尚未发布但已经落地的行为调整
- 验证情况和已知风险

不适合记录：
- 与项目无关的临时实验
- 纯废话式过程描述
- 与代码改动无关的泛泛讨论

---

## 记录格式

每条记录建议包含：

- 日期
- 标题
- 类型
- 背景
- 本次改动
- 影响范围
- 测试 / 验证
- 风险 / 未完成项
- 后续计划

---

## 日志条目模板

### [YYYY-MM-DD] <标题>

- 类型：重构 / 修复 / 删除 / 测试 / 文档 / 行为调整
- 状态：进行中 / 已完成 / 待验证

#### 背景
说明为什么要做这次改动：
- 当前问题是什么
- 是历史包袱、功能缺陷、实现不合理，还是产品方向变化

#### 本次改动
- 改动 1
- 改动 2
- 改动 3

#### 影响范围
- 影响模块：
- 影响页面：
- 是否影响主链路：是 / 否
- 是否影响用户可感知行为：是 / 否
- 是否需要同步文档：是 / 否

#### 测试 / 验证
- 已运行测试：
- 手动验证路径：
- 未验证部分：

#### 风险 / 未完成项
- 风险 1
- 风险 2
- 尚未处理项 1
- 尚未处理项 2

#### 后续计划
- 下一步任务 1
- 下一步任务 2

---

## 示例

### [2026-04-08] 收敛 Today 推荐逻辑并移除旧入口

- 类型：重构
- 状态：已完成

#### 背景
旧的 Today 页面同时存在多个入口，推荐逻辑分散，AI 在后续开发中容易误判主入口，用户也缺乏清晰的下一步指引。

#### 本次改动
- 收敛 Today 主 CTA 的判断逻辑
- 删除重复的次级入口
- 将“继续当前训练”作为未完成 session 的优先动作

#### 影响范围
- 影响模块：Today、Session
- 影响页面：Today 首页
- 是否影响主链路：是
- 是否影响用户可感知行为：是
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：today 相关单测、推荐逻辑测试
- 手动验证路径：
  - 存在未完成 session 时进入 Today
  - review 积压时进入 Today
- 未验证部分：与变体训练联动的推荐优先级

#### 风险 / 未完成项
- review 与 scene 并存时的边界优先级仍需进一步明确
- 当前文案仍偏系统化，后续需要收敛

#### 后续计划
- 更新 feature-map 中 Today 模块说明
- 补一条 Today 推荐优先级的验收清单

---

## 维护建议

- 每次完成一轮真实改动后追加一条记录
- 重大重构优先记录“为什么改”和“主链路是否变化”
- 删除功能时一定记录删除依据
- 若行为变化已稳定且准备发布，再从这里提炼正式 CHANGELOG

---

### [2026-04-08] 收敛 docs 目录职责边界并迁移错层文档

- 类型：文档
- 状态：已完成

#### 背景
`docs/` 顶层 taxonomy 已经固定为 `feature-map / feature-flows / domain-rules / system-design / dev / meta`，但实际文档里仍有少量“规则层混入实现映射”的情况。继续放任不收口，会让后续 AI 和人工维护时很难判断文档应该补在哪一层。

#### 本次改动
- 新增 `docs/domain-rules/README.md`，固定规则层边界和核心术语
- 新增 `docs/system-design/README.md`，固定实现层边界
- 迁移并改名：
  - `docs/domain-rules/progress-overview.md -> docs/system-design/learning-overview-mapping.md`
  - `docs/domain-rules/review-practice-rules.md -> docs/system-design/review-practice-signals.md`
- 更新 `docs/README.md`、维护手册、项目学习指南和相关交叉引用
- 收敛 `learning-evidence.md` 中缺少落点的规范提示，改为明确指向 OpenSpec 主规范

#### 影响范围
- 影响模块：文档 taxonomy、阅读入口、维护入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：全局检索旧路径残留、复核新目录索引
- 手动验证路径：
  - 检查 `docs/domain-rules` 与 `docs/system-design` 当前文件列表
  - 检查 `docs/README.md` 阅读顺序是否覆盖实现层入口
- 未验证部分：docs 内其余历史绝对路径链接未做全量清扫

#### 风险 / 未完成项
- 仓库外部资料或历史聊天仍可能引用旧路径
- docs 内仍有部分旧式绝对路径和个别不可点击链接，后续可再统一一轮

#### 后续计划
- 后续新增规则文档优先落到 `domain-rules`，避免再写字段映射类文档
- 之后如再整理 docs，可单独做一轮链接格式统一

---

### [2026-04-08] 补齐 meta 目录入口并区分讲解文档职责

- 类型：文档
- 状态：已完成

#### 背景
`docs/meta/` 里已经有学习讲解文档、树状图、思维导图和导入大纲，但缺少目录级说明。后续维护时容易出现“同主题多份文档但不知道谁是主入口、谁只是展示变体”的问题。

#### 本次改动
- 新增 `docs/meta/README.md`
- 明确 `project-learning-guide.md`、`project-tree-map.md`、`project-mindmap.md`、`project-mindmap-outline.md` 的用途分工
- 在 `docs/README.md` 的 `meta` 示例里补上目录入口

#### 影响范围
- 影响模块：文档认知入口、分享材料维护入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：手动复核 `meta` 目录当前文件与 README 对应关系
- 手动验证路径：
  - 从 `docs/README.md` 进入 `meta/README.md`
  - 复核 `meta/README.md` 中各文件职责是否互补而不冲突
- 未验证部分：无

#### 风险 / 未完成项
- `project-tree-map.md` 与 `project-mindmap.md` 仍然存在内容上的天然重叠，后续若只更新其一，仍可能慢慢漂移

#### 后续计划
- 后续若继续精简 `meta`，优先保留 `project-learning-guide.md` 和 `project-tree-map.md` 作为主入口

---

### [2026-04-08] 统一 docs 目录 README 模板并收口核心正文结构

- 类型：文档
- 状态：已完成

#### 背景
`docs/` 顶层 taxonomy、目录入口和错层文档迁移完成后，剩下的问题不再是“文档放哪里”，而是“同类文档怎么写更一致”。如果目录 README 和核心正文没有统一模板，后续新增文档时仍会慢慢重新发散。

#### 本次改动
- 为 `feature-map / feature-flows / domain-rules / system-design / dev / meta` 六个目录 README 补齐建议正文模板
- 收口 `domain-rules` 核心正文：
  - `learning-evidence.md`
  - `review-scheduling-rules.md`
- 收口 `system-design` 对应正文：
  - `learning-overview-mapping.md`
  - `review-practice-signals.md`
- 收口 `feature-flows` 核心正文：
  - `today-recommendation.md`
  - `review-writeback.md`
  - `scene-training-flow.md`
  - `session-resume.md`

#### 影响范围
- 影响模块：文档模板、一致性、阅读体验
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：文档结构人工复核、全局检索主要旧标题和坏链格式
- 手动验证路径：
  - 复核 6 个目录 README 是否都包含目录说明与建议正文模板
  - 复核 `domain-rules / system-design / feature-flows` 核心正文是否已基本对齐模板
- 未验证部分：未对所有历史 `system-design` 文档逐篇做模板化收口

#### 风险 / 未完成项
- `scene-practice-generation.md`、`review-source-mapping.md`、`review-progressive-practice.md` 等历史 `system-design` 文档仍保留旧标题口径，但不影响当前阅读
- `scene-entry.md` 的章节风格比其它 `feature-flows` 更细，后续如需要可以再做一轮轻量统一

#### 后续计划
- 如果继续整理，优先收 `system-design` 中仍使用旧标题体系的几份专项文档
- 当前阶段可以先停止大范围文档改写，后续按需增量维护

---

### [2026-04-08] 新增项目产品说明总览文档

- 类型：文档
- 状态：已完成

#### 背景
仓库里已经有讲解文档、脑图、树状图和模块/链路文档，但缺少一份专门面向“产品定位、用户价值和整体闭环”的总览产品书。现有内容更适合内部讲解，不够适合直接拿来做产品说明。

#### 本次改动
- 新增 `docs/meta/product-overview.md`
- 从产品定位、目标用户、核心问题、产品结构、学习闭环、主要页面、关键能力和演进方向几个角度整理当前项目总览
- 在 `docs/meta/README.md` 中挂接产品总览入口

#### 影响范围
- 影响模块：文档认知层、产品说明入口
- 影响页面：无
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：手动复核文档入口与内容结构
- 手动验证路径：
  - 从 `docs/meta/README.md` 进入 `product-overview.md`
  - 复核产品总览与 `project-learning-guide.md` 的职责区分
- 未验证部分：无

#### 风险 / 未完成项
- 后续如果产品定位或主闭环发生明显变化，需要同步更新该文档

#### 后续计划
- 后续如需要对外介绍项目，可在此基础上继续压缩成一页版介绍或 PPT 提纲

---

### [2026-04-08] 补齐 scenes、progress 与 chunks 详情专项维护文档

- 类型：文档
- 状态：已完成

#### 背景
仓库原本已经有 `today`、`review`、`scene practice`、`chunks data`、`audio tts` 等专项维护文档，但 `scenes` 列表页、`progress` 聚合页，以及 `chunks` 的 focus detail / expression map 仍缺独立说明。后续继续改这些区域时，只能翻代码和测试，不利于快速判断链路边界。

#### 本次改动
- 新增 `docs/feature-flows/scene-entry.md`
- 新增 `docs/system-design/learning-overview-mapping.md`
- 新增 `docs/system-design/chunks-focus-detail-map.md`
- 在 `docs/dev/project-maintenance-playbook.md` 挂接对应入口

#### 影响范围
- 影响模块：Scenes、Progress、Chunks
- 影响页面：`/scenes`、`/progress`、`/chunks`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：已复核文档索引与维护入口
- 未验证部分：无

#### 风险 / 未完成项
- 新文档目前是首版，后续若对应链路继续演进，需要继续维护
- 仍有部分旧文档命名体系未完全收口到新目录分层

#### 后续计划
- 后续文档新增优先收敛到 `feature-map / feature-flows / system-design / dev / meta`
- 继续减少“同一逻辑分散在多个说明文件”的情况

---

### [2026-04-08] 固定 feature-map 与 feature-flows 目录结构

- 类型：文档
- 状态：已完成

#### 背景
仓库开始引入 `docs/feature-map/`、`docs/feature-flows/`、`docs/dev/dev-log.md`、`docs/dev/testing-policy.md` 这一套新文档体系，但 `feature-map` 与 `feature-flows` 当时只有 README，缺少稳定子文档。若不先固定结构，后续文档会继续散落，模块地图和链路说明也会混写。

#### 本次改动
- 固定 `docs/feature-map/` 目录并补齐：
  - `today.md`
  - `scene.md`
  - `session.md`
  - `expression-item.md`
  - `review.md`
- 固定 `docs/feature-flows/` 目录并补齐：
  - `today-recommendation.md`
  - `scene-training-flow.md`
  - `session-resume.md`
  - `review-writeback.md`
- 更新两个 README 的索引和边界说明
- 在 `docs/dev/testing-policy.md`、`docs/dev/project-maintenance-playbook.md` 补入口

---

### [2026-04-08] 重构 docs taxonomy 并统一目录归类

- 类型：文档
- 状态：已完成

#### 背景
随着专项文档持续增加，原先的 `docs/` 顶层已经同时混放模块说明、链路说明、规则、系统设计、开发规范和项目认知文档。继续沿用旧结构会让维护入口越来越分散，也会让后续 AI 和人工维护时难以判断文档应该落在哪一层。

#### 本次改动
- 按 `feature-map / feature-flows / domain-rules / system-design / dev / meta` 六层 taxonomy 重构 `docs/`
- 迁移并重命名原有专项文档，例如：
  - `scenes-entry-flow.md -> feature-flows/scene-entry.md`
  - `progress-overview-mapping.md -> system-design/learning-overview-mapping.md`
  - `scene-practice-generation.md -> system-design/scene-practice-generation.md`
- 更新 `docs/README.md`、目录索引、维护手册和项目学习指南中的文档引用

#### 影响范围
- 影响模块：文档体系、维护入口、项目认知入口
- 影响页面：无直接页面影响
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：
  - 全局检索旧路径残留
  - 复核 `docs/README.md` 与 `docs/feature-flows/README.md` 索引
- 未验证部分：无

#### 风险 / 未完成项
- 部分历史聊天或外部资料仍可能引用旧路径，不在仓库本次迁移范围内
- 后续新增文档若不遵守 taxonomy，仍可能重新出现散落问题

#### 后续计划
- 后续新增文档统一先判断属于模块、链路、规则、系统设计、开发规范还是 meta
- 若 taxonomy 再扩展，优先先更新 `docs/README.md` 与维护规则

#### 影响范围
- 影响模块：文档体系、维护入口
- 影响页面：无直接页面影响
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：复核目录结构与 README 索引
- 未验证部分：无

#### 风险 / 未完成项
- 部分旧文档仍然使用旧命名习惯，后续还需要继续迁移或收口
- 新目录结构虽然固定了，但不同类别文档的边界仍需在后续改动中持续执行

#### 后续计划
- 后续主链路文档优先落到 `feature-flows/`
- 后续模块职责说明优先落到 `feature-map/`

### [2026-04-17] scene 音频预热改为 block-first
- 类型：实现 / 测试 / 文档
- 状态：已完成
#### 背景
scene detail 页的真实主消费单元是 block 和 scene full。此前预热主要按 sentence 入队，可能提前生成 `sentence-s1`，但用户点击 block 播放时仍会请求 `block-*` 音频，导致预热命中和真实点击不一致。
#### 本次改动
- 新增 OpenSpec change：`scene-block-first-audio-priority`。
- `warmupLessonAudio()`、idle 增量预热和播放驱动提权改为优先处理 playable block。
- block 音频继续复用现有 `sentence` TTS kind，`sentenceId` 使用 `block-${block.id}`，不修改 `/api/tts` 协议。
- block 播放时新增 `onBlockPlayback` 回调，触发后续 block 提权。
- scene full 继续保留后台准备，sentence 保留为明确单句消费和 fallback 的按需资源。
#### 测试 / 验证
- `node --import tsx --test src/lib/utils/audio-warmup.test.ts src/lib/utils/resource-actions.test.ts src/lib/utils/scene-audio-warmup-scheduler.test.ts`
- `node --import tsx --import ./src/test/setup-dom.ts --test src/features/lesson/audio/use-lesson-reader-playback.test.tsx "src/app/(app)/scene/[[]slug[]]/use-scene-detail-playback.test.tsx"`
- `node_modules\.bin\openspec.CMD change validate "scene-block-first-audio-priority" --strict --no-interactive`
- `pnpm run text:check-mojibake`
#### 风险 / 未完成项
- block 音频比单句更长，单个生成耗时和缓存体积可能增加，需要继续观察 `block-*` hit / miss。
- `sentence_audio_play_*` 事件名暂时沿用，payload 中 `sentenceId = block-*` 代表 block 级音频。

### [2026-04-17] block-first 语义护栏补充

`block-*` 只是复用 sentence TTS 通道的兼容 id，不再让调试和回看入口只靠 `sentenceId` 猜语义。

- `sentence_audio_play_*` payload 增加 `audioUnit = block | sentence`。
- 浏览器 TTS 缓存面板将 `sentence:...:sentence-block-*` 识别为 `block` 类型。
- OpenSpec 和音频链路文档明确 scene detail 的音频口径：Primary 是 block，Secondary 是 scene full，Fallback 才是 sentence。

### [2026-04-17] scene full 失败诊断与冷却

- 新增 OpenSpec change：`scene-full-failure-diagnostics-and-cooldown`。
- scene full 播放失败事件补充 `failureReason`、`sceneFullKey`、`readiness` 和 `cooldownMs`。
- 同一个 scene full 失败后会进入短时冷却，冷却期内再次点击不再重复触发生成，避免用户连续撞墙和上游重复受压。
- `scene_full_play_cooling_down` 进入最小业务事件回看。
- full 失败后的 CTA 优先承接当前 block，无法定位时再回退到 sentence。

### [2026-04-17] scene 导入解析提示词稳定性修复

- 类型：修复 / 测试 / 文档
- 状态：已完成
- 背景：短 A/B 对话导入时，模型输出可能在 block 句数或 repair prompt 的 chunks 要求上偏离校验规则，触发“场景解析失败”。
- 本次改动：
  - 场景解析 prompt 明确 `A:/B:/C:` 逐行输入优先按一行一个 dialogue block。
  - prompt 和 repair prompt 明确每个 block 最多 2 个 sentence。
  - repair prompt 与 schema 对齐：sentence 必须有 `chunks` 数组，但允许 `chunks: []`。
- 验证：
  - `node --import tsx --test src/lib/server/prompts/scene-parse-prompt.test.ts`
### [2026-04-20] 收口 Codex 首次接手仓库的文档导航路径
- 类型：文档 / 维护入口治理
- 状态：已完成
#### 背景
前一轮已经把 stable spec、`docs/*`、`AGENTS.md` 和 `docs/dev/*` 的基础边界收了一轮，但从“Codex 首次进入仓库”的视角看，仍然有几个问题会持续拖慢理解：
- 顶层执行规则、总入口、dev 入口、维护手册和 workflow 之间虽然都存在，但跳转关系还不够显式。
- stable spec 已经能找到，但高频问题仍然需要先靠维护者自己推断“先看哪个 capability、再看哪类文档、最后进哪段代码”。
- 文档入口已经结构化，但还缺少按问题类型快速定位的最小导航，容易让智能体第一次进仓时在 `docs/*` 与 `openspec/specs/*` 之间来回试探。

#### 本次改动
- 统一并收紧顶层与开发层入口关系：
  - 更新 `AGENTS.md`，把阅读顺序改成“先用 `docs/README.md` 定位，再按需读 `feature-map / feature-flows / domain-rules / openspec/specs / system-design / docs/dev`”。
  - 在 `AGENTS.md` 的 OpenSpec 段落补上双入口：`openspec/specs/project-maintenance/spec.md` 负责长期稳定维护约束，`docs/dev/openspec-workflow.md` 负责 Spec-Driven 阶段细化流程。
  - 更新 `docs/dev/project-maintenance-playbook.md`，补上 `project-maintenance` stable spec 入口与最小阅读顺序。
- 收口仓库总入口与 dev 目录入口：
  - 更新 `docs/README.md`，强调“先定位，再精读”，不默认扫完整个目录。
  - 在 `docs/README.md` 的 `dev` 分层说明里，把 `openspec/specs/project-maintenance/spec.md` 明确为开发流程与维护约定的稳定约束入口。
  - 更新 `docs/dev/README.md`，明确四层关系：仓库总入口、dev 主入口、stable spec 约束入口、Spec-Driven 细化入口。
  - 更新 `docs/dev/project-maintenance-playbook.md` 的新维护者阅读顺序，使其与 `AGENTS.md` / `docs/README.md` 同口径。
- 降低 stable spec 的首次发现成本：
  - 在 `docs/README.md` 增加“高频问题最小入口”，把学习闭环、句子推进、推荐逻辑、review、开发流程、认证边界、缓存/字段来源等高频问题直接映射到首选 capability 和对应 docs 层。
  - 在 `docs/README.md` 增加“从 stable spec 到代码入口”的轻量映射，为 `learning-loop-overview`、`sentence-progression`、`sentence-completion-tracking`、`today-learning-contract`、`review-*`、`auth-api-boundaries`、`chunks-data-contract`、`runtime-cache-coherence` 提供最小代码锚点。
- 压缩重复口径，保留阶段细化：
  - 重写 `docs/dev/openspec-workflow.md` 开头，明确 `AGENTS.md` / `project-maintenance` stable spec / workflow 三层分工。
  - 把 `openspec-workflow` 后半段拆成清晰章节：目录结构、stable spec vs change delta、spec delta 何时必写、CHANGELOG / dev-log 分工、Proposal 检查、输出格式、模板。

#### 影响范围
- 影响模块：`AGENTS.md`、`docs/README.md`、`docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/openspec-workflow.md`
- 是否影响主链路：否，不改变业务实现或用户可见功能
- 是否影响用户可感知行为：否
- 是否需要同步文档：本轮已同步完成

#### 测试 / 验证
- 已运行检索与人工回读：
  - 回读 `AGENTS.md`、`docs/README.md`、`docs/dev/README.md`、`docs/dev/project-maintenance-playbook.md`、`docs/dev/openspec-workflow.md`
  - 检查总入口、dev 入口、stable spec 入口和 workflow 入口之间的分工与跳转关系是否一致
  - 检查高频问题最小入口与 stable spec -> 代码入口映射是否仍保持“轻量锚点”而不是僵硬清单
- 未运行测试：
  - 未跑代码单测 / 交互测试，因为本轮仅涉及文档与导航文本

#### 风险 / 未完成项
- 当前已经补齐“文档怎么找”和“先从哪段代码看”的最小路径，但没有为每个 capability 维护完整长期索引；后续如果 capability 数量继续增长，仍可能需要更正式的 capability 映射表。
- 这轮刻意没有修改 `openspec/specs/project-maintenance/spec.md` 的 Requirement 本体，避免把入口优化升级成稳定规范变更；因此 stable spec 自身没有新增导航段落。
- 轻量代码入口映射依赖当前页面与 server 目录结构，后续若目录大迁移，需要同步更新 `docs/README.md` 中这部分锚点。

#### 后续计划
- 后续如果继续优化，优先做增量维护：
  - 新 capability 落地时同步补一条“高频问题最小入口”或“stable spec -> 代码入口”锚点
  - 目录迁移时优先检查 `docs/README.md` 和 `AGENTS.md` 的入口是否仍成立
- 暂不继续扩充新的入口文档，避免入口层再次膨胀；后续重点转回 capability 边界和实际实现维护。
- 2026-04-20
  - 变更：为 scenes 页“生成场景”补上句子锚点模式，实现 `context / anchor_sentence` 双模式生成入口。
  - OpenSpec：
    - `openspec/changes/add-anchored-scene-generation-mode/`
  - 代码：
    - [src/components/scenes/generate-scene-sheet.tsx](/d:/WorkCode/AbandonClaw/src/components/scenes/generate-scene-sheet.tsx)
    - [src/lib/utils/scenes-api.ts](/d:/WorkCode/AbandonClaw/src/lib/utils/scenes-api.ts)
    - [src/lib/server/request-schemas.ts](/d:/WorkCode/AbandonClaw/src/lib/server/request-schemas.ts)
    - [src/lib/server/prompts/scene-generate-prompt.ts](/d:/WorkCode/AbandonClaw/src/lib/server/prompts/scene-generate-prompt.ts)
    - [src/lib/server/scene/generation.ts](/d:/WorkCode/AbandonClaw/src/lib/server/scene/generation.ts)
  - 文档：
    - [docs/feature-flows/scene-entry.md](/d:/WorkCode/AbandonClaw/docs/feature-flows/scene-entry.md)
    - [docs/system-design/scene-generation-pipeline.md](/d:/WorkCode/AbandonClaw/docs/system-design/scene-generation-pipeline.md)
  - 测试：
    - [src/components/scenes/generate-scene-sheet.test.tsx](/d:/WorkCode/AbandonClaw/src/components/scenes/generate-scene-sheet.test.tsx)
    - [src/lib/server/request-schemas.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/request-schemas.test.ts)
    - [src/lib/server/prompts/scene-generate-prompt.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/prompts/scene-generate-prompt.test.ts)
    - [src/lib/server/scene/generation.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/scene/generation.test.ts)
    - [src/app/(app)/scenes/page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.interaction.test.tsx)
  - 验证：
    - `pnpm exec node --import tsx --test src/lib/server/request-schemas.test.ts src/lib/server/prompts/scene-generate-prompt.test.ts src/lib/server/scene/generation.test.ts`
    - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test src/components/scenes/generate-scene-sheet.test.tsx "src/app/(app)/scenes/page.interaction.test.tsx"`
  - 本轮收口：
    - 生成入口不再只靠自由 `promptText` 承载两种不同语义。
    - 请求 schema、prompt 和服务端缓存 key 现在都显式区分 `context` 与 `anchor_sentence`。
    - `anchor_sentence` 模式补上了“最终文本必须包含锚点句”的最小结果校验。
  - 明确不收：
    - 不做多场景候选生成。
    - 不做电影来源、人物、情绪等结构化元数据抽取。
    - 不做与 review / 表达资产沉淀的自动联动。
- 2026-04-20
  - 变更：补强维护规范，明确 Spec-Driven 的“完成态提交 / 收尾提交”必须先完成 tasks、文档、stable spec 与 archive，不能先提交代码再手动补收尾。
  - 规则：
    - [AGENTS.md](/d:/WorkCode/AbandonClaw/AGENTS.md)
    - [openspec/specs/project-maintenance/spec.md](/d:/WorkCode/AbandonClaw/openspec/specs/project-maintenance/spec.md)
    - [docs/dev/project-maintenance-playbook.md](/d:/WorkCode/AbandonClaw/docs/dev/project-maintenance-playbook.md)
  - 本轮收口：
    - 明确区分“开发中的中间提交”和“完成态提交”。
    - 把完成态提交前的收尾动作定义成显式前置条件。
  - 检查结论：
    - 当前 `openspec/changes/` 下仅剩 `archive/`，未发现仍在活动但未归档的 change。
    - 本次检查时仓库未发现额外未收尾的 OpenSpec 目录。
- 2026-04-20
  - 变更：统一学习链路里主按钮与次按钮的视觉层级，收口 `lesson / chunks / scenes` 间按钮语义漂移。
  - OpenSpec：
    - `openspec/changes/unify-learning-action-button-hierarchy/`
  - 代码：
    - [src/features/lesson/components/selection-detail-primitives.tsx](/d:/WorkCode/AbandonClaw/src/features/lesson/components/selection-detail-primitives.tsx)
    - [src/features/chunks/components/focus-detail-sheet-footer.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-sheet-footer.tsx)
    - [src/app/(app)/chunks/chunks-page-sheets.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/chunks/chunks-page-sheets.tsx)
  - 测试：
    - [src/features/lesson/components/selection-detail-panel.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/lesson/components/selection-detail-panel.interaction.test.tsx)
    - [src/features/chunks/components/focus-detail-sheet.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/features/chunks/components/focus-detail-sheet.interaction.test.tsx)
    - [src/app/(app)/scenes/page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.interaction.test.tsx)
  - 本轮收口：
    - `加入复习 / 开始复习 / 生成场景` 统一回全局主按钮语义，不再混用 chunks 局部深蓝主色。
    - `保存到表达库 / 保存并加入复习 / 保存句子 / 添加到表达库` 统一使用全局次按钮语义，避免页面间白底、浅底、局部边框写法继续漂移。
    - `chunks` 手动保存入口的重复按钮 class 收敛为单一局部 helper，降低后续再漂移概率。
  - 明确不收：
    - 不处理后台、营销页、设置页按钮统一。
    - 不重命名现有设计 token，也不做全站按钮体系重构。

### [2026-04-21] 增加 scenes 随机复习播放入口
- 类型：Spec-Driven / 用户可感知功能
- 状态：实施中
#### 背景
用户希望在 `scenes` 列表页从已学习到一定程度的场景中随机开始播放完整场景音频，并在播放完成后按列表顺序自动循环，形成被动听力复习入口。

#### 本次改动
- 新增 OpenSpec 变更 `add-scene-random-review-playback`，明确播放资格、队列顺序、失败处理与不收范围。
- 在 `scenes` 页顶部新增随机播放入口，仅纳入 `progressPercent >= 60` 的场景。
- 新增 scene full 单次播放能力，与现有 scene detail 单场景 loop 播放分离。
- 随机复习播放按需拉取场景详情并组装 scene full segments，不批量预生成所有音频。
- 随机播放入口与 scene detail / 句子气泡的完整场景循环入口统一为白底圆形按钮；随机播放未播放时保留随机图标，播放中切换为旋转圆圈图标；循环播放未播放时圆圈静止，播放中旋转。

#### 影响范围
- 影响模块：`src/app/(app)/scenes/*`、`src/lib/utils/tts-api.ts`、`src/lib/utils/audio-warmup.ts`
- 是否影响主链路：否，不改变学习进度回写或 scene detail 进入链路
- 是否影响用户可感知行为：是，新增 scenes 页随机复习播放入口

#### 测试 / 验证
- 已运行：
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx" "src/lib/utils/tts-api.scene-loop.test.ts"`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx" "src/components/audio/loop-action-button.test.tsx"`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test src/features/lesson/components/lesson-reader.interaction.test.tsx`
### [2026-04-21] 增加上下文预算与 token 控制规则
- 类型：文档 / 规范治理
- 状态：已完成

#### 背景
现有维护规则已经要求“只读最少上下文”和“先定位再精读”，但没有把 token 成本、上下文预算和任务规模之间的关系沉淀成稳定规则。智能体在大需求里容易读太多旧材料，在小改动里又容易误套重流程。

#### 本次改动
- 新增 OpenSpec change：`add-context-budget-rule`。
- 更新 `AGENTS.md`，增加上下文预算规则和规则入口关系。
- 更新 `docs/README.md`，明确文档阅读应按任务规模递进，不用批量通读目录替代定位。
- 更新 `docs/dev/project-maintenance-playbook.md`，补充上下文预算执行清单和完成态 Review 的上下文污染检查。
- 更新 `docs/dev/change-intake-template.md`，在需求接入阶段记录必读上下文、明确不读上下文、补读触发条件和可能升级条件。
- 更新 `openspec/specs/project-maintenance/spec.md`，将上下文预算、入口职责分层和上下文污染检查沉淀为 stable spec。

#### 影响范围
- 影响模块：维护规则、文档索引、OpenSpec stable spec、变更接入模板。
- 是否影响主链路：否。
- 是否影响用户可感知行为：否，本轮仅调整 AI/维护者协作规则。

#### 测试 / 验证
- 已运行：
  - `rg` 关键词覆盖检查
  - `node_modules\.bin\openspec.CMD status --change "add-context-budget-rule"`
  - `git diff --check`
- 未运行业务测试：本轮不改业务代码、API、数据库或 UI。

#### 明确不收项
- 不清理历史 archive、dev-log 或旧 proposal。
- 不新增自动 token 统计工具。
- 不重写现有文档目录结构。

### [2026-04-21] 持久化 scene practice set 本体
- 类型：Spec-Driven / 主链路数据流
- 状态：实施中，待完成态 Review 与 OpenSpec archive

#### 背景
scene 练习题本体此前只存本地 `scene-learning-flow-v2`，服务端只保存 run / attempt。这样会导致本地和线上同一场景题目不一致，旧本地缓存还可能让页面误以为已有题，但服务端没有对应 set 锚点。

#### 本次改动
- 新增 `user_scene_practice_sets`，保存用户级 scene practice set 本体。
- 新增 `/api/learning/scenes/{slug}/practice/set` GET / POST，用于读取 latest set 与保存生成结果。
- 生成 / 预热 / 重新生成 practice set 后先落服务端，再写本地缓存。
- 页面保留本地缓存秒开，但无论本地是否命中，都后台请求服务端 latest set 并回填本地。
- practice run / attempt / mode-complete / complete 写入前补 `practiceSetId` 所有权校验。

#### 验证
- `node --import tsx --test "src/lib/server/learning/practice-set-service.test.ts"`
- `node --import tsx --test "src/app/api/learning/scenes/[[]slug[]]/practice/set/route.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/use-scene-detail-actions.test.tsx"`
- `pnpm run test:interaction:scene-detail`

#### 本轮收口
- 本地缓存不再作为题目本体权威，只作为秒开与服务端失败降级。
- 旧本地题目启动 run 前会尝试补落库，避免所有权校验直接阻断。
- 重新生成以新 set 为当前题，旧 run / attempt 保持原 `practice_set_id` 可追溯。

#### 明确不收项
- 不做公共题库或跨用户共享题库。
- 不做 exercise 标准化表。
- 不调整题型策略、题量策略或解锁节奏。
- 不重构 review UI。

### [2026-04-21] 精简维护收尾护栏
- 类型：Spec-Driven / 维护流程优化
- 状态：已完成

#### 背景
当前 OpenSpec 与维护规则总体可用，但规则入口偏重、人工收尾检查容易遗漏。需要补一个本地检查入口，并把任务分流与入口职责边界沉淀到接需求阶段，降低小改动误套大流程的概率。

#### 本次改动
- 新增 `maintenance:check`，封装 OpenSpec 全量校验、active change 状态检查、tasks 未完成检查和保守 CHANGELOG 提示。
- 在 `change-intake-template.md` 增加 Fast Track / Cleanup / Spec-Driven 速查表。
- 在 `docs/dev/README.md` 明确 AGENTS、docs README、stable spec、playbook 与 intake template 的职责分层。
- 将维护检查入口、入口文档去重、CHANGELOG 保守提示同步到 `project-maintenance` stable spec。

#### 明确不收项
- 不清理历史乱码输出或旧文档编码显示问题。
- 不重写全量维护文档。
- 不新增 CI bot 或远端自动化。
- 不改变业务代码、API、数据库或用户学习链路。

#### 验证
- 已运行：
  - `pnpm run maintenance:check`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run text:check-mojibake`
  - `git diff --check`

### [2026-04-23] 收口 Scene 页面族样式统一
- 类型：Spec-Driven / UI 样式治理
- 状态：已完成，准备归档 `standardize-scene-page-style`

#### 背景
Today / Review 已完成局部样式常量收口后，`scene` 页面族仍横跨页面层、lesson reader、practice、variants、expression map 与训练浮层。为避免零散样式优化扩大成未受控的视觉重构，本轮先建立页面族级审计、分批顺序和 scene-local 样式入口。

#### 本次改动
- 新增 `src/features/scene/components/scene-page-styles.ts`，集中承载 scene 页面族私有 page shell、section、action、panel、chip、list、skeleton class。
- 收口 `scene-detail-page`、`scene-base-view`、`scene-detail-skeleton` 的低风险页面骨架与 fallback 样式。
- 收口 `scene-practice-view`、`scene-practice-question-card`、`scene-variants-view`、`scene-expression-map-view` 的重复视觉常量。
- 更新 `docs/system-design/ui-style-audit.md`，记录 scene 页面族审计范围、分批顺序、主链路保护点和不收项。
- 同步 `component-library-governance` stable spec，新增页面族级 UI 统一必须先审计并分批落地的规则。
- 顺手修复 `admin-action-button.tsx` 和 `practice-set-service.ts` 的局部类型报错。

#### 明确不收项
- 不改变 scene 阅读、音频、表达保存、practice、variants、expression map、session 恢复、route state、learning sync 或完成判定语义。
- 不把 scene 私有训练组件提升到 shared。
- 不做全局 token 重命名。
- 不处理 chunks detail overlay。
- 不混修 `scene-detail-page.tsx` 既有 `react-hooks/refs` lint 问题。

#### 验证
- 已运行：
  - `pnpm exec eslint src/components/admin/admin-action-button.tsx src/lib/server/learning/practice-set-service.ts`
  - `pnpm exec eslint 'src/app/(app)/scene/[slug]/scene-base-view.tsx' src/features/scene/components/scene-detail-skeleton.tsx src/features/scene/components/scene-page-styles.ts`
  - `pnpm exec eslint src/features/scene/components/scene-page-styles.ts src/features/scene/components/scene-practice-view.tsx src/features/scene/components/scene-practice-question-card.tsx src/features/scene/components/scene-variants-view.tsx src/features/scene/components/scene-expression-map-view.tsx`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/scene/[[]slug[]]/loading.test.tsx' 'src/app/(app)/scene/[[]slug[]]/page.test.tsx'`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx'`
  - `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test src/features/scene/components/scene-practice-view.interaction.test.tsx src/features/scene/components/scene-variants-view.interaction.test.tsx src/features/scene/components/scene-expression-map-view.interaction.test.tsx`
  - `pnpm exec node --import tsx --test src/features/scene/components/scene-practice-selectors.test.ts src/features/scene/components/scene-view-labels.test.ts`
  - `node_modules\.bin\openspec.CMD validate standardize-scene-page-style --strict`
  - `node_modules\.bin\openspec.CMD validate --all --strict`
  - `git diff --check`

### [2026-04-22] 提升维护入口文档可读性
- 类型：Spec-Driven / 维护文档可读性
- 状态：已完成

#### 背景
收尾自动化和入口职责分层已经落地，但维护入口文档仍偏长。Fast Track 小改动虽然规则上不需要大流程，实际阅读时仍容易被 `project-maintenance-playbook.md` 的长篇模块说明拖入深读。

#### 本次改动
- 重写 `docs/dev/README.md` 为短路径入口，首屏说明 Fast Track / Cleanup / Spec-Driven / 完成态收尾分别看哪里。
- 重写 `docs/dev/change-intake-template.md`，在详细检查前增加最小填写块。
- 在 `docs/dev/project-maintenance-playbook.md` 顶部增加快速入口和深读触发条件。
- 将维护入口短路径和深读触发要求同步到 `project-maintenance` stable spec。

#### 明确不收项
- 不重写 `AGENTS.md`。
- 不清理历史 archive、旧 proposal 或 dev-log 全量历史。
- 不重排 scene / review / chunks 等业务专项文档。
- 不新增文档自动格式化或乱码自动修复工具。

#### 验证
- 已运行：
  - `pnpm exec openspec validate improve-maintenance-doc-readability --strict`
  - `pnpm exec openspec validate --all --strict`
  - `pnpm run text:check-mojibake`
  - `git diff --check`
  - `pnpm run maintenance:check`
### [2026-05-09] 公网注册 P0-A 硬门槛落地
- 类型：Spec-Driven / 认证与高成本接口治理
- 状态：实施完成，待真实生产环境 HTTP baseline 与 OpenSpec archive

#### 背景
公开注册前需要先完成最小硬门槛：注册模式、邀请码、邮箱验证拦截、Redis 状态可见，以及高成本接口 user + IP 双维度限流。本轮只收 P0-A，不扩展每日 quota、封禁后台或学习时长可信计时。

#### 本次改动
- 新增 `REGISTRATION_MODE=closed | invite_only | open`，非法或缺失值回退 `closed`。
- 新增 `registration_invite_codes` 与 `registration_invite_attempts` SQL，邀请码只存 hash，并记录 attempt / compensation 状态。
- 新增 `/api/auth/signup` 服务端注册入口，注册页改为调用该入口。
- 新增 `/verify-email`，middleware 阻止邮箱未验证用户进入主应用或受保护 API。
- 高成本接口接入 `enforceHighCostRateLimit`，覆盖 practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate。
- `/api/admin/status` 增加 `rateLimitBackend`，用于确认 `upstash` / `memory`。

#### 验证
- `node --import tsx --test src/lib/server/rate-limit.test.ts src/lib/server/registration.test.ts src/app/api/practice/generate/route.test.ts middleware.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

#### 剩余风险
- 当前未连接真实 Supabase/Upstash 生产环境执行完整 HTTP baseline；小范围开放前必须补跑 closed、invite-only、邮箱验证、user/IP 限流、Origin 拒绝和 Redis 后端状态。
- P0-B 未实现：每日 AI/TTS quota、usage 预占、`generation_limited`、学习时长 delta 上限、今日用量统计和简单封禁能力。
- 当前限流仍保留 Upstash 失败时 fallback 到 memory 的可用性策略；公网开放前必须在 admin/status 与 baseline 中确认实际为 Upstash。
### [2026-05-14] 为 Scenes 补齐日常入门默认场景底座
- 类型：Spec-Driven / scenes 默认内容与列表数据契约
- 状态：实施完成，待后续 archive 与 stable spec 同步

#### 背景
新用户注册登录后，`/scenes` 与 `today` 缺少足够的 builtin 内容承接，首屏更像“等待用户自己创建内容”的空工作台，不符合“进入产品即可开始英语场景学习”的产品目标。

#### 本次改动
- 为 `public.scenes` 新增 `level`、`category`、`subcategory`、`source_type`、`is_starter`、`is_featured`、`sort_order`、`estimated_minutes`、`learning_goal`、`tags` 字段，并保留旧数据与现有 RLS。
- 新增 `supabase/sql/20260514_phase23_builtin_starter_scenes.sql`，对旧 `seed/imported` 数据做向后兼容回填。
- 新增 `src/lib/data/builtin-scene-seeds.ts`，以单一数据源维护 24 个 builtin starter/daily scenes。
- 将现有 `runSeedScenesSync()` 升级为基于 `slug` 的幂等 upsert，并继续只清理 `origin = 'seed'` 的旧内置场景。
- 扩展 `/api/scenes` 列表返回字段与前端 response type，补齐 `level/category/learningGoal/isStarter/isFeatured/sortOrder/tags`。
- 调整 scenes 查询默认排序为 `is_starter -> is_featured -> sort_order -> created_at`，保证新用户优先看到入门场景。
- 新增 `scripts/seed-builtin-scenes.ts` 和 `pnpm run seed:builtin-scenes`，作为可直接执行的 seed 入口。

#### 验证
- 已运行：
  - `node --import tsx --test src/lib/data/builtin-scene-seeds.test.ts src/app/api/scenes/route.test.ts`
  - `pnpm run build`
- 验证结果：
  - 24 个默认场景 slug 唯一。
  - 每个场景都带完整元信息与 4-8 个核心 chunks。
  - `/api/scenes` 返回 starter scenes 扩展字段。
  - 项目 `build` 通过。

#### 本轮收口项
- 收口新用户首屏缺少可直接学习 builtin scenes 的问题。
- 收口 `scenes` 元字段不足导致 pack/starter/featured 无法稳定排序的问题。
- 收口 `/api/scenes` 只返回旧白名单字段，导致新增元数据在 API 层丢失的问题。

#### 明确不收项
- 不做 `today` 个性化推荐或复杂排序策略。
- 不新增 `content_packs` 等内容运营表。
- 不重构 Scene/Today 页面 UI。
- 不扩展新闻、演讲、商务等复杂内容域。
- 不做 stable spec 同步与 archive；等待后续合并/归档阶段处理。
### [2026-05-14] 收紧核心文档编码与乱码检查自保护

- 状态：已完成并归档 `stabilize-core-doc-encoding`

#### 背景

本轮发现 `CHANGELOG.md` 文件本体其实是干净 UTF-8，但 shell 文本预览出现了乱码假象；同时 `scripts/check-mojibake.ts` 把一批乱码片段直接写在源码里，只能通过忽略自身来规避检查。这意味着正式发布文档存在误修风险，乱码检查器本身也缺少自检能力。

#### 本轮收口

- 将 `scripts/check-mojibake.ts` 中的高置信度乱码模式与忽略样例改成编码安全表达，不再把脚本自身加入忽略名单。
- 为乱码检查脚本补最小 Node test，验证常见乱码片段识别和“不得自我豁免”。
- 同步 `project-maintenance` stable spec 与维护手册，明确先区分文件字节损坏和终端显示异常，再决定是否重写核心维护文档。

#### 明确不收项

- 不做全仓历史文档乱码清理。
- 不引入新的第三方编码检测依赖。
- 不改业务功能或页面行为。

#### 验证计划

- `pnpm run text:check-mojibake`
- `node --import tsx --test scripts/check-mojibake.test.ts`
- `pnpm run maintenance:check`
- `pnpm exec openspec validate stabilize-core-doc-encoding --strict`

#### 实际验证

- `pnpm run text:check-mojibake`
- `node --import tsx --test scripts/check-mojibake.test.ts`
- `pnpm exec openspec validate stabilize-core-doc-encoding --strict`
- `pnpm run maintenance:check`

### [2026-05-15] P3 Chunks 必备表达与 builtin core phrase

- 类型：Spec-Driven / Chunks 表达资产闭环
- 状态：实施完成，待 archive

#### 背景

P0/P1/P2 已经让新用户可以从 builtin starter scenes 和 Today 推荐进入学习，但 `Chunks` 仍主要展示 `user_phrases`。新用户未主动保存表达时，表达资产层容易像空后台，无法看到“哪些高频表达值得长期掌握”。

#### 本次改动

- 为 `phrases` 增加 builtin/core phrase 最小元字段：`is_builtin`、`is_core`、`level`、`category`、`phrase_type`、`source_scene_slug`、`frequency_rank`。
- 新增 `supabase/sql/20260514_phase24_builtin_core_phrases.sql`。
- 新增 `src/lib/server/phrases/builtin-service.ts` 和 `GET /api/phrases/builtin`，从 starter/builtin scenes 同步 109 条 core phrase 到共享 `phrases`，并返回当前用户的 `isSaved`。
- 改造 `/chunks` 顶层为“我的表达 / 必备表达”双入口；“我的表达”保留现有 workbench，“必备表达”展示高频表达卡片、筛选条、来源场景和保存 CTA。
- 复用 `POST /api/phrases/save` 保存 builtin phrase，只在用户主动点击后才 upsert `user_phrases`。
- 抽出 `resolveSavedPhraseReviewState`，确保新 expression 保存后进入 due review，重复保存不会重置已有 review/mastery 状态。
- 补 `src/features/chunks/builtin-phrases.ts` selector：筛选、分组、排序、标签文案、已保存判断和推荐结果。

#### 验证

- `node --import tsx --test "src/lib/server/phrases/builtin-service.test.ts"`
- `node --import tsx --test "src/lib/server/phrases/logic.test.ts" "src/features/chunks/builtin-phrases.test.ts"`
- `pnpm run build`

#### 本轮收口项

- builtin/core phrase 与用户资产边界：浏览不写 `user_phrases`。
- 用户主动保存后进入“我的表达”、review due、today/progress 既有聚合。
- builtin phrase 第一批来自真实 starter/builtin scene seed，当前为 109 条唯一表达。
- Chunks 新用户空态有“必备表达”承接。

#### 明确不收项

- 不重构 review 调度算法。
- 不重构 expression cluster。
- 不做复杂词典或 AI 自动推荐。
- 不把 builtin phrase 批量自动塞进 `user_phrases`。

#### 剩余风险

- `GET /api/phrases/builtin` 首次请求会触发 builtin scene / phrase 同步；如果生产环境数据库未先执行 phase23/phase24 SQL，会返回受控错误并展示必备表达空/失败状态。
- 当前未做浏览器端真实账号手动点击验证；build 与最小服务/selector 测试已通过。

### [2026-05-15] P0 学习闭环端到端验收收口

- 类型：Fast Track / 验收测试收口
- 状态：已完成

#### 背景

本轮不新增功能，只锁定新用户或无进度用户可以跑通 `Today -> Scene -> Save Phrase -> Chunks -> Review -> Today` 的第一版 P0 主闭环。

#### 验收项与证据

1. 新用户进入 Today 显示 starter recommendation：`src/lib/server/learning/p0-learning-loop-regression.test.ts`，并由 `today-primary-recommendation.test.ts` 分段覆盖。
2. 点击进入第一个 starter scene：汇总测试断言 recommendation href/slug 指向第一个 starter；页面点击链路由人工验收覆盖。
3. Scene 展示 builtin chunks：汇总测试断言第一个 starter seed 带 core phrase explanations，`builtin-scene-seeds.test.ts` 覆盖全量 seed chunk 结构。
4. 用户保存 scene chunk：`page.regression.test.tsx` 覆盖保存按钮走 `savePhraseFromApi` 并保留 scene 来源；汇总测试覆盖保存 payload contract。
5. 保存后进入 `/api/phrases/mine`：汇总测试调用 `listUserSavedPhrases` 验证 user_phrase 以 scene 来源进入 mine contract。
6. Chunks 页面读取用户表达：`use-chunks-list-data.test.tsx` 覆盖 Chunks 通过 mine 查询读取用户态 scene 表达。
7. Review due 消费该 user_phrase：汇总测试通过 `handleReviewDueGet` + `getDueReviewItems` 验证 due 读取 `user_phrases`，不直接消费 builtin-only phrase。
8. Review submit 写 log 并推进状态：汇总测试通过 `handleReviewSubmitPost` + `submitPhraseReview` 验证写 `phrase_review_logs`、推进 `review_count/correct_count/review_status/next_review_at`。
9. 重复 submit 不写坏状态：汇总测试复用同 idempotency key 连续提交两次，断言只写 1 条 review log；`handlers.test.ts` 分段覆盖 submit 幂等。
10. Scene complete 后 Today 推荐下一个 starter：汇总测试把第一个 starter 标记 completed 后断言 Today 推荐第二个 starter；`today-primary-recommendation.test.ts` 分段覆盖。

#### 本轮改动

- 新增 `src/lib/server/learning/p0-learning-loop-regression.test.ts`，串起 starter seed、Today recommendation、scene chunk save payload、mine contract、Review due、Review submit 幂等和 next starter recommendation。
- 未修改 Today 推荐、Scene 保存、Review 调度、Chunks 页面或业务能力。

#### 测试命令

- `pnpm exec node --import tsx --test src/lib/server/learning/p0-learning-loop-regression.test.ts`
- `pnpm exec node --import tsx --test src/lib/server/learning/p0-learning-loop-regression.test.ts src/lib/server/learning/today-primary-recommendation.test.ts src/lib/data/builtin-scene-seeds.test.ts src/lib/server/request-schemas.test.ts src/lib/server/phrases/logic.test.ts src/lib/server/review/service.user-phrase-flow.test.ts src/app/api/review/handlers.test.ts`
- `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx" "src/app/(app)/chunks/use-chunks-list-data.test.tsx"`

#### 人工验收项与非阻塞问题

- 人工验收项：真实浏览器里 Today 卡片点击、Scene 阅读界面可见性、Chunks 页面视觉展示、Review 页面交互和返回 Today 的导航体验。
- 当前已知非阻塞问题：旧 `lesson-reader` 桌面用例历史上依赖旧 seed 内容；当前 P0 验收以稳定 seed/service contract 为准，仍建议发布前补一次真实桌面与移动浏览器冒烟。
- 2026-05-15 P0 Auth / Session / Smoke 收口

本轮围绕发布前入口稳定性做最小收口，不改 Today 推荐策略、Scene 主流程、Chunks 保存语义和 Review 调度算法。

- 登录根因：
  - 登录页成功后额外调用 `/api/me`，在 Supabase session cookie 尚未稳定时容易把首次请求打成失败，造成“toast 成功但仍停在登录页”或要点多次才能进入。
  - 默认 redirect fallback 是 `/scenes`，所以没有合法 redirect 参数时会落到 Scenes，而不是 `/today`。
- 已落代码收口：
  - 登录成功统一走安全 redirect helper，支持 `redirectTo / redirect / next`，默认 `/today`，拒绝外部 URL。
  - 登录成功改为 `router.replace(target)` + `router.refresh()`，移除成功 toast 和额外 `/api/me` 依赖。
  - 注册 / 发验证码 / 登录、Today/Scenes/Review 的关键 client API 接入中文错误映射；`failed fetch`、`Too many requests`、邀请码失效、凭证错误、session 失效不再直接裸露给用户。
  - Review submit 失败时保留当前题目并显示可读错误；按钮提交中 disabled，避免重复提交。
- 新增测试账号与自动化：
  - 新增 `pnpm run seed:test-users`
  - 新增 `pnpm run reset:test-user`
  - 新增 `pnpm run smoke:p0-auth-loop`
  - 新增 `pnpm run test:scripts`
  - 新增 `scripts/test-users-lib.ts`、`scripts/test-users-supabase.ts`、`scripts/smoke-p0-auth-loop-lib.ts`
- reset 清理范围：
  - `scene_phrase_recommendation_states`
  - `phrase_review_logs`
  - `user_phrase_relations`
  - `user_chunks`
  - `user_expression_cluster_members`
  - `user_expression_clusters`
  - `user_phrases`
  - `user_daily_learning_stats`
  - `user_scene_practice_attempts`
  - `user_scene_practice_runs`
  - `user_scene_practice_sets`
  - `user_scene_variant_runs`
  - `user_scene_sessions`
  - `user_scene_progress`
- 自动化验证：
  - `node --import tsx --test scripts/test-users-lib.test.ts scripts/smoke-p0-auth-loop-lib.test.ts`
  - `node --import tsx --test src/lib/client/api-error.test.ts src/lib/shared/auth-redirect.test.ts`
  - `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(auth)/login/page.test.tsx" "src/app/(auth)/signup/page.test.tsx" "src/app/(app)/review/page.interaction.test.tsx"`
- 当前 blocked：
  - 人工浏览器冒烟仍待在具备测试账号 env 的目标环境补跑。
- 追加执行结果：
  - 使用临时测试账号 `smoke-normal@abandonclaw.test`、`smoke-restricted@abandonclaw.test`、`smoke-admin@abandonclaw.test` 成功执行 `pnpm run seed:test-users`。
  - 本地临时起 dev server 后，`pnpm run smoke:p0-auth-loop -- --base-url=http://127.0.0.1:3000` 已通过，链路覆盖登录默认跳转 `/today`、starter=`daily-greeting`、scene chunk 保存、`/api/phrases/mine`、`/api/review/due`、`/api/review/submit`、`phrase_review_logs` 写入、`daily-greeting` 完成后推荐 `self-introduction`。
  - 额外验证：admin 测试账号访问 `/admin` 返回 200；受限测试账号访问 `/admin` 返回 307 -> `/`。
