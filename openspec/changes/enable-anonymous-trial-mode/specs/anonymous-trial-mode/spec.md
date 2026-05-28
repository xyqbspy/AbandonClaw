## ADDED Requirements

### Requirement: 匿名身份必须由前端 UUID 与后端 IP 哈希双因子识别
系统 MUST 在未登录访客首次进入受治理路由时生成持久 `anon_id`(UUID v4),并通过 `X-Anonymous-Id` 头在后续所有受治理接口请求中透传;后端在未识别到登录 session 时 MUST 同时校验 `anon_id` 与基于 `IP_HASH(req.ip + DAILY_SALT)` 的 IP 维度判定,缺一不可信。

#### Scenario: 未登录访客首次访问匿名允许路由
- **WHEN** 未登录访客访问匿名允许路由且无 `X-Anonymous-Id` 头
- **THEN** 前端 MUST 生成 UUID v4 写入 `localStorage` 持久化
- **AND** 后续受治理接口请求 MUST 携带该 anon_id 头

#### Scenario: 后端识别匿名身份
- **WHEN** 后端中间件未识别到登录 session 且 `X-Anonymous-Id` 存在且格式合法
- **THEN** 系统 MUST 计算当日 `ip_hash` 并 upsert `anonymous_sessions` 记录
- **AND** 注入 `request.anonymous = { anonId, ipHash }` 上下文供下游使用

#### Scenario: 匿名身份头缺失
- **WHEN** 后端中间件未识别到登录 session 且 `X-Anonymous-Id` 缺失或格式非法
- **THEN** 系统 MUST 返回 400 + `code=ANON_ID_REQUIRED`
- **AND** 响应 MUST 包含 `requestId`
- **AND** MUST NOT 创建 anonymous_session 记录

#### Scenario: 同 IP 当日匿名 session 数超限
- **WHEN** 同一 ip_hash 当日已创建匿名 session 数达到配置上限
- **AND** 当前请求携带新的(未见过的) anon_id
- **THEN** 系统 MUST 返回 429 + `code=ANON_IP_RATE_LIMITED`
- **AND** MUST NOT 创建新 anonymous_session 记录

### Requirement: IP 哈希盐必须每日轮换以避免长期可追踪
系统 MUST 使用基于当日日期的盐计算 `ip_hash`,且盐 MUST 每日 00:00 自动轮换;系统 MUST NOT 持久化原始 IP 或可跨日关联的稳定 IP 标识。

#### Scenario: 当日 IP 哈希一致性
- **WHEN** 同一 IP 在同一日发起多次匿名请求
- **THEN** 系统 MUST 计算出相同的 ip_hash
- **AND** 用于"同日防绕过"的判定 MUST 正确命中

#### Scenario: 每日盐轮换后旧 ip_hash 失效
- **WHEN** 跨过 00:00 daily salt 轮换时刻
- **THEN** 同一 IP 计算出的 ip_hash MUST 与前一日不同
- **AND** 前一日的 ip_session_count 计数器 MUST NOT 影响今日判定
- **AND** 前一日的 ip_hash MUST NOT 能用于关联到当日同一自然人

### Requirement: 匿名配额必须与已登录用户配额完全隔离
系统 MUST 为匿名访问独立维护 Redis 配额命名空间,与已登录用户的 user 维度配额完全隔离;匿名配额耗尽 MUST NOT 影响已登录用户调用,反之亦然。

#### Scenario: 已登录用户调用不消耗匿名池
- **WHEN** 已登录用户调用 AI 表达解释接口
- **THEN** 系统 MUST 仅消耗 user 维度配额
- **AND** MUST NOT 写入 `anon:quota:*` 任何 Redis key

#### Scenario: 匿名访客调用不消耗 user 池
- **WHEN** 匿名访客调用 AI 表达解释接口
- **THEN** 系统 MUST 仅消耗 `anon:quota:*` 配额
- **AND** MUST NOT 写入任何 user 维度配额计数器

#### Scenario: 匿名池打满不影响已登录用户
- **WHEN** 全站匿名 AI 池当日配额已耗尽
- **AND** 已登录用户调用同一接口
- **THEN** 系统 MUST 允许已登录用户在 user 配额内继续调用
- **AND** 不得返回 `ANON_QUOTA_EXCEEDED_*` 错误

