# Anonymous Trial（匿名试用 + 分享灰度入口）

## 1. 模块目标

匿名试用模块负责把"未注册访客通过首页试用入口或分享链接首次接触产品"这一漏斗第一步从"看到登录墙"改成"先体验再决定"，同时把 AI / TTS 等付费链路的成本严格隔离在已登录用户配额体系之外。

它**不是产品主链路**，而是一个独立的灰度入口层，由 `ALLOW_ANONYMOUS_TRIAL` env 总开关控制开放。关闭时所有匿名路径直接退回 `/login`，主入口 today / scenes / scene / review / chunks / progress 永远要求登录。

## 2. 输入

- 首页试用入口（指向 `/trial`，再跳默认 `/share/scene/[slug]`）或外部分享链接（指向 `/share/scene/[slug]` 灰度 URL）
- 公共内容表（`scenes` is_public=true / `scene_variants` / `chunks` / `phrases` is_builtin|is_core）
- 已上传的预生成 TTS 音频（Supabase Storage `tts-audio` bucket）
- `X-Anonymous-Id` 请求头（前端 localStorage UUID v4 透传）
- `ALLOW_ANONYMOUS_TRIAL` env 开关 + `ANON_DAILY_SALT_SECRET` 每日轮换盐

## 3. 输出

- `/trial` 不再渲染独立列表，默认跳转到精选公开场景的 `/share/scene/[slug]`
- `/trial/scene/[slug]` 不再渲染独立详情，直接跳转到同 slug 的 `/share/scene/[slug]`
- `/share/scene/[slug]` 是唯一匿名场景预览 UI，渲染场景内容（标题 / 句子 / 中英对照）
- 句子级 TTS 播放（点击触发，调 `/api/anonymous/tts/play`）
- 选词触发 AI 表达解释（调 `/api/explain-selection` 带 X-Anonymous-Id 头）
- 三层注册引导：L1 顶栏配额条 / L2 内联卡片 / L3 阻断弹窗
- 8 个漏斗事件落盘到 `anonymous_funnel_events` 表
- 每日 cron 聚合到 `daily_anon_cost_report`（转化率 + 单转化成本 + AI/TTS 调用量）

## 4. 核心规则

### 4.1 主入口完全不受灰度影响

- middleware `PROTECTED_PAGE_PREFIXES` 显式守护 today / scenes / scene / review / chunks / progress / settings / lesson / admin，匿名访问被强制重定向到 `/login`
- 该列表**不得**加 `/share` 或 `/trial`；`/share/*` 与 `/trial/*` 由 middleware 透传到页面，页面自己判 env 开关
- `SceneDetailClientPage`（主路由 `/scene/[slug]`）**不动**，匿名分支完全走独立的 `ShareScenePreviewClient`
- `/trial` 与 `/trial/scene/[slug]` 只做跳转，不承载独立试用 UI 或本地练习区

### 4.2 身份四道防线（按强度递增）

1. **localStorage UUID + X-Anonymous-Id 头**：identify 同一访客；脚本可伪造，**不靠这一层做安全**
2. **`ip_hash = SHA256(ip + daily_salt)`**：每日 salt 0:00 UTC 轮换，不存明文 IP，做 IP 维度防绕过
3. **`anonymous_sessions` 表 + 同 IP 当日 session 上限**：默认 5/IP/日，触顶返 `ANON_IP_RATE_LIMITED(429)`
4. **搜索引擎爬虫识别**：UA 命中 Googlebot / Bingbot 等时不创建 anonymous_session、不计配额、不签发 TTS signed URL

### 4.3 两类匿名 capability 走两套 quota

