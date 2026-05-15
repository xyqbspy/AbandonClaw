## Context

当前登录、注册、验证码、首屏用户态请求和 Review submit 分散在页面、API route、Supabase client 与领域服务之间。人工冒烟看到“登录成功但停留登录页”“首次进 Scenes failed fetch”“Review submit failed fetch”，说明 session 写入、路由刷新、fetch 错误收敛和用户可读反馈之间缺少统一契约。

本轮同时引入测试账号 seed/reset 和 API-level smoke，是为了让发布前 P0 主闭环能由命令行稳定验证，而不是依赖人工注册、验证码和多次浏览器点击。

## Goals / Non-Goals

**Goals:**

- 登录成功后一次点击稳定进入合法站内目标，默认目标为 `/today`。
- 注册、发验证码、登录、页面首屏请求和 Review submit 均展示中文可读错误，不裸露 Supabase 英文错误、`failed fetch` 或 `Too many requests`。
- Review submit 与 Auth 表单具备 loading/disabled 防重复提交，失败时保留当前状态并允许重试。
- 测试账号通过 service role 幂等创建，email confirmed，不走验证码，不提交真实密码。
- reset 只允许作用于测试账号白名单，清空学习闭环用户态数据但不删除 auth user。
- `pnpm run smoke:p0-auth-loop` 能以普通测试账号跑 API-level 主闭环。

**Non-Goals:**

- 不改变 Today 推荐策略或 starter scene 顺序。
- 不改变 Scene 学习主流程、Scene 完成判定或 builtin content 结构。
- 不改变 Chunks 保存语义、聚类语义或缓存策略。
- 不改变 Review 调度算法、来源语义或递进式训练规则。
- 不新增 AI 能力，不放开 `invite_only`，不移除既有限流。

## Decisions

### 1. 登录后采用单一安全落点解析

登录页读取 `redirectTo` 或既有 redirect 参数时，先经统一 helper 校验。合法站内路径可作为目标；缺失、外部 URL、协议相对 URL 或非法值一律回退 `/today`。

登录成功后只执行一次清晰的导航序列：等待 Supabase 登录调用返回成功，设置 loading 状态，`router.replace(target)`，必要时随后 `router.refresh()` 让 App Router 服务端组件读取最新 cookie。页面不得只 toast 成功而不改变路由状态。

替代方案：在多个调用点分别判断 redirect。放弃原因是容易再次出现 login/middleware/signup 跳转规则漂移。

### 2. 前端错误映射使用共享轻量 helper

新增或收口一个前端错误映射 helper，将 API JSON、Supabase error、fetch/network exception 映射到固定中文提示：

- 网络异常 / `failed fetch`：`网络请求失败，请刷新后重试`
- 邀请码无效或过期：`邀请码无效或已过期`
- 请求过于频繁 / 429：`操作太频繁，请稍后再试`
- 验证码发送失败：`验证码发送失败，请稍后再试`
- 邮箱或密码错误：`邮箱或密码不正确`
- 未登录 / session 失效 / 401：`登录状态已失效，请重新登录`
- 权限不足 / 403：`当前账号没有权限执行此操作`
- 其他服务端错误 / 500：`服务暂时不可用，请稍后再试`

如果响应包含 `requestId`，用户提示默认不展示，前端 console 输出用于 PM2 / 服务端日志定位。

替代方案：只在每个页面 catch 中写中文文案。放弃原因是会继续产生重复语义和漏网的裸错误。

### 3. 用户态 fetch 失败不让页面崩到裸错误

Today / Scenes 首屏和 Review 相关 client fetch 需要收敛 non-2xx 与 network error。页面级组件可展示现有空态/错误态/重试入口，但不得把原始 Error message 直接作为用户文案。

对于登录后首次进入页面的 session settle 问题，优先用登录成功后的 `router.refresh()` 和清晰跳转解决；页面 API 仍保留 401/403/network 的可读兜底，避免刷新才恢复的体验。

### 4. Review submit 保留当前题目状态并幂等防重复点击

Review submit 按钮在请求进行中 disabled。提交失败不推进队列、不清空当前题目、不丢弃用户已输入状态，并展示可读错误与重试入口。若 API 返回 `requestId`，前端 console 输出。

本轮不改变 submit payload、调度算法或复习结果推进规则；只修复请求状态管理、错误映射和重复点击保护。

### 5. 测试账号 seed/reset 使用脚本而不是公共入口

新增脚本命令，例如：

- `pnpm run seed:test-users`
- `pnpm run reset:test-user`
- 或 `pnpm run seed:test-users -- --reset`

seed 必须满足：