### Requirement: 匿名访问高成本接口必须经过四层防御
所有会触发 AI 生成、AI 解析、AI enrich、TTS 实时生成等高成本服务端计算的接口,在匿名分支 MUST 按"IP 滑窗 → IP 当日 session 数 → 全站匿名池 → 单匿名会话"四层顺序判定,任意一层失败 MUST 立即返回受控错误,不进入下一层判定,也不触发上游高成本调用。

#### Scenario: 匿名访客超 IP 滑窗 QPS
- **WHEN** 同一 ip_hash 在 60 秒窗口内匿名请求数超过配置阈值
- **THEN** 系统 MUST 返回 429 + `code=ANON_IP_RATE_LIMITED`
- **AND** MUST NOT 进入后续 IP session 数 / 全站池 / 单会话判定

#### Scenario: 匿名访客超单会话每日配额
- **WHEN** 同一 anon_id 当日对某 capability 的调用数超过 `featureMatrix[capability].sessionDailyLimit`
- **THEN** 系统 MUST 返回 429 + `code=ANON_QUOTA_EXCEEDED_SESSION`
- **AND** 响应 MUST 包含 `X-Quota-Reset-At` 头指明次日 00:00 重置时间
- **AND** MUST NOT 触发上游模型调用或 TTS 生成

#### Scenario: 全站匿名池当日耗尽
- **WHEN** 任一 capability 的 `anon:quota:global:*:{YYYYMMDD}` 计数器达到 `featureMatrix[capability].globalDailyLimit`
- **AND** 任意匿名访客继续调用该 capability
- **THEN** 系统 MUST 返回 429 + `code=ANON_QUOTA_EXCEEDED_GLOBAL`
- **AND** MUST NOT 触发上游高成本调用

#### Scenario: 管理员紧急关闭高成本能力
- **WHEN** 管理员通过 `admin-high-cost-emergency-controls` 关闭某 capability
- **AND** 匿名访客请求该 capability 对应接口
- **THEN** 系统 MUST 在四层防御判定前优先拒绝,返回 503 + `code=HIGH_COST_CAPABILITY_DISABLED`
- **AND** MUST NOT 消耗任何匿名配额计数器

### Requirement: 匿名功能开关矩阵必须集中配置
系统 MUST 通过统一 `featureMatrix` 配置维护每个 capability 在匿名模式下的"是否允许 / 全站每日上限 / 单会话每日上限 / 告警阈值";功能边界 MUST NOT 散落在各路由 handler 内部判定。

#### Scenario: 匿名禁用 capability 被调用
- **WHEN** 匿名访客调用 `featureMatrix[capability].anonAllowed = false` 的接口(如 AI 场景生成 / 保存表达 / Review submit / 导入 / 导出)
- **THEN** 系统 MUST 在路由入口立即返回 403 + `code=ANON_FEATURE_DISABLED`
- **AND** 响应 MUST 包含 `requestId`
- **AND** MUST NOT 进入业务处理或配额判定

#### Scenario: 新增 capability 接入匿名分支
- **WHEN** 维护者为新的 capability 决定匿名访问策略
- **THEN** 维护者 MUST 在 `featureMatrix` 单点配置 `anonAllowed` 与阈值
- **AND** 不得在 route handler 内部自行实现匿名判定逻辑

### Requirement: 受限响应必须携带配额头供前端消费
所有匿名分支的受限接口响应(成功或受控错误) MUST 携带统一的配额头,使前端能消费这些头渲染剩余次数提示,无需额外接口调用。

#### Scenario: 匿名 AI 解释成功响应
- **WHEN** 匿名访客成功调用 AI 表达解释接口
- **THEN** 响应 MUST 携带 `X-Quota-Type` / `X-Quota-Daily-Limit` / `X-Quota-Daily-Remaining` / `X-Quota-Session-Limit` / `X-Quota-Session-Remaining` / `X-Quota-Reset-At` 完整 6 个头
- **AND** 前端 MUST 能基于这些头直接渲染"剩余 X/Y 次"提示

