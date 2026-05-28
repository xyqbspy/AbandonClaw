## 1. 链路盘点与边界确认

- [x] 1.1 盘点现有 user + IP 双维度限流的中间件入口、Redis backend(upstash/memory)与 helper 复用点,确认匿名分支可叠加而无需重写。
- [x] 1.2 盘点现有 7 个高成本接口(AI 场景生成 / AI 表达解释 / AI 相似表达 / TTS 生成 / TTS 签名 / 保存表达 / Review submit)的入口路径,记录在 dev-log。
- [x] 1.3 盘点 Supabase RLS 策略,确认 scenes / builtin_chunks / tts_audio 等公共内容表对 anon role 的 SELECT 行为,识别需要补充的策略点。
- [x] 1.4 盘点 Today / Scenes 列表 / Scene 详情 / Review / Progress / Chunks 我的表达库的 SSR 入口与 auth 依赖,识别需走"引导态"分支的页面。
- [x] 1.5 盘点现有 `learning_events` 表 schema,决定漏斗事件复用现表 / 新建匿名漏斗表,在 dev-log 记录决策。
- [x] 1.6 确认 AI 表达解释当前供应商单价并换算"全站每日 200 次"对应美元成本,记录在 dev-log 作为阈值依据。

## 2. 匿名身份与防绕过基础设施

- [x] 2.1 新增 `src/lib/anonymous/identity.ts`,提供 `getOrCreateAnonId`(前端 localStorage)、`hashIp(ip, dailySalt)`、`getDailySalt()` 三个 helper。
- [x] 2.2 新增 `anonymous_sessions` 表(字段:id uuid PK / anon_id text unique / ip_hash text / created_at / last_active_at),迁移脚本入 `supabase/sql/`。
- [x] 2.3 新增中间件 `src/middleware/anonymous-identity.ts`,在未登录请求中:校验 `X-Anonymous-Id` 头、计算 ip_hash、upsert anonymous_session、注入 `request.anonymous` 上下文。
- [x] 2.4 新增 `ALLOW_ANONYMOUS_TRIAL` env gate,中间件入口处先判定 env;关闭时所有匿名分支跳过,行为回归"必须登录"。
- [x] 2.5 新增 daily cron `cleanup_anonymous_sessions`,清理 `last_active_at < now() - 7 days` 的记录;新增 daily cron `rotate_daily_salt`,在每日 00:00 轮换 IP_HASH 盐。
- [x] 2.6 补单元测试覆盖:anon_id 格式校验、ip_hash 同日同 IP 一致性、daily salt 轮换、upsert 幂等性、env gate 关闭时中间件 no-op。

## 3. Redis 配额体系与四层防御

- [x] 3.1 新增 `src/lib/server/anonymous-quota.ts`,提供 `checkAnonymousQuota(capability, anonId, ipHash)` 入口,内部按 IP 滑窗 → IP session 数 → 全站池 → 单会话四层判定。
- [x] 3.2 配置 Redis key 命名空间 `anon:quota:global:*` / `anon:quota:session:*` / `anon:ip:*`,所有计数器统一 `INCR + EXPIRE 25h`。
- [x] 3.3 新增 `featureMatrix` 配置(`src/lib/server/anonymous-feature-matrix.ts`),集中维护 capability → {anonAllowed, globalDailyLimit, sessionDailyLimit, alertThreshold}。
- [x] 3.4 新增受控错误码 `ANON_ID_REQUIRED` / `ANON_FEATURE_DISABLED` / `ANON_QUOTA_EXCEEDED_GLOBAL` / `ANON_QUOTA_EXCEEDED_SESSION` / `ANON_IP_RATE_LIMITED`,统一作为 AppError 子类,纳入现有 `toApiErrorResponse` 收敛体系。
- [x] 3.5 限流响应必须带配额响应头:`X-Quota-Type` / `X-Quota-Daily-Limit` / `X-Quota-Daily-Remaining` / `X-Quota-Session-Limit` / `X-Quota-Session-Remaining` / `X-Quota-Reset-At`。
- [x] 3.6 补单元测试覆盖:四层判定顺序、任一层失败即拒、配额头格式正确、不同 capability 阈值独立、daily salt 轮换后旧 ip_hash 不能命中新计数器。

## 4. 高成本接口接入匿名分支