- `ALLOW_TEST_USER_SEED=true`
- `SUPABASE_SERVICE_ROLE_KEY` 存在
- `TEST_USER_PASSWORD` 存在
- 邮箱从 `TEST_NORMAL_EMAIL`、`TEST_RESTRICTED_EMAIL`、`TEST_ADMIN_EMAIL` 读取
- 创建或更新 auth user，设置 email confirmed
- 更新既有 profile / role / metadata，不新造角色系统
- 输出创建/更新结果，不打印明文密码

reset 必须满足：

- `ALLOW_TEST_USER_RESET=true`
- 目标 email 必须命中测试账号白名单或允许的测试域名
- 不删除 auth user
- 只清空该测试账号学习闭环用户态表，例如 `user_scene_progress`、`user_scene_sessions`、`user_phrases`、`phrase_review_logs`、`user_daily_learning_stats` 以及实现中发现的同类用户态学习表

替代方案：通过 admin 页面手动创建和清理。放弃原因是不能支撑 Codex/本地命令行自动 smoke。

### 6. P0 smoke 优先 API-level

新增 `pnpm run smoke:p0-auth-loop`。脚本使用普通测试账号登录并保持 cookie/session，沿正式业务 API 验证：

1. 登录后默认落到 `/today`。
2. Today dashboard 推荐 starter 为 `daily-greeting`。
3. `daily-greeting` scene 可访问且有 builtin chunks。
4. 保存一个 scene chunk。
5. `/api/phrases/mine` 能查到保存表达。
6. `/api/review/due` 能查到 due 项。
7. `/api/review/submit` 成功写入复习日志并推进 user phrase 状态。
8. 完成 `daily-greeting`。
9. Today 推荐推进到 `self-introduction`。

脚本不绕过正式业务 API，只有 seed/reset 使用 service role。若某一步需要目前不存在的稳定 API，优先复用已有 API；确需新增最小只读/动作入口时，必须归入正式业务边界并补测试。

## Risks / Trade-offs

- [Risk] Supabase cookie 写入在登录回调后仍有短暂不一致 → 登录后统一 `router.replace(target)` + 必要 `router.refresh()`，页面 API 保留 401 可读兜底。
- [Risk] 错误映射过度吞掉排障信息 → 用户看中文短文案，console 输出 `requestId`，服务端继续保留结构化日志。
- [Risk] reset 脚本误删真实用户数据 → 双 env gate、测试邮箱白名单/测试域名、先解析 auth user，再按 user id 精确删除，拒绝非测试邮箱。
- [Risk] service role 脚本扩大权限面 → 脚本仅放在本地/运维命令中，必须显式 env 开启，不接入公共 API。
- [Risk] API-level smoke 与真实浏览器点击仍有差距 → 本轮先覆盖稳定快速的核心数据闭环，人工浏览器冒烟继续覆盖真实点击、按钮 disabled 和 admin 页面访问。

## Migration Plan

1. 增加 helper、脚本、测试与页面/API 最小改动。
2. 在本地或目标环境配置测试账号 env，执行 seed。
3. 对普通测试账号执行 reset。
4. 执行 API-level smoke 与最小相关测试。
5. 人工浏览器冒烟验证登录、Scenes、Review、admin/无权限入口。
6. 完成后同步 dev-log、相关文档和 stable spec，archive 前执行维护检查。

回滚方式：移除新增脚本命令与前端 helper 使用点，恢复旧登录跳转和错误展示；数据库用户数据不会因 seed/reset 外的应用代码迁移产生结构性变更。

## Open Questions

- 当前仓库是否已有稳定的 admin allowlist/role 字段可直接标记 admin 测试账号；实现时必须优先复用现有模型。
- reset 需要覆盖的“其他学习闭环相关用户态表”以实际 schema 为准；实现时通过 `supabase/sql` 与服务层读写点确认，不凭表名猜测。
- P0 smoke 中“完成 daily-greeting”应调用现有 Scene 完成 API 或现有学习状态同步入口；若当前无稳定 API，需要在不改变完成语义的前提下补最小正式入口。

## Stability Closure

### 不稳定点

- Auth/session/redirect 规则分散，导致登录成功和首屏请求不同步。
- API 错误对用户、console 和服务端日志的呈现层级不清。
- 发布前验证依赖人工路径，缺少可复位测试数据。

### 本轮收口

- 统一登录落点、错误映射、Review submit 请求状态与测试账号 seed/reset/smoke。

### 延后项

- Today 推荐、Scene 完成、Chunks 保存和 Review 调度语义缺陷若在实现中发现，仅记录风险并另起变更。
