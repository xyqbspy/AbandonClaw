## Context

当前学习产品所有功能都要求登录。注册环节(邀请码 + 邮箱验证码 + 设密码)对潜在用户是高摩擦动作,首次访问转化漏斗在"看到落地页 → 完成注册"这一步流失明显。同时分享场景链接的诉求一直存在,但未登录用户进入分享链接只能看到登录墙,无法感知场景化学习闭环的核心价值。

放开匿名访问的真正风险不是 UX,而是成本。现有 7 个高成本接口的限流仅按 `auth.uid()` 维度,匿名身份一旦放开,清缓存换 UUID 就能绕过单 anon_id 配额。本变更必须先解决"匿名身份不可信"这一根本问题,而不是简单"前端隐藏注册按钮"。

参考现有 `api-operational-guardrails` 已具备的 user + IP 双维度限流、`admin-high-cost-emergency-controls` 紧急关闭通道、`logApiError` Sentry breadcrumb 体系,本变更复用现有治理护栏,只新增"匿名身份维度"与"全站匿名池维度",不重写已有限流框架。

## Goals / Non-Goals

**Goals:**

- 未登录访客通过 `localStorage` UUID + 后端中间件识别,能访问非高成本主链路(浏览预生成场景、播放预生成音频)。
- 高成本接口在匿名分支按"全站每日匿名池 + 单 anon_id 每日 + 单 IP 每日 session 数 + 单 IP 滑窗 QPS"四层防御,任意一层触发即返 429,不进入上游高成本调用。
- AI 表达解释在匿名分支有限度放开(全站每日 200 / 单 anon_id 每日 3),用于让访客感知 AI 价值;其他 AI 接口(场景生成 / 相似表达)匿名分支完全禁用。
- TTS 在匿名分支仅允许播放已存在于 Storage 的预生成音频,实时生成接口禁用;单 anon_id 每日播放次数有上限。
- 主链路 SSR 在匿名分支不裸 401/403,改为"引导态"分支并提供注册转化触点。
- 匿名漏斗有最小可观测性(session 创建 → 首屏 → 完成首场景 → AI 体验 → 配额阻断 → 引导展示 → 引导点击 → 注册),使转化率与单转化成本可被量化。
- 整套能力受 `ALLOW_ANONYMOUS_TRIAL=true` env gate 保护,默认关闭;首轮灰度仅"分享链接专属入口"开放。

**Non-Goals:**

- 不改变已登录用户主链路语义、推荐策略、Scene 完成判定、Chunks 保存语义、Review 调度算法。
- 不做"匿名 session → 注册账号"的学习数据迁移;匿名期间所有学习态走 sessionStorage,关浏览器即清,注册后从零开始。
- 不引入浏览器指纹库,不做长期可追踪的设备识别。
- 不在 Today / 首页 / 注册页这种主入口放开匿名访问,仅限分享链接灰度。
- 不放开任何匿名写入业务表的能力(包括保存表达 / 提交 Review / 写 Progress / 导入导出)。
- 不在本变更内决定"匿名 AI 配额放多大""主入口何时开放""数据迁移要不要做",这些都依赖灰度数据,另起 V2 变更。

## Decisions

### 1. 匿名身份采用前端 UUID + 后端 IP_HASH 双因子识别

前端首次访问时生成 UUID v4 写入 `localStorage` 的 `abridge:anon_id`,所有受治理接口在未登录时透传 `X-Anonymous-Id` 头。后端中间件未识别到登录 session 时:

1. 校验 `X-Anonymous-Id` 存在且格式合法,缺失或非法返回 `ANON_ID_REQUIRED`。
2. 计算 `IP_HASH = SHA256(req.ip + DAILY_SALT)`,daily salt 每日 0 点轮换,只用于"单 IP 当日防绕过"判定,过期即不可关联自然人。
3. 在 `anonymous_sessions` 表中 upsert (anon_id, ip_hash) 记录;若同一 ip_hash 当日已创建 ≥ 5 个不同 anon_id,返回 `ANON_IP_RATE_LIMITED` 并不再创建新记录。
4. 注入 `request.anonymous = { anonId, ipHash }` 上下文供下游使用。

