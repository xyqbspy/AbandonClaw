## Why

当前产品需要登录注册才能体验任何功能,潜在用户在首次访问的注册环节流失明显;同时分享场景链接给非用户后,对方进入只能看到登录墙,无法感知"场景化学习 → 表达沉淀 → 复习回流"这一核心价值。

放开匿名访问的最大风险不是 UX,而是成本。现有 7 个高成本接口(AI 场景生成 / AI 表达解释 / AI 相似表达 / TTS 实时生成等)的限流与每日额度都是按用户维度,匿名身份一旦放开,清浏览器缓存换 UUID 就能绕过配额,刷成本成本极低。

本变更引入受控的匿名试用模式,使未登录访客能体验主链路的"非高成本部分"(浏览预生成场景、播放预生成音频、有限次 AI 表达解释),同时通过 IP 维度限流 + 全站匿名池 + 单 IP 匿名 session 数上限的三层防绕过,保证匿名流量的 AI / TTS 成本可控、可观测、可紧急关闭。

## What Changes

- 新增匿名身份机制:前端 `localStorage` 生成持久 UUID 并通过 `X-Anonymous-Id` 头透传;后端中间件在未登录时识别匿名身份,并按 `IP_HASH(req.ip + DAILY_SALT)` 做单 IP 防绕过判定。
- 新增匿名会话表 `anonymous_sessions` (最小字段:anon_id / ip_hash / created_at / last_active_at),不持久化任何学习数据,所有匿名期间的学习态走前端 `sessionStorage`。
- 新增 Redis 配额命名空间 `anon:quota:*`,与已登录用户配额完全隔离;包含全站每日匿名池上限、单 anon_id 每日上限、单 IP 每日 session 数上限、单 IP 滑窗 QPS 上限四种维度。
- 现有 7 个高成本接口接入匿名分支:AI 场景生成 / AI 相似表达 / 保存表达 / 导入 / 导出 / Review submit / Progress 聚合在匿名模式下返回 `ANON_FEATURE_DISABLED`;AI 表达解释 / TTS 预生成音频播放按"全站池 + 单会话"双重配额放开。
- 新增统一前端 hook `useAnonymousMode` 与三层注册引导组件:L1 顶栏常驻提示(剩余次数)、L2 inline 软引导(完成首个场景后 / Review 页占位)、L3 阻断弹窗(触发禁用功能 / 配额用尽)。
- 受限页面(Review / Progress / Chunks 我的表达库)在匿名模式下走 SSR "未登录引导态"分支,不查业务表也不报错。
- 新增匿名漏斗最小埋点(session 创建 / 首屏浏览 / 完成首场景 / AI 解释使用 / 配额阻断 / 注册引导点击 / 注册转化)与每日匿名成本聚合,使匿名→注册转化率与单转化成本可量化。
- 受 env gate `ALLOW_ANONYMOUS_TRIAL=true` 保护,默认关闭;首次仅放开"分享链接入口"的灰度,Today / 首页主入口的匿名访问待数据验证后再考虑。
- Sentry 错误上报与 `logApiError` breadcrumb 新增 `user_type=anonymous|registered` 维度,使匿名特有错误可独立排查。

## Capabilities

### New Capabilities

- `anonymous-trial-mode`: 定义匿名身份生成与识别、匿名配额隔离、匿名功能开关矩阵、注册引导触点强度、匿名漏斗埋点与匿名成本看板的稳定行为边界。

### Modified Capabilities

- `api-operational-guardrails`: 在现有 user + IP 双维度限流之上,补充"匿名 anon_id 维度"和"全站匿名池维度"的限流要求;新增匿名模式下高成本能力管理员紧急关闭、Sentry user_type 维度与匿名特有受控错误码。
- `auth-api-boundaries`: 补充未登录访客在匿名模式下访问受保护接口的判定与失败收敛规则,包括 `ANON_ID_REQUIRED` 缺失头、`ANON_FEATURE_DISABLED` 受限功能、`ANON_QUOTA_EXCEEDED_*` 配额用尽的统一错误响应契约。
- `learning-loop-overview`: 标注匿名模式下主链路的可见性边界(Today / Scene 可读 / 部分 AI 可触发 / Review / Progress / Chunks 表达库不可用),不改变已登录用户主链路语义。

## Impact

