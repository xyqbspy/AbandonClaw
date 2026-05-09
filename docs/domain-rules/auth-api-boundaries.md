# Auth API 边界规则

## 1. 目标

这份文档用于定义项目里认证入口、用户态数据访问和后台高权限入口的长期边界，避免后续维护时把接口治理规则散落在 OpenSpec、开发日志或局部实现里。

## 2. 基本原则

- 高成本接口必须有显式访问边界，不能默认放行
- 用户态私有数据优先走用户上下文和数据库最小权限边界
- 后台高权限入口只能保留在显式白名单路径，不能回流到普通用户态 service
- 安全边界规则要有稳定归宿，不能只留在一次性的审计记录里

## 3. 当前规则定义

### 3.1 登录跳转必须限制在站内安全路径

- 登录页、注册页和认证中间件只接受站内安全路径作为跳转目标
- 缺失、非法、跨站或协议相对的 `redirect` 必须回退到默认站内落点
- 登录页和中间件必须使用一致的安全判断规则

### 3.2 高成本接口必须按敏感级别设边界

- 触发外部模型调用、批量重生成、重解析或其他高成本处理的接口，默认必须要求已登录
- 具备批量维护、后台运维或跨用户影响的高成本接口，必须进一步限制为管理员能力
- 受保护写接口在进入实际业务处理前，应校验请求来源是否符合允许的同源策略

### 3.3 用户态私有数据必须优先走用户上下文

- 用户态接口读取或写入学习、复习、短语、practice run、variant run 等私有数据时，应优先通过 `createSupabaseServerClient` 或等效用户上下文访问
- 不得默认通过 `service role` 读取后再依赖手工过滤兜底
- 对已切到用户上下文的关键用户态表，数据库侧必须有可说明、可审计的最小 RLS / SQL 配套

### 3.4 高权限后台入口必须显式白名单化

当前允许继续保留高权限访问的场景，必须集中在显式后台 repo 或后台任务路径中，例如：

- 共享 `phrases` 表的创建、查重和更新
- AI enrich 对 `phrases` / `user_phrases` 的后台补全
- 种子场景同步、导入清理、TTS 预热和其他跨用户后台任务

这些入口：

- 必须明确记录用途、边界和回滚策略
- 不得重新扩散回普通用户态 service helper

### 3.5 登录后热路径必须避免重复认证查询

- 登录成功后的用户资料热路径应复用同一请求内已经拿到的用户身份结果
- 不得在同一请求里无必要地重复执行 session、user 或 profile 认证查询
- 若热路径需要补充资料读取，应基于已有身份结果继续向下游查询，而不是重新回源到认证层

### 3.6 公网注册必须走服务端受控入口

- 注册页不得直接调用 Supabase Browser Client 创建账号；必须提交到服务端注册 API。
- `REGISTRATION_MODE` 缺失或非法时保守视为 `closed`。
- `invite_only` 模式必须校验数据库邀请码；邀请码只存 hash，不落库明文。
- 邀请码必须具备 `max_uses`、`used_count`、可选 `expires_at` 和启停状态。
- 注册尝试必须记录到 `registration_invite_attempts`，用于追踪成功、失败、拒绝和需要补偿的情况。

### 3.7 邮箱验证是进入主应用的硬边界

- Supabase 发验证邮件不等于主应用已完成边界收口。
- 邮箱未验证用户只能停留在认证相关页面或 `/verify-email`。
- 邮箱未验证用户不得进入 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson` 或 `/admin`。
- 邮箱未验证用户调用受保护 API 时应返回受控 403，不得触发模型、TTS 或学习数据写入。

## 4. 消费边界

- `openspec/specs/auth-api-boundaries/spec.md`
  - 维护稳定、可验收的正式规范
- `openspec/specs/api-operational-guardrails/spec.md`
  - 承接外部模型调用失败保护与接口运行护栏
- `docs/dev/server-data-boundary-audit.md`
  - 记录当前阶段已核对的 RLS / SQL 映射、白名单入口和审计结论
- 具体数据表、SQL 文件和实现锚点
  - 继续以 `supabase/sql` 与服务端实现为准

## 5. 维护约束

- 不得把一次性的 dev 审计文档当作长期规则源
- 不得在未盘点白名单入口前扩大 `service role` 使用范围
- 不得只补服务层过滤，而忽略数据库最小权限边界
- 若安全边界规则发生变化，必须同步更新 stable spec 与对应规则文档

## 6. 改动时一起检查

- `openspec/specs/auth-api-boundaries/spec.md`
- `docs/dev/server-data-boundary-audit.md`
- `docs/dev/backend-release-readiness-checklist.md`
- `GET /api/me`、登录后 profile 热路径与相关认证 helper
- 相关 `supabase/sql` 与服务端仓储入口

## 7. 账号访问状态

公网小范围开放时，账号限制不应只依赖临时关闭入口。`profiles.access_status` 是当前最小降级字段：

- `active`：正常访问、生成和写入。
- `disabled`：不能进入主应用，也不能调用受保护 API。
- `generation_limited`：可以查看和写入普通学习数据，但不能调用 AI / TTS / generate 类高成本入口，且不得预占 usage。
- `readonly`：可以查看数据，但不能写学习进度、保存表达、提交练习/复习写入。

入口约束：

- `requireCurrentProfile()` / `requireVerifiedCurrentProfile()` 负责阻止 `disabled`。
- 高成本入口必须在 quota 预占前调用 `assertProfileCanGenerate(profile)`。
- 学习写入、表达保存/删除、表达 enrich 写入和练习写入必须调用 `assertProfileCanWrite(profile)`。
- middleware 当前不直接读取 profile；因此 `disabled` 的兜底边界在服务端 profile helper 和主应用服务端入口。