- [x] 4.1 在 `featureMatrix` 标记 AI 场景生成 / AI 相似表达 / TTS 实时生成 / 保存表达 / Review submit / 导入 / 导出 为 `anonAllowed: false`。
- [x] 4.2 在 `featureMatrix` 标记 AI 表达解释 `anonAllowed: true, globalDailyLimit: 200, sessionDailyLimit: 3`;TTS 预生成播放 `anonAllowed: true, globalDailyLimit: -1, sessionDailyLimit: 30`。
- [x] 4.3 改造 AI 场景生成、AI 相似表达、保存表达、Review submit、Progress 写入、导入、导出 7 个接口入口,统一在路由入口处:`if (!request.user && !featureMatrix[capability].anonAllowed) throw new AnonFeatureDisabledError(capability)`。
- [x] 4.4 改造 AI 表达解释、TTS 预生成签名接口,在路由入口处:`if (!request.user) await checkAnonymousQuota(capability, anonId, ipHash)`,通过后才进入业务处理。
- [x] 4.5 复用现有 `admin-high-cost-emergency-controls`,确认管理员关闭后匿名分支也被拒;若不自动覆盖,在 `checkAnonymousQuota` 入口处先调用 emergency control 判定。
- [x] 4.6 补集成测试覆盖:7 个禁用接口在匿名分支返 403 `ANON_FEATURE_DISABLED`;AI 表达解释超 session 配额返 429 `ANON_QUOTA_EXCEEDED_SESSION`;全站池打满后返 429 `ANON_QUOTA_EXCEEDED_GLOBAL`;管理员紧急关闭后匿名分支即时被拒。

## 5. Supabase RLS 与公共内容表

- [x] 5.1 审查 `scenes` / `builtin_chunks` / `tts_audio` / `scene_metadata` 等公共内容表的 RLS,新增或补充 anon role SELECT 策略。
- [x] 5.2 审查表中是否含创建者 metadata / 内部字段,确保匿名 SELECT 不暴露非公开字段;必要时使用 view 屏蔽。
- [x] 5.3 明确所有用户态表(`user_*`、`*_logs`、`phrase_*`)对 anon role 完全 deny,补 RLS 策略。
- [x] 5.4 在 `supabase/sql/` 新增迁移脚本记录上述 RLS 变更,在 dev-log 记录决策。
- [x] 5.5 补集成测试用 anon role 访问公共表 / 用户态表,确认行为符合 RLS 设计。

## 6. SSR 主链路适配匿名分支

- [x] 6.1 新增 `src/features/anonymous-trial/AnonymousGuidanceState.tsx` 引导态组件,支持按 page 参数(`review` / `progress` / `chunks`)渲染不同三段式文案。
- [x] 6.2 改造 Today / Scenes 列表 / Scene 详情 SSR,匿名分支查公共内容表正常渲染;Today 显示"试用推荐场景"列表(精选 3-5 预生成场景)。
- [x] 6.3 改造 Review / Progress / Chunks 我的表达库 SSR,匿名分支直接返回 `<AnonymousGuidanceState page={pathname} />`,不查业务表也不抛错。
- [x] 6.4 所有匿名 SSR 响应在中间件层强制注入 `Cache-Control: private, no-store`,确保不进 CDN / Vercel edge 缓存。
- [x] 6.5 中间件识别 user-agent 为搜索引擎爬虫时走"公开只读匿名分支",不创建 anonymous_session 也不计配额,仅渲染公共内容。
- [x] 6.6 补 SSR 测试覆盖:匿名访问 Today/Scenes 返回内容、匿名访问 Review/Progress/Chunks 返回引导态、所有匿名响应携带 `Cache-Control: private, no-store`。

## 7. 前端引导组件与 hook

- [x] 7.1 新增 `src/features/anonymous-trial/use-anonymous-mode.ts` hook,提供 `isAnonymous` / `anonId` / `quotaState`(从响应头消费)/ `showRegisterPrompt(level)`。
- [x] 7.2 新增 L1 顶栏 banner 组件:展示"体验模式 · AI 表达解释剩 X/3 次 · [立即注册解锁]",配额剩 1 时变红加感叹号。
- [x] 7.3 新增 L1 受限按钮 tooltip,hover 显示"注册后可保存表达到个人表达库"等针对性文案。
- [x] 7.4 新增 L2 完成首场景后 inline 卡片:横幅"刚刚学的这个场景里有 N 个表达,注册后可一键全部保存",本会话可关闭一次。
- [x] 7.5 新增 L3 阻断弹窗:覆盖"触发禁用功能"、"AI 表达解释配额用尽"、"TTS 播放配额用尽"三种触发点,文案模板化,统一"注册 / 稍后"两按钮。
- [x] 7.6 补组件测试覆盖:L1 配额展示与状态变化、L2 卡片关闭后本会话不再展示、L3 弹窗三种触发场景的文案与按钮行为。