- 页面与组件:`src/app/(app)/today`、`src/app/(app)/scenes`、`src/app/(app)/scene/[slug]`、`src/app/(app)/review`、`src/app/(app)/progress`、`src/app/(app)/chunks` 的 SSR 兼容匿名分支;新增 `src/features/anonymous-trial/` 模块(hook / L1/L2/L3 引导组件)。
- API:`/api/scene/parse`(禁)、`/api/expression-map/generate`(禁)、AI 表达解释入口(限)、TTS 音频签名/生成入口(签名可访问,实时生成禁)、`/api/phrases/*`(禁)、`/api/review/*`(禁)、`/api/progress/*`(禁)、`/api/import|export`(禁) 入口加匿名分支。
- 服务端与工具:新增匿名身份中间件、`anonymous_quota` 服务、`anonymous_session` 服务、`logApiError` 注入 user_type 标签;复用现有 `requestId` helper、`AppError` 子类体系。
- 数据:新增 `anonymous_sessions` 表与每日清理 cron;Redis 新增 `anon:quota:*`、`anon:ip:*` 命名空间;Supabase RLS 策略明确所有学习数据表对匿名访问 deny。
- 缓存:所有匿名 SSR 响应 MUST 带 `Cache-Control: private`,不进 Vercel/CDN 共享缓存,避免阻断弹窗状态被缓存命中。
- 测试与文档:新增匿名身份 / 配额隔离 / 防绕过 / 引导组件单元测试;扩展现有 P0 smoke 增加"匿名访客主链路冒烟"场景;`docs/dev/dev-log.md` 记录灰度过程,`docs/meta/interview-project-deep-dive.md` 补"匿名试用 + 配额隔离"叙事。

## Stability Closure

### 本轮暴露的不稳定点

- 现有限流仅按已登录 user 维度,放开匿名访问会出现"清缓存换身份绕过配额"的真实成本风险。
- 业务表与 Supabase RLS 当前隐含"必须有 auth user"假设,匿名 SSR 访问受保护接口会直接抛裸错误而非可读引导。
- 未登录用户在 Review / Progress 页缺少明确的"为什么用不了 + 注册解锁什么"的引导,转化漏斗第一步就断。
- 没有匿名漏斗的可观测性,匿名→注册的转化率与单转化匿名成本无法被量化,功能上线后无法判断 ROI。

### 本轮收口项

- 匿名身份生成 / 透传 / 后端识别 / 防绕过四件套的统一中间件入口。
- 匿名配额体系与已登录用户配额的完全隔离 + 紧急一键关闭通道。
- 主链路 SSR 在匿名模式下的可见性边界与"引导态"分支。
- L1/L2/L3 三层注册引导的位置、时机、文案与关闭策略。
- 匿名漏斗最小埋点与每日匿名成本聚合看板。

### 明确不收项

- 不改变已登录用户的主链路语义、推荐策略、Scene 完成判定、Chunks 保存语义、Review 调度算法。
- 本轮不做"匿名 session → 注册账号"的数据迁移按钮,匿名期间的学习态全部 sessionStorage,关浏览器即清,注册后从零开始。
- 不做浏览器指纹追踪(合规风险),IP_HASH 仅作为每日防绕过判定,每日盐轮换,不可长期归因到自然人。
- 不开放任何匿名模式下的写入业务表能力(包括保存表达 / 提交 Review / 写入 progress),所有写入入口在匿名分支统一返回 `ANON_FEATURE_DISABLED`。
- 不在 Today / 首页主入口开放匿名访问,首轮仅"分享链接专属入口"灰度;主入口何时开放由数据决定,不在本变更范围。

### 延后原因与风险记录

匿名→注册的数据迁移、主入口匿名开放、AI 场景生成的少量匿名配额放开,均依赖本轮埋点产出的"匿名转化数据"才能合理决策。本轮先用最保守阈值跑灰度,1-2 周后基于数据另起 V2 变更。若灰度期发现匿名 AI 成本失控或被批量脚本攻击,需立即关闭 env gate 并复盘,不在本轮内做应急扩展。

**V2 第 1 项已落地(2026-05-28,commit 7f6aff5):** "TTS 预生成播放给匿名访客"原计划列在 V2,实施 9b917c6 / b2aef79 / 7f6aff5 三个补丁 commit 时一并落地。新增独立路由 `/api/anonymous/tts/play` + 独立 quota 模块 `tts-playback-quota.ts`(不进 HighCostCapability,理由见 spec delta `api-operational-guardrails/spec.md` 末尾 Requirement),ShareScenePreviewClient 句子级播放按钮串通。剩余 V2 项目(匿名→注册数据迁移、主入口开放、AI 场景生成放开)仍待灰度数据决策。详见 `docs/dev/dev-log.md` 顶部"匿名 TTS 预生成播放接入(灰度 V2 第一项)" entry。