#### Scenario: 匿名配额受控错误响应
- **WHEN** 匿名访客触发 `ANON_QUOTA_EXCEEDED_SESSION` 或 `ANON_QUOTA_EXCEEDED_GLOBAL`
- **THEN** 响应 MUST 携带相同的 6 个配额头
- **AND** `X-Quota-Daily-Remaining` MUST 为 0(全站池打满时)或 `X-Quota-Session-Remaining` MUST 为 0(单会话用尽时)
- **AND** `X-Quota-Reset-At` MUST 指明次日 00:00 ISO 8601 时间

### Requirement: 匿名学习态必须存于浏览器会话存储且不入业务表
所有匿名期间产生的学习态(已浏览场景标记、已播放音频记录、AI 解释结果缓存、临时"学过"标记) MUST 仅存于 `sessionStorage`,关闭浏览器即清;系统 MUST NOT 在任何业务表(scenes / user_phrases / phrase_review_logs / user_scene_progress 等)写入与匿名身份关联的记录。

#### Scenario: 匿名访客在场景内标记学过
- **WHEN** 匿名访客在场景学习页点击"学过"
- **THEN** 系统 MUST 仅写入浏览器 `sessionStorage` 的命名空间 `abridge:anon:learning:*`
- **AND** MUST NOT 发起任何业务表写入请求
- **AND** MUST NOT 在 `localStorage` 写入学习态(避免和已注册用户态混淆)

#### Scenario: 匿名访客关闭浏览器后重新进入
- **WHEN** 匿名访客关闭浏览器后重新打开同一分享链接
- **THEN** `sessionStorage` 中的学习态 MUST 已清空
- **AND** `localStorage` 中的 anon_id MUST 仍保留(用于配额连续性)
- **AND** 用户 MUST 看到"从零开始"的初始体验

#### Scenario: 已注册用户清缓存后被误识别为匿名
- **WHEN** 已注册用户清空浏览器缓存导致 session 失效
- **THEN** 中间件 MUST 优先尝试恢复登录 session
- **AND** 仅在完全无 session 时才走匿名分支
- **AND** 已注册用户的 `localStorage` MUST NOT 写入 `abridge:anon_id`,避免命名空间污染

### Requirement: 匿名会话表必须最小化且定期清理
系统 MUST 仅在 `anonymous_sessions` 表存储匿名身份判定与防绕过所需的最小字段;表 MUST NOT 包含任何业务语义字段;系统 MUST 通过定时任务清理过期匿名会话。

#### Scenario: 匿名会话表 schema
- **WHEN** 实施 `anonymous_sessions` 表迁移
- **THEN** 表字段 MUST 仅包含 `id`、`anon_id`、`ip_hash`、`created_at`、`last_active_at`
- **AND** MUST NOT 包含 user_id、business 字段或学习态字段

#### Scenario: 过期匿名会话被清理
- **WHEN** 每日清理 cron 执行
- **THEN** 系统 MUST 删除 `last_active_at < now() - 7 days` 的所有 `anonymous_sessions` 记录
- **AND** 对应 Redis 配额计数器因 25h TTL 自然过期,不需要额外清理

### Requirement: 受保护页面在匿名分支必须返回引导态而非裸 401
所有受保护页面(`/review`、`/progress`、`/chunks` 我的表达库等需要用户态数据的页面)在 SSR 阶段识别到匿名访客时 MUST 返回统一的引导态组件,MUST NOT 抛出 401/403 错误或裸露错误堆栈,MUST NOT 查询任何用户态业务表。

#### Scenario: 匿名访客访问 Review 页
- **WHEN** 匿名访客直接访问 `/review`
- **THEN** SSR MUST 返回 `<AnonymousGuidanceState page="review" />`
- **AND** MUST 渲染"为什么用不了 + 注册解锁什么 + 现在能做什么"三段式引导
- **AND** MUST NOT 查询 `user_phrases` / `phrase_review_logs` / `user_daily_learning_stats` 等用户态表
- **AND** HTTP 响应状态码 MUST 为 200(引导态是有效响应,不是错误)

#### Scenario: 匿名访客访问 Today 页
- **WHEN** 匿名访客访问 Today 页(分享链接灰度允许时)
- **THEN** SSR MUST 渲染"试用推荐场景"列表(3-5 个预生成场景)
- **AND** MUST NOT 查询任何用户态推荐表
- **AND** 列表 MUST 来自公共内容表