**替代方案:**
- *单 UUID 不加 IP*:放弃,因为清缓存换 UUID 成本极低,无法防绕过。
- *浏览器指纹库*:放弃,合规风险且实施复杂度大。
- *Cookie 替代 localStorage*:放弃,匿名访问要求"分享链接即用",Cookie 在跨域场景下不稳定;localStorage + 显式头是 SPA 标准做法。

### 2. Redis 配额采用四层防御,任意一层触发即拒

```
anon:quota:global:ai_explain:{YYYYMMDD}      # 全站每日匿名 AI 解释上限
anon:quota:global:tts_play:{YYYYMMDD}        # 全站每日匿名 TTS 播放上限
anon:quota:session:{anonId}:ai_explain:{YYYYMMDD}  # 单匿名会话每日上限
anon:quota:session:{anonId}:tts_play:{YYYYMMDD}    # 单匿名会话每日上限
anon:ip:session_count:{ipHash}:{YYYYMMDD}    # 单 IP 当日创建匿名 session 上限
anon:ip:request_rate:{ipHash}                # 单 IP 滑窗 60s 请求数上限
```

判定顺序(任一失败即拒,不进入下一层):

1. IP 滑窗 QPS(防 DDoS 风格刷量) → 失败返 `ANON_IP_RATE_LIMITED`
2. IP 当日 session 数(防清缓存绕过) → 失败返 `ANON_IP_RATE_LIMITED`
3. 全站匿名池(防整体成本失控) → 失败返 `ANON_QUOTA_EXCEEDED_GLOBAL`
4. 单会话配额(防单匿名用户消耗过多) → 失败返 `ANON_QUOTA_EXCEEDED_SESSION`

所有计数器走 `INCR + EXPIRE 25h`,每日自然过期,无需主动清理。

**MVP 阈值(保守值,1 周后基于数据调整):**

| 资源 | 全站每日上限 | 单 session 每日 | 单 IP 滑窗 | 单 IP session 数 |
|------|------------|---------------|----------|----------------|
| AI 场景生成 | 0(禁) | 0 | — | — |
| AI 表达解释 | 200 | 3 | — | — |
| AI 相似表达 | 0(禁) | 0 | — | — |
| TTS 实时生成 | 0(禁) | 0 | — | — |
| TTS 预生成播放 | 不限 | 30 | — | — |
| 场景浏览 | 不限 | 不限 | 30 req/min | 5 sessions/日 |
| 匿名 session 创建 | — | — | — | 5 |

**替代方案:** *只做全站池一层*:放弃,单 IP 脚本可在 1 分钟内打爆全站当日额度,影响所有匿名访客。

### 3. 高成本接口接入按"现有 user 分支 + 新增匿名分支"叠加方式

不重写现有限流框架,在受治理接口入口处分支:

```typescript
if (request.user) {
  // 现有 user + IP 双维度限流(不动)
} else if (request.anonymous && featureMatrix[capability].anonAllowed) {
  // 新增匿名四层防御
} else {
  throw new AnonFeatureDisabledError(capability);
}
```

每个 capability 对应 `featureMatrix` 配置,集中维护匿名是否允许 + 配额阈值,避免规则散落到各 handler。Admin 紧急关闭通道复用现有 `admin-high-cost-emergency-controls`,关闭后匿名和已登录用户同时被拒。

### 4. 匿名学习态完全前端化,不写业务表

所有匿名期间产生的学习态(已浏览场景、已播放音频、AI 解释结果缓存、临时"学过"标记)全部存 `sessionStorage`,关浏览器即清。原因:

- 业务表已有的 RLS 策略隐含 `auth.uid() = user_id` 约束,匿名访问无法满足。
- 匿名学习态不可信,落库会污染业务数据并增加清理成本。
- 注册后从零开始的体验损失可接受(用户原本就要看到引导才注册),而工程量大幅降低。

唯一持久化的匿名数据是 `anonymous_sessions` 表(三字段:anon_id / ip_hash / created_at / last_active_at),仅供后端配额判定与防绕过,不存任何业务语义。

**清理任务:** cron 每日凌晨 03:00 清理 `last_active_at < now() - 7 days` 的记录,避免表无限膨胀。

### 5. SSR 在匿名分支走"引导态"组件,不查业务表

受保护页面(Review / Progress / Chunks 我的表达库)在 SSR 阶段 :

```typescript
const session = await getSession();
if (!session && isAnonymousAllowed(pathname)) {
  return <AnonymousGuidanceState page={pathname} />; // 不查业务表
}
```

