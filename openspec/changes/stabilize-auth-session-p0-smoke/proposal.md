## Why

当前第一版学习主闭环已基本打通，但人工冒烟暴露了发布前 P0 阻塞：登录成功后跳转不稳定、默认落点偏离 Today、首次进入用户态页面和 Review submit 会裸露 `failed fetch`，且缺少可重复使用的测试账号与自动化 smoke 流程。

本变更优先收口入口稳定性、可读错误、session 跳转和测试账号体系，让普通用户能一次登录进入 Today，让维护者能用受控测试账号通过命令行验证 P0 主闭环。

## What Changes

- 统一登录成功后的安全 redirect 规则：合法站内 `redirectTo` 优先，否则默认进入 `/today`。
- 修复登录成功只 toast、不稳定跳转或需要多次点击的问题；登录提交期间按钮进入 loading/disabled，避免重复请求。
- 标准化注册、发验证码、登录、受保护 API 和 Review submit 的前端错误展示，避免向用户裸露 Supabase 英文错误、`failed fetch` 或 `Too many requests`。
- 收口 Today / Scenes 首屏请求和 Review submit 的 API 错误处理，失败时展示可读状态并保留可重试入口。
- 新增受 env gate 保护的测试账号 seed 能力，通过 Supabase service role 幂等创建普通、受限和 admin 测试账号，并复用现有 profile / role / admin 权限模型。
- 新增受 env gate 与测试账号白名单保护的测试用户学习数据 reset 能力，不删除 auth user，仅清空该测试账号的学习闭环数据，使其回到新用户状态。
- 新增 API-level P0 smoke 命令，使用测试账号自动跑登录、Today starter recommendation、daily-greeting scene、保存 chunk、Chunks 查询、Review due、Review submit、完成 daily-greeting、Today 推荐推进到 self-introduction。
- 补充最小测试与回归，覆盖登录跳转/loading、auth 错误映射、Review submit 失败/loading、seed 幂等和 reset 保护。

## Capabilities

### New Capabilities

- `p0-smoke-test-accounts`: 定义测试账号 seed/reset 与 P0 API-level smoke 的稳定行为、安全保护和验收边界。

### Modified Capabilities

- `auth-api-boundaries`: 补充登录成功默认落点、安全 redirect、session settle 后刷新、认证入口可读错误与测试账号权限复用约束。
- `api-operational-guardrails`: 补充客户端/API 错误收敛、`requestId` 暴露方式、network error/401/403/429/500 的可读处理要求。
- `learning-loop-overview`: 补充 P0 主闭环 smoke 对 Today -> scene -> chunks -> review -> Today 推荐推进的验证要求，不改变推荐策略、Scene 主流程、Chunks 保存链路或 Review 调度算法。

## Impact

- 页面与组件：`src/app/(auth)/login`、`src/app/(auth)/signup`、Today / Scenes / Review 页面及相关 client 组件。
- API：`/api/auth/signup`、验证码发送入口、登录调用链、`/api/review/due`、`/api/review/submit`、`/api/phrases/mine`、scene/learning 相关用户态入口。
- 服务端与工具：Supabase server/browser client、auth/session helper、API error helper、requestId helper、测试账号 seed/reset 脚本、P0 smoke 脚本。
- 数据：复用现有 `profiles`、权限/admin 模型和学习闭环用户态表；reset 只作用于测试账号白名单内用户的学习数据。
- 测试与文档：新增或更新最小单元/交互/脚本测试、自动化 smoke 命令说明、开发日志与发布前人工冒烟 checklist。

## Stability Closure

### 本轮暴露的不稳定点

- 登录成功、session 写入、路由跳转和首屏用户态请求之间缺少单一清晰契约。
- 前端错误展示散落，Supabase/fetch 原始错误会直接暴露给用户。
- Review submit 写入失败缺少统一可读反馈、requestId 定位和防重复提交。
- 发布前缺少幂等测试账号、测试账号新用户重置和可由 Codex/本地脚本执行的 P0 smoke。

### 本轮收口项

- Auth 登录与注册入口的可读错误、loading、防重复提交、安全 redirect 和默认 `/today` 落点。
- Today / Scenes 首屏与 Review submit 的 API 失败展示、retry 能力和 requestId 定位。
- 测试账号 seed/reset 的 env gate、白名单保护、权限复用和幂等行为。
- API-level P0 主闭环 smoke 的命令、环境变量和最小验证步骤。

### 明确不收项

- 不改变 Today 推荐策略，只验证新用户推荐序列的既有结果。
- 不改变 Scene 学习主流程、内置场景内容结构或 Scene 完成判定。
- 不改变 Chunks 保存链路、表达聚类或缓存策略。
- 不改变 Review 调度算法、复习来源语义或递进式练习规则。
- 不新增 AI 能力，不放开 `invite_only`，不移除限流。

### 延后原因与风险记录

上述不收项均属于学习闭环正式业务语义，当前 P0 目标是入口可用性和发布前可验证性。若实现过程中发现推荐、Scene 完成、Chunks 保存或 Review 调度本身存在缺陷，应记录到 `docs/dev/dev-log.md` 并另起 Spec-Driven change，不在本轮扩范围修复。