- **`explain_selection`**（HighCostCapability，调付费上游）：完整四层防御 + 全站日预算 + 单 anon 日上限 + IP 滑窗，默认 200/天全站 + 3/天单 anon + 30/min IP
- **`tts_play`**（**非** HighCostCapability，只读 Storage）：独立 `tts-playback-quota` 模块，**无全站池**（storage hit 零边际成本），只有 session 一层 + 共享同一个 IP 滑窗 scope，默认 30/天 单 anon
- 已登录用户的 `quota:{userId}:{cap}:{date}` 完全不动，改一边不影响另一边

### 4.4 表权限四道边界

- **公开内容表**（`scenes` / `scene_variants` / `chunks` / `phrases`）：anon SELECT 显式策略 + WHERE `is_public = true` 或 `is_builtin = true`
- **所有用户态表**（`profiles` / `user_*` / `phrase_review_logs` 等 17 张）：默认 deny，不加任何 anon 策略 → 由 `rls-policy-audit.test.ts` SQL parser audit test 守护这一不变量
- **匿名支撑表**（`anonymous_sessions` / `anonymous_funnel_events` / `daily_anon_cost_report`）：对 anon role 显式 `using (false)`，只 service role 能读写

### 4.5 匿名学习态不持久化

- 所有匿名期间产生的学习状态（已浏览场景、AI 解释结果、临时"学过"标记、本地练习答案）走 sessionStorage 或前端内存，关浏览器即清
- 唯一持久化的匿名数据是 `anonymous_sessions`（4 字段：anon_id / ip_hash / created_at / last_active_at），不存任何业务语义
- daily cron 清理 `last_active_at < now() - 7 days` 的记录
- 注册后从零开始，本期**不做**匿名 → 注册数据迁移（属于 V2 项）

### 4.6 漏斗 8 事件强校验

- 事件名硬编码 union type，未知名直接抛错防漏斗失真
- server 端 3 个事件:`anon_session_created` / `anon_quota_blocked`(带 blocked_layer + capability) / `anon_ai_explain_used`
- client 端 4 个事件:`anon_first_scene_viewed` / `anon_register_prompt_shown` (L1/L2/L3) / `anon_register_prompt_clicked` (L1/L2/L3) / `anon_first_scene_completed`(本期未接,V2)
- `anon_registered` 在注册成功路径触发,带 `from_anon_id` 关联(本期未接,需要改注册流程)

### 4.7 一键止血

- `ALLOW_ANONYMOUS_TRIAL=false` → 所有 `/share/*` 与 `/trial/*` 退回 `/login`，主链路零影响
- 紧急关闭单个高成本 capability（admin emergency disable）会同时拒绝已登录与匿名分支
- 内存 counter fallback 时 logger.warn 暴露（多实例下日上限会被放大,运维要看 warn 决策是否止血）

## 5. 上下游依赖

**上游**：
- `scenes` / `scene_variants` / `chunks` / `phrases` 公开内容表（共享主模块的数据）
- TTS Storage（共享 `tts-audio` bucket 的预生成音频）
- `/api/explain-selection` 路由（共享 AI 表达解释 handler，匿名分支走 `ensureProfileOrAnonymousQuota` 守护）

**下游**：
- `anonymous_sessions` / `anonymous_funnel_events` / `daily_anon_cost_report` 三张专属表
- Redis `anon:quota:*` 命名空间（与 `quota:{userId}:*` 严格分离）
- Sentry user_type=anonymous tag（错误分组聚合）
- 飞书告警（同 IP session > 10 / 全站匿名 AI 池 18:00 UTC 前 > 80% / quota_blocked / session_created > 60%）

**反向触发**：
- 注册转化（`/signup?from=share&scene={slug}` 回跳路径）→ 后续 V2 接 `anon_registered` 事件

## 6. 常见改动风险