`AnonymousGuidanceState` 是统一组件,根据页面渲染对应的"为什么用不了 + 注册解锁什么 + 现在能做什么"三段式引导。

可读页面(Today / Scenes 列表 / Scene 详情)在 SSR 阶段查的是公共内容表(预生成场景与音频),不依赖 auth.uid(),只需在 RLS 策略明确允许 `anon role select` 即可。

**SSR 响应头:** 所有匿名 SSR 响应 MUST 带 `Cache-Control: private, no-store`,避免阻断弹窗状态被 CDN 缓存命中导致已登录用户也看到引导态。

### 6. 注册引导分三层强度,按"用户感知价值进度"分级触发

| 强度 | 位置 | 时机 | 关闭策略 |
|------|------|------|---------|
| L1 常驻 | 顶栏 banner / 受限按钮 tooltip | 匿名访问全程 | 不可关闭 |
| L2 软引导 | 完成首场景后 inline 卡片 / Review 页全页占位 | 用户产生"啊哈时刻"后 | 可关闭,本会话不再显示 |
| L3 阻断 | 触发禁用功能 / 配额用尽时的模态弹窗 | 触达边界时 | 必须点击关闭,但有"稍后"选项 |

**触发原则:** 首次访问不立即弹注册(让用户先感知价值),完成第一个场景时 L2,触达边界时 L3。文案强调"注册解锁什么"而不是"不注册不能用"。

**替代方案:** *进首页就弹注册*:放弃,转化漏斗会断在第一步,无法验证"匿名→注册"的真实意愿。

### 7. 漏斗埋点用轻量自建表,不上 Sentry

漏斗事件不属于错误追踪,不进 Sentry。新增最小事件表(或复用现有 `learning_events`):

```
anon_session_created
anon_first_scene_viewed
anon_first_scene_completed
anon_ai_explain_used
anon_quota_blocked            (含 quota_type / blocked_layer)
anon_register_prompt_shown    (含 prompt_level: L1/L2/L3)
anon_register_prompt_clicked  (含 prompt_level)
anon_registered               (含 from_anon_id, 用于关联同一访客的转化)
```

每日 cron 聚合 → `daily_anon_cost_report`(匿名会话数 / AI 调用次数 / 预估成本 / 转化率 / 单转化成本),供决策"V2 要不要放开 AI 场景生成 / 主入口要不要开放匿名"。

Sentry 仍保留,但只用于错误追踪,通过 `Sentry.setTag('user_type', 'anonymous')` 区分匿名特有错误。

## Risks / Trade-offs

- [Risk] **匿名脚本攻击导致全站匿名池被打爆**:1 个 IP 通过批量更换 anon_id + 走多 IP 池可在数小时打爆全站 200 次 AI 配额,影响所有匿名访客 → 用 IP 当日 session 数上限(5)+ 滑窗 QPS(30/min)拦截大流量;告警阈值"全站匿名池 18:00 前消耗 >80%"触发飞书通知,可手动调阈值或临时关闭 env gate。
- [Risk] **CDN 缓存匿名 SSR 响应导致已登录用户看到引导态**:Vercel/Nginx 默认会缓存 GET 响应 → 所有匿名 SSR 响应强制 `Cache-Control: private, no-store`,中间件层统一注入。
- [Risk] **Supabase RLS 拦截匿名访问公共表**:现有 RLS 可能隐含 `auth.uid() IS NOT NULL` → 检查 scenes/builtin_chunks/tts_audio 等公共内容表的 RLS,确保 anon role 可 SELECT;敏感字段(创建者 metadata 等)在 SELECT 中明确排除。
- [Risk] **localStorage UUID 被脚本批量伪造**:脚本可任意生成 anon_id 头 → IP_HASH 防绕过 + IP session 数上限是主要防线;若发现批量 UUID 攻击,可临时强制 anon_id 必须先通过一个简单 challenge(预留接口,本期不实施)。
- [Risk] **匿名漏斗数据隐私**:埋点不记录 IP 明文或 anon_id 明文,只记录 `ip_hash + 当日`,数据保留 30 天后聚合销毁,符合最小化原则。
- [Risk] **SEO 与匿名模式冲突**:Googlebot 不带 X-Anonymous-Id 头 → 中间件识别 user-agent 为爬虫时走"公开只读匿名分支",不创建 anonymous_session 也不计配额,仅渲染公共内容。
- [Risk] **已注册用户清缓存后 localStorage 被错误识别为匿名**:中间件优先看登录 session,只有完全没 session 时才走匿名分支,不会误判;已登录用户的 localStorage 不写 `abridge:anon_id`,避免命名空间污染。