## 8. 匿名漏斗埋点与成本看板

- [x] 8.1 决定漏斗事件复用 `learning_events` 还是新建 `anonymous_events` 表,在 dev-log 记录决策与表 schema。
- [x] 8.2 接入 8 个漏斗事件埋点:`anon_session_created` / `anon_first_scene_viewed` / `anon_first_scene_completed` / `anon_ai_explain_used` / `anon_quota_blocked` / `anon_register_prompt_shown` / `anon_register_prompt_clicked` / `anon_registered`(后者关联 from_anon_id)。
- [x] 8.3 新增 daily cron 聚合 `daily_anon_cost_report`(字段:date / total_sessions / ai_explain_calls / tts_play_count / estimated_cost_usd / conversion_rate / cost_per_conversion)。
- [x] 8.4 Sentry 统一注入 `Sentry.setTag('user_type', isAnonymous ? 'anonymous' : 'registered')`,在 `logApiError` breadcrumb 中也补该 tag。
- [x] 8.5 配置告警:`anon_ip_session_count > 10/IP/日` / `全站匿名 AI 池 18:00 前消耗 > 80%` / `anon_quota_blocked / anon_session_created > 60%` 三条触发飞书通知。
- [x] 8.6 补埋点测试覆盖:8 个事件触发时机正确、from_anon_id 关联正确、daily 聚合 SQL 输出符合预期。

## 9. 灰度发布与配置

- [x] 9.1 确定分享链接灰度路由形式(在 dev-log 记录决定:`/share/scene/{slug}` 或 `/scene/{slug}?from=share`),仅该路由开启 `ALLOW_ANONYMOUS_TRIAL` 匿名分支。
- [x] 9.2 Today / 首页 / 注册页等主入口在中间件层显式排除匿名分支,确保灰度只在分享链接生效。
- [x] 9.3 部署文档更新:env 变量 `ALLOW_ANONYMOUS_TRIAL` / `ANON_DAILY_SALT_SECRET` 配置说明、Redis 命名空间隔离说明、Supabase RLS 部署顺序。
- [ ] 9.4 灰度上线后第 3 天 / 第 7 天进行数据复盘,在 dev-log 记录:漏斗各阶段数 / AI 实际成本 / 是否有 IP 攻击告警 / 阈值是否需调整。

## 10. 文档与最终验证

- [x] 10.1 更新 `docs/dev/dev-log.md` 记录本轮设计决策、阈值依据、灰度结果、剩余风险;未合并 main 前不更新根 CHANGELOG.md。
- [x] 10.2 更新 `docs/meta/interview-project-deep-dive.md` 补"匿名试用 + 配额隔离 + 防绕过"叙事章节,与现有"模型成本治理 / 失败冷却阶梯"形成完整工程护栏故事。
- [x] 10.3 运行最小相关测试:中间件匿名身份、配额四层防御、SSR 引导态、L1/L2/L3 引导组件、Sentry tag、daily 聚合 SQL。
- [x] 10.4 运行 `npm run text:check-mojibake` 验证中文编码;运行 `openspec validate enable-anonymous-trial-mode --strict` 验证 change 结构。
- [ ] 10.5 人工冒烟验证灰度入口:未登录访问分享链接 → Today / Scene 可读 → AI 解释 3 次后被拦 → 触发 L3 弹窗 → 点击注册转化路径正常 → Review 页显示引导态而非裸错。
- [x] 10.6 对照 proposal/design/spec delta 做实现 Review,确认未改变已登录用户主链路语义、推荐策略、Scene 完成判定、Chunks 保存语义、Review 调度算法。

## 11. 稳定性收口记录

- [x] 11.1 记录本轮已收口:匿名身份四层防御 / 配额隔离 / 紧急关闭 / SSR 引导态 / 三层注册引导 / 漏斗埋点 / 灰度入口。
- [x] 11.2 记录明确不收项:已登录用户主链路语义、推荐策略、Scene 完成判定、Chunks 保存语义、Review 调度算法、匿名→注册数据迁移、主入口匿名开放、AI 场景生成匿名配额。
- [x] 11.3 若实现中发现不收项存在真实缺陷,记录到 `docs/dev/dev-log.md` 并另起 Spec-Driven change,不在本轮扩范围修复。
- [x] 11.4 灰度数据若显示匿名 AI 成本失控或被批量脚本攻击,立即关闭 env gate 并在 dev-log 复盘,V2 变更基于复盘决策方向。
