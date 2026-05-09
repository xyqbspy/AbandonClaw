## 1. 数据与配置

- [x] 1.1 新增注册模式配置读取，支持 `closed`、`invite_only`、`open`，并为非法值提供保守默认值。
- [x] 1.2 新增邀请码 SQL，包含邀请码 hash、`max_uses`、`used_count`、可选 `expires_at`、启停状态和更新时间。
- [x] 1.3 新增邀请码使用尝试 SQL，记录 email、状态、auth user id、失败原因和补偿状态。
- [x] 1.4 更新 `.env.example` 或相关环境说明，记录 `REGISTRATION_MODE` 与公网 Redis 限流必填项。

## 2. 注册与邮箱验证

- [x] 2.1 新增服务端注册入口，集中处理注册模式、邀请码校验、Supabase Auth 创建和 attempt 记录。
- [x] 2.2 改造 `signup` 页面，改为调用服务端注册入口，并按注册模式展示受控文案。
- [x] 2.3 在主应用页面入口阻止未验证邮箱用户进入学习主链路，并提供受控验证提示路径。
- [x] 2.4 在高成本或关键写 API 入口复用邮箱验证检查，确保未验证用户不会触发模型、TTS 或学习数据写入。
- [x] 2.5 为注册模式、邀请码成功/失败、邀请码补偿记录和邮箱未验证拦截补测试。

## 3. 高成本接口双维度限流

- [x] 3.1 新增 client IP 获取 helper，并记录当前部署环境的可信 header 顺序。
- [x] 3.2 扩展限流 helper，支持同一接口按 user id 和 IP 同时限流。
- [x] 3.3 将 practice generate、scene generate、similar generate、expression map generate、explain selection、TTS、TTS regenerate 接入双维度限流。
- [x] 3.4 暴露限流后端状态，管理员能确认当前为 `upstash` 或 `memory`。
- [x] 3.5 为 user 限流、IP 限流、Redis 状态和 429 requestId 补测试。

## 4. Baseline 与文档

- [x] 4.1 补真实 HTTP baseline 记录，覆盖 closed、invite-only、邮箱验证、user/IP 限流和 Origin 拒绝。
- [x] 4.2 同步 `docs/dev/public-registration-readiness-plan.md` 中 P0-A 完成状态和剩余 P0-B 风险。
- [x] 4.3 同步 `docs/dev/backend-release-readiness-checklist.md` 和 `docs/domain-rules/auth-api-boundaries.md`。
- [x] 4.4 在 `docs/dev/dev-log.md` 记录实现、验证、阻断项和剩余风险。
- [x] 4.5 完成 stable spec 同步、OpenSpec archive 和 `pnpm run maintenance:check`。

## 5. 明确不收项

- [x] 5.1 本轮不实现每日 AI / TTS quota、usage 预占和成本报表，风险保留在公网开放计划 P0-B。
- [x] 5.2 本轮不实现 `profiles.access_status`、`generation_limited`、`readonly` 或封禁后台，风险保留在公网开放计划 P0-B。
- [x] 5.3 本轮不实现学习时长 delta 上限、最小上报间隔或 session heartbeat，风险保留在公网开放计划 P0-B/P2。
- [x] 5.4 本轮不实现完整运营后台、异常用户列表、注册 IP 频控、CSP 或 WAF/DDoS 防护，风险保留在公网开放计划 P1/P2。