## Migration Plan

1. **P0 基础设施(1.5 人天)**:Redis 配额命名空间设计 + 中间件匿名身份识别 + `anonymous_sessions` 表与清理 cron + IP_HASH 每日盐生成。
2. **P1 接口治理改造(1 人天)**:`featureMatrix` 配置 + 7 个高成本接口入口加匿名分支 + 错误码统一(`ANON_*` 系列)+ Supabase RLS 公共表 anon 可读校验。
3. **P2 前端引导组件(1.5 人天)**:`useAnonymousMode` hook + L1/L2/L3 引导组件 + 配额头消费与展示。
4. **P3 SSR 主链路适配(1 人天)**:Today/Scenes/Scene 详情匿名 SSR + Review/Progress/Chunks `AnonymousGuidanceState` 引导态 + 所有匿名响应强制 `Cache-Control: private, no-store`。
5. **P4 埋点与监控(0.5 人天)**:漏斗事件埋点 + 每日聚合 cron + Sentry user_type 标签 + 告警阈值配置。
6. **P5 灰度(0.5 人天)**:env gate `ALLOW_ANONYMOUS_TRIAL=true` 仅在分享链接专属路由开启,首页/Today 主入口不开;3 天观察 → 调阈值 → 7 天复盘 → 决定 V2。

**回滚方式:** 关闭 `ALLOW_ANONYMOUS_TRIAL` env 即全部回退,中间件匿名分支跳过,所有受保护页面回到登录墙;`anonymous_sessions` 表与 Redis 配额数据保留以便后续分析,不立即清除。

## Resolved Pre-Implementation Decisions

以下决策在 spec 草案阶段完成代码盘点后确定,不再作为 Open Questions:

### D1. `anonymous_sessions` 表归属 `public` schema

**决策:**`anonymous_sessions` 与所有现有表一致放在 `public` schema。

**依据:**
- 全仓 `supabase/sql/*.sql` 24 个 phase 文件未见任何 `CREATE SCHEMA` 语句,所有表默认在 `public`。
- Supabase 客户端默认查询 `public`,跨 schema 需要额外配置,增加复杂度和回归面。
- 权限隔离通过 RLS 策略实现已足够:anon role 在用户态业务表 deny / 在公共内容表 select / 在 `anonymous_sessions` 自身仅可 upsert 自己的 anon_id 记录。
- 表字段最小化(`anon_id`/`ip_hash`/`created_at`/`last_active_at`),不含任何 PII 或敏感业务字段,不需要 schema 级隔离。

### D2. 新建 `anonymous_funnel_events` 表,不复用 `learning_events`

**决策:** 新建专属 `anonymous_funnel_events` 表存放匿名漏斗事件。

**依据:**
- 代码盘点结果:`learning_events` 表在仓库内**不存在**,grep 全仓除 spec 草案外无任何引用。"复用"前提不成立。
- 匿名事件结构与已登录事件差异大:无 `user_id`、有 `from_anon_id`、payload 装 `quota_type`/`blocked_layer`/`prompt_level` 等匿名专属字段。
- 独立表便于实施"30 天聚合后销毁"的隐私策略,不影响其他事件。

**表 schema(最小集):**

```sql
CREATE TABLE anonymous_funnel_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  text NOT NULL,         -- 8 个枚举之一
  anon_id     text NOT NULL,         -- 无 FK,因为 anonymous_sessions 会被清理
  ip_hash     text NOT NULL,
  payload     jsonb,                 -- quota_type / blocked_layer / prompt_level 等
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_anon_funnel_events_anon_id ON anonymous_funnel_events (anon_id);
CREATE INDEX idx_anon_funnel_events_event_name_created_at ON anonymous_funnel_events (event_name, created_at DESC);
```

**RLS:** anon role 仅可 INSERT 自己 anon_id 的事件,不可 SELECT;authenticated role 不可访问(用 service role 跑聚合 cron)。

### D3. 全站每日 200 次 AI 表达解释对应 ≈ $0.14/天 ($4.1/月)