- **改 `scenes.is_public` 语义或 RLS 策略** → 必须一并检查 `ShareScenePreviewClient` 仍能正确渲染
- **改主路由 `/scene/[slug]` 的 `SceneDetailClientPage`** → 不要 leak 到匿名分支；本模块不收项 §11.2 严格禁止改已登录用户主链路语义
- **改 `HighCostCapability` 数组** → 不要把 `tts_play` 加进去（zero edge cost capability 加进去会污染 admin 紧急关闭面板 / 用户日 quota 表）
- **改 quota counter key 格式** → spec 文档约定的 key 模板被 `peekDailyCounter` 测试硬编码引用,改了会让 quota 回滚 audit test 失效
- **改 middleware `PROTECTED_PAGE_PREFIXES`** → 把 `/share` 或 `/trial` 加进去会让匿名路径全死掉;`audit test` 守护这点不变
- **改 `tts-audio` bucket public/private** → 当前是 private + signed URL,改 public 会让 TTS 配额形同虚设
- **加新 capability 给匿名** → 必须显式设计 quota / 防绕过 / 漏斗 / 紧急关闭 / 文档,不能"顺手开"

## 7. 测试关注点

- **server 单测**:
  - `src/lib/server/anonymous/quota.test.ts`(11 例,含 global/session 回滚 + IP 限流共享 scope)
  - `src/lib/server/anonymous/tts-playback-quota.test.ts`(7 例,含 session 回滚 + global 不限)
  - `src/lib/server/anonymous/counter.test.ts`(4 例,decrDailyCounter 内存层语义)
  - `src/lib/server/anonymous/session-store.test.ts`(IP session 上限 + 新 anonId 触发埋点)
  - `src/lib/server/anonymous/route-guard.test.ts`(两态 helper + 爬虫透传)
  - `src/lib/server/anonymous/rls-policy-audit.test.ts`(SQL parser 守护 17 张用户态表 deny anon 不变量)
- **API 路由单测**:
  - `src/app/api/explain-selection/route.test.ts`(匿名分支挂 quota 头 + 配额耗尽)
  - `src/app/api/anonymous/tts/play/route.test.ts`(9 例,已登录命中/miss/匿名命中/配额耗尽/缺头/爬虫/query 校验)
- **页面 audit 测试**:`src/app/share/scene/[slug]/page.audit.test.ts` + `src/app/trial/page.audit.test.ts`(SSR 路径 + `/trial` 跳转 + 爬虫分支 + middleware Cache-Control 注入 + PROTECTED_PAGE_PREFIXES 不含 /share 和 /trial)
- **客户端 interaction 测试**:`src/features/anonymous-trial/components/share-scene-preview-client.test.tsx`(渲染 + 选词 explain + L1/L2 注册点击 + TTS 播放 + 配额耗尽 + storage miss)
- **migration audit**:`src/lib/server/anonymous/funnel-daily-aggregation-audit.test.ts`(phase27 SQL 函数签名 + 单价常量 + 防除零)

## 8. 相关锚点

- 实现:`src/features/anonymous-trial/`(client) + `src/lib/server/anonymous/`(server) + `src/app/api/anonymous/`(API) + `src/app/share/scene/[slug]/`(分享灰度页) + `src/app/trial/`(试用入口跳转页)
- Spec:`openspec/specs/anonymous-trial-mode/spec.md` + `openspec/specs/api-operational-guardrails/spec.md`
- Migration:`supabase/sql/20260528_phase25_anonymous_trial_mode.sql`(三张表)+ `20260528_phase26_anonymous_rls_public_content.sql`(RLS)+ `20260528_phase27_anonymous_funnel_daily_aggregation.sql`(daily 聚合)
- Env:`.env.example` "匿名试用灰度" 段(总开关 + daily salt + IP session 上限 + 各 capability 配额)
- 文档:[product-overview.md §5.11 / §6.6 / §8.8](/d:/WorkCode/AbandonClaw/docs/meta/product-overview.md) + [interview-project-deep-dive.md §12](/d:/WorkCode/AbandonClaw/docs/meta/interview-project-deep-dive.md) + [domain-rules/auth-api-boundaries.md §3.8](/d:/WorkCode/AbandonClaw/docs/domain-rules/auth-api-boundaries.md)
