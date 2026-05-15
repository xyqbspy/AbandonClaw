## 1. 链路盘点与实现边界

- [x] 1.1 盘点登录页表单、Supabase/auth API 调用、session/cookie 写入、router 跳转和 middleware redirect 参数来源。
- [x] 1.2 盘点注册、发验证码、登录涉及的 API、错误响应格式、限流响应和 requestId 返回路径。
- [x] 1.3 盘点登录后 Today / Scenes 首屏用户态请求、fetch wrapper、401/403/429/500/network error 处理路径。
- [x] 1.4 盘点 Review 页面“我已经懂了”提交链路、payload、auth session、idempotency 或防重复提交状态。
- [x] 1.5 盘点现有 profiles / roles / admin allowlist / access_status 权限模型，确认测试账号 seed 复用路径。
- [x] 1.6 盘点学习闭环用户态表，确定 reset 最小表范围并记录不重置项与原因。

## 2. Auth 登录跳转与错误提示收口

- [x] 2.1 新增或收口安全 redirect helper，统一处理合法站内 redirect 与默认 `/today`。
- [x] 2.2 修复登录成功后只 toast 或跳转不稳定的问题，确保一次点击登录后进入目标页并按需 `router.refresh()`。
- [x] 2.3 为登录按钮增加 loading/disabled 防重复提交，并避免重复发起登录请求。
- [x] 2.4 新增或收口前端 auth 错误映射 helper，覆盖 network error、invalid invite、429、验证码发送失败、invalid credentials、401/session 失效。
- [x] 2.5 接入注册、发验证码、登录页面错误映射；如果响应包含 requestId，在 console 输出 requestId。
- [x] 2.6 补登录默认 `/today`、合法/非法 redirect、登录 loading 防重复提交和 auth 错误映射测试。

## 3. 首屏用户态请求与 Review submit 收口

- [x] 3.1 收口 Today / Scenes 首屏用户态请求错误处理，确保 401/403/429/500/network error 展示可读状态或重试入口。
- [x] 3.2 修复首次登录后进入 Today / Scenes 因 session 未刷新导致的 failed fetch 或裸错误。
- [x] 3.3 收口 Review submit 请求状态：提交中 disabled/loading，失败不推进、不清空当前题目，保留重试能力。
- [x] 3.4 收口 Review submit 错误映射与 requestId console 输出，避免裸露 failed fetch。
- [x] 3.5 补 Review submit 失败可读错误、loading 防重复点击和状态保留测试。

## 4. 测试账号 seed/reset

- [x] 4.1 新增 `pnpm run seed:test-users` 或等效命令，通过 service role 幂等创建普通、受限和 admin 测试账号。
- [x] 4.2 seed 脚本增加 `ALLOW_TEST_USER_SEED=true`、`SUPABASE_SERVICE_ROLE_KEY`、`TEST_USER_PASSWORD` 和测试 email env 校验。
- [x] 4.3 seed 脚本设置测试账号 email confirmed，并复用现有 profile / role / admin / access_status 模型，不新造角色系统。
- [x] 4.4 新增 `pnpm run reset:test-user` 或 `seed:test-users -- --reset`，仅清空白名单测试账号学习闭环数据，不删除 auth user。
- [x] 4.5 reset 脚本增加 `ALLOW_TEST_USER_RESET=true`、测试账号白名单或测试域名保护，拒绝非测试邮箱。
- [x] 4.6 补 seed 幂等、缺失 env 拒绝、reset 白名单保护和 reset 表范围测试；无法单测的 service role 调用用可注入依赖覆盖。

## 5. P0 API-level smoke

- [x] 5.1 新增 `pnpm run smoke:p0-auth-loop` 或等效命令，支持 base URL、TEST_NORMAL_EMAIL、TEST_USER_PASSWORD 等 env。
- [x] 5.2 smoke 使用正式登录 session 和正式业务 API 验证默认进入 `/today`，不得用 service role 绕过业务 API。
- [x] 5.3 smoke 验证 reset 后 Today starter recommendation 为 `daily-greeting`。
- [x] 5.4 smoke 验证 `daily-greeting` scene 可访问且包含 builtin chunks，并保存一个 scene chunk。
- [x] 5.5 smoke 验证保存表达进入 `/api/phrases/mine`、进入 `/api/review/due`，并可通过 `/api/review/submit` 提交。
- [x] 5.6 smoke 验证 review log 写入、user phrase 状态推进、完成 `daily-greeting` 后 Today 推荐 `self-introduction`。
- [x] 5.7 smoke 失败输出阶段、请求目标、状态码/network 摘要和 requestId，不静默跳过核心步骤。

## 6. 文档、验证与收尾

- [x] 6.1 更新测试账号 env 配置说明、seed/reset/smoke 命令说明和人工冒烟 checklist。
- [x] 6.2 更新 `docs/dev/dev-log.md` 记录本轮验证结果、失败根因和剩余风险；未进入 main 前不更新正式 `CHANGELOG.md`。
- [x] 6.3 运行最小相关测试：登录/auth 错误映射、Review submit、seed/reset、smoke 脚本逻辑测试。
- [x] 6.4 在具备目标环境 env 时执行 seed、reset 和 `pnpm run smoke:p0-auth-loop`；如缺 env，明确标记 blocked 与缺失项。
- [ ] 6.5 人工冒烟验证普通测试账号一次登录进入 Today、Scenes 无 failed fetch、Review submit 推进、注册错误中文提示、admin 与无权限账号访问结果。
- [x] 6.6 对照 proposal/design/spec delta 做实现 Review，确认未改变 Today 推荐策略、Scene 主流程、Chunks 保存链路和 Review 调度算法。

## 7. 稳定性收口记录

- [x] 7.1 记录本轮已收口：登录/session/redirect、错误映射、Review submit 防重复与可读错误、测试账号 seed/reset、P0 smoke。
- [x] 7.2 记录明确不收项：Today 推荐策略、Scene 完成语义、Chunks 保存语义、Review 调度算法、AI 能力、invite_only 与限流策略。
- [x] 7.3 若实现中发现不收项存在真实缺陷，记录到 `docs/dev/dev-log.md` 并另起 Spec-Driven change，不在本轮扩范围修复。