**决策:** 阈值 200 次/天作为 MVP 保守基线。

**依据:**
- 实际 AI 表达解释走 OpenAI Responses API,默认模型 `gpt-4.1-mini`(由 `OPENAI_EXPLAIN_MODEL` env 控制,见 `src/lib/explain/providers/openai.ts:69`)。
- gpt-4.1-mini 2026 年 4 月单价(OpenAI 官方): **input $0.40/1M tokens, output $1.60/1M tokens**(标准价,非批处理)。
- 单次表达解释 token 估算:input ≈ 500 tokens(系统 prompt + selection 上下文),output ≈ 300 tokens(JSON 结构化响应)。
- 单次成本:`500 × $0.40/1M + 300 × $1.60/1M = $0.0002 + $0.00048 = ≈ $0.00068`。
- 全站每日 200 次:`200 × $0.00068 = ≈ $0.136/天`,月度 `≈ $4.1`。

**调整空间:** 灰度数据出来后,若转化率不达标可放宽到 500 甚至 1000 次,月度成本仍 < $30。若供应商单价上调或换更贵模型,需立即收紧阈值并在 dev-log 记录新单价。

**告警阈值:** 单日全站 AI 池消耗 > 80% 在 18:00 前触发告警(对应 ≈ $0.11/天 烧到下午,可能需要紧急关闭 env gate)。

### D4. 分享链接采用 `/share/scene/[slug]` 独立路由

**决策:** 新增 `src/app/(app)/share/scene/[slug]/page.tsx` 独立路由,主路由 `/scene/[slug]` 不动。

**依据:**
- 现有 `src/app/(app)/scene/[slug]/page.tsx` 第 9 行 `await requireCurrentProfile()` 强制登录,该路径承担"已登录用户场景学习"的全部职责。在原路由内分支会让"主入口同时支持已登录态与匿名态"成为新负担,违反 proposal 中"主入口不受灰度影响"原则。
- 独立路由让中间件按路径前缀 `/share/*` 识别匿名灰度入口最干净,无需解析 query。
- SEO 上 `/share/*` 语义清晰("可分享公开内容"),`?from=share` 仅是参数,语义弱。
- 实施方式:新建 `src/app/(app)/share/scene/[slug]/page.tsx`,复用现有 `scene-detail-page.tsx` client 组件;SSR 入口跳过 `requireCurrentProfile()`,改用匿名中间件注入的 `request.anonymous` 上下文。

**后续路由规划:** 若 V2 扩展到分享表达包、分享场景集合,统一在 `/share/*` 下扩展(`/share/expression-pack/[id]`、`/share/scene-pack/[id]`),保持路径前缀语义一致。

**实施偏离记录(2026-05-28 评审补丁 9b917c6):** 上面"实施方式"段约定的"复用 `scene-detail-page.tsx` client 组件"在代码现实中**做不到**——`SceneDetailClientPage` 强依赖 7+ 个受保护 API(学习态记录 / 练习集生成 / 变体训练 / 保存表达 / scene 复用 hook 链),搬到匿名分支会一连串 401。最终实施改成**新建 `src/features/anonymous-trial/components/share-scene-preview-client.tsx` 子组件**,独立承载匿名场景预览(SSR 走 `getPublicSceneBySlug` + anon RLS,client 处理选词触发 explain-selection + 句子级 TTS 播放),`SceneDetailClientPage` 完全未动,严格遵守不收项 §11.2("不改变已登录用户主链路语义")。这个偏离是工程现实的取舍,不是设计缺陷——原计划低估了复合组件的耦合面。详见 `docs/dev/dev-log.md` 顶部"自评审补丁"entry。

## Stability Closure

### 不稳定点

- 现有限流仅按 user 维度,放开匿名访问会立即暴露成本绕过风险。
- SSR 受保护页面对未登录访客缺少受控失败路径,直接暴露 401/403。
- 匿名→注册的转化数据完全缺失,功能上线后无法量化 ROI。

### 本轮收口

- 匿名身份四层防御 + 配额隔离 + 紧急关闭通道。
- 主链路 SSR 匿名分支与统一引导态组件。
- 漏斗埋点与每日匿名成本聚合看板。

### 延后项

- 匿名→注册数据迁移、主入口匿名开放、AI 场景生成少量配额放开,均需本轮灰度数据验证后另起 V2 变更。