### Requirement: 匿名 SSR 响应必须禁用 CDN 共享缓存
所有匿名分支的 SSR 响应 MUST 携带 `Cache-Control: private, no-store` 头,确保不被 CDN / Vercel Edge / 中间反向代理缓存为共享内容,避免已注册用户访问时命中匿名引导态缓存。

#### Scenario: 匿名 SSR 响应缓存控制
- **WHEN** 中间件检测到响应来自匿名分支
- **THEN** 系统 MUST 在响应中注入 `Cache-Control: private, no-store`
- **AND** MUST NOT 出现 `public` 或长 max-age 缓存指令

#### Scenario: 已注册用户访问相同路由
- **WHEN** 已注册用户在匿名访客访问后立即访问相同路由
- **THEN** 系统 MUST 渲染该用户的实际数据
- **AND** MUST NOT 返回匿名访客的引导态(无 CDN 缓存命中)

### Requirement: 搜索引擎爬虫必须走公开只读匿名分支
中间件识别 user-agent 为已知搜索引擎爬虫(Googlebot / Bingbot / Baiduspider 等)时 MUST 走"公开只读匿名分支",仅渲染公共内容,不创建 `anonymous_session` 记录也不计任何配额。

#### Scenario: Googlebot 抓取场景页
- **WHEN** Googlebot 访问公共可读路由(如 `/scenes/{slug}`)
- **THEN** 系统 MUST 渲染公共场景内容
- **AND** MUST NOT 创建 anonymous_session
- **AND** MUST NOT 增加任何 `anon:quota:*` 计数器
- **AND** MUST NOT 要求 `X-Anonymous-Id` 头

#### Scenario: 爬虫访问受保护路由
- **WHEN** 已知爬虫 user-agent 访问 `/review` 等受保护路由
- **THEN** 系统 MUST 返回 401 或重定向到登录页
- **AND** MUST NOT 渲染引导态(避免引导态被搜索引擎收录)

### Requirement: 注册引导必须按三层强度按用户感知阶段触发
系统 MUST 提供 L1(常驻)、L2(软引导)、L3(阻断) 三层注册引导;触发时机 MUST 按"用户感知价值进度"分级,首次访问 MUST NOT 立即弹注册,L2 仅在用户完成第一个场景后触发,L3 仅在触达功能边界时触发。

#### Scenario: 匿名访客首次进入
- **WHEN** 匿名访客首次进入分享链接
- **THEN** 系统 MUST 仅展示 L1 顶栏 banner
- **AND** MUST NOT 弹出 L3 阻断弹窗
- **AND** MUST NOT 触发 L2 inline 卡片

#### Scenario: 匿名访客完成首个场景学习
- **WHEN** 匿名访客在场景内完成全部学习步骤
- **THEN** 系统 MUST 触发 L2 inline 卡片,内容关联具体场景与表达数
- **AND** 用户 MUST 可关闭该卡片,本会话不再展示同一卡片

#### Scenario: 匿名访客触发禁用功能
- **WHEN** 匿名访客点击"保存表达"、"开始复习"、"导出"等禁用功能
- **THEN** 系统 MUST 弹出 L3 阻断弹窗
- **AND** 文案 MUST 强调"注册解锁什么",不写"试用结束"
- **AND** 弹窗 MUST 提供"注册"与"稍后"两个按钮

#### Scenario: 匿名访客 AI 配额用尽
- **WHEN** 匿名访客的 AI 表达解释配额本会话已用尽(剩 0/3)
- **AND** 用户尝试再次触发 AI 解释
- **THEN** 系统 MUST 弹出 L3 配额用尽弹窗,显示重置时间
- **AND** 顶栏 L1 banner MUST 同步显示"已用尽 · 注册解锁无限制"

### Requirement: 匿名漏斗事件必须按最小集埋点以支持转化分析
系统 MUST 至少埋点 8 个核心漏斗事件,使匿名→注册转化漏斗的每一阶段都可被聚合分析;事件 MUST NOT 包含 IP 明文、anon_id 明文或其他可识别自然人的字段。

