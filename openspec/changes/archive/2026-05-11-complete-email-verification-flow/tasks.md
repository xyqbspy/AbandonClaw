## 1. OpenSpec 与边界

- [x] 1.1 建立邮箱验证闭环 change，并记录本轮收口项与不收项。
- [x] 1.2 补充邮箱验证新能力 spec 与 auth 边界 delta。

## 2. 服务端注册与验证

- [x] 2.1 注册 API 根据 request origin 生成 `/auth/callback` 邮箱验证回跳地址。
- [x] 2.2 注册 service 调用 Supabase `signUp` 时传入 `emailRedirectTo`。
- [x] 2.3 新增 `/auth/callback` route，交换 Supabase code 并只跳转安全站内目标。
- [x] 2.4 新增 `/api/auth/resend-verification`，校验邮箱并调用 Supabase resend。

## 3. 页面体验

- [x] 3.1 `/verify-email` 增加邮箱输入与重发验证邮件操作。
- [x] 3.2 保留未验证拦截和已验证后返回登录/主应用的受控说明。

## 4. 测试

- [x] 4.1 补注册 service/route 测试，覆盖 `emailRedirectTo`。
- [x] 4.2 补 callback route 测试。
- [x] 4.3 补 resend route 和 verify-email 页面测试。

## 5. 文档与收尾

- [x] 5.1 同步公网注册验证指南、runbook、readiness plan 和 dev-log。
- [x] 5.2 同步 stable spec。
- [x] 5.3 运行最小相关测试、OpenSpec 校验和类型检查。

## 6. 明确不收项

- [x] 6.1 不自建验证码、邮箱 token 表或邮件投递系统。
- [x] 6.2 不做邮件模板、域名信誉、退信监控或到达率统计。
- [x] 6.3 不做管理员手动标记邮箱已验证。