#### Scenario: 漏斗事件最小集
- **WHEN** 实施匿名漏斗埋点
- **THEN** 系统 MUST 至少埋点以下 8 个事件:`anon_session_created` / `anon_first_scene_viewed` / `anon_first_scene_completed` / `anon_ai_explain_used` / `anon_quota_blocked` / `anon_register_prompt_shown` / `anon_register_prompt_clicked` / `anon_registered`
- **AND** `anon_quota_blocked` payload MUST 包含 `quota_type` 与触发的 `blocked_layer`(ip_rate / ip_session / global / session)
- **AND** `anon_register_prompt_shown` 与 `anon_register_prompt_clicked` payload MUST 包含 `prompt_level`(L1 / L2 / L3)

#### Scenario: 匿名→注册转化关联
- **WHEN** 匿名访客完成注册流程
- **THEN** 系统 MUST 在 `anon_registered` 事件 payload 中记录 `from_anon_id`
- **AND** 该 anon_id MUST 与同一访客之前的漏斗事件可被关联用于转化路径分析

#### Scenario: 隐私敏感字段排除
- **WHEN** 实施任何漏斗事件埋点
- **THEN** event payload MUST NOT 包含 IP 明文、user-agent 全字符串或其他可识别自然人的字段
- **AND** 仅可存 `ip_hash + 当日`,且 ip_hash 因 daily salt 轮换天然不可跨日关联

### Requirement: 每日匿名成本看板必须可量化转化 ROI
系统 MUST 每日聚合一次匿名漏斗数据生成 `daily_anon_cost_report`,使维护者能基于"单转化匿名成本"决策是否调整配额阈值、是否放开 V2 能力。

#### Scenario: 每日成本报告聚合
- **WHEN** 每日聚合 cron 执行
- **THEN** 系统 MUST 输出 `daily_anon_cost_report` 记录,字段至少包含 `date` / `total_sessions` / `ai_explain_calls` / `tts_play_count` / `estimated_cost_usd` / `conversion_rate` / `cost_per_conversion`
- **AND** `conversion_rate = anon_registered / anon_session_created`
- **AND** `cost_per_conversion = estimated_cost_usd / anon_registered`(注册数为 0 时该字段为 null)

#### Scenario: 维护者基于报告决策
- **WHEN** 维护者查询连续 7 天 `daily_anon_cost_report`
- **THEN** 维护者 MUST 能基于 `cost_per_conversion` 与该产品已知"注册用户首月 LTV"对比
- **AND** 看板数据 MUST 与告警系统配合(如 `cost_per_conversion > LTV` 触发提示)

### Requirement: 匿名 env gate 必须默认关闭且仅在分享链接灰度
系统 MUST 通过 `ALLOW_ANONYMOUS_TRIAL` env 变量统一控制匿名分支启用,默认关闭;首轮灰度 MUST 仅在指定"分享链接"路由生效,Today / 首页 / 注册页等主入口 MUST NOT 受灰度影响。

#### Scenario: env gate 关闭时的行为
- **WHEN** `ALLOW_ANONYMOUS_TRIAL` 未设置或为 `false`
- **THEN** 中间件 MUST NOT 进入匿名分支判定
- **AND** 所有受保护路由对未登录访客 MUST 表现为"需要登录"(行为与本变更前一致)
- **AND** MUST NOT 创建任何 anonymous_session 或消耗任何 anon 配额

#### Scenario: env gate 开启后仅分享链接生效
- **WHEN** `ALLOW_ANONYMOUS_TRIAL=true` 且匿名访客访问 Today / 首页
- **THEN** 系统 MUST 表现为"需要登录",不进入匿名分支
- **AND** 仅约定的分享链接路由(灰度名单) MUST 允许匿名访问

#### Scenario: 灰度阶段紧急回滚
- **WHEN** 灰度期间发现 AI 成本失控或批量脚本攻击
- **THEN** 维护者 MUST 能通过关闭 `ALLOW_ANONYMOUS_TRIAL` 实现即时全量回退
- **AND** `anonymous_sessions` 表数据 MUST 保留以便复盘
- **AND** 已登录用户主链路 MUST NOT 受关闭影响
