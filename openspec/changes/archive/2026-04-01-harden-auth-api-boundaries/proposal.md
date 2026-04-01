## Why

当前登录链路与接口保护存在几处边界不一致：登录/注册页客户端的 `redirect` 校验弱于 `middleware`，部分会触发外部模型或高成本处理的接口仍可被匿名请求直接命中，API 鉴权兜底与失败保护也不够统一。现在先把这些边界收敛成明确 proposal，可以在不扩散范围的前提下优先处理安全、成本和稳定性风险。

## What Changes

- 统一登录页、注册页与 `middleware` 的站内重定向校验规则，禁止不安全的 `redirect` 目标进入前端跳转链路。
- 收紧高成本接口的访问边界，为会触发模型调用或重型解析的入口增加认证要求或显式保护策略。
- 为模型调用链路补充超时、错误收敛和最小失败保护，避免上游抖动放大为接口长时间占用。
- 统一 API 边界保护策略，减少“依赖单个 route 自觉鉴权”的分散式实现。
- 优化登录后热路径的重复认证/资料查询，降低 `/api/me` 的可避免 I/O。
- 补充覆盖登录重定向、安全边界和高风险接口入口的自动化测试。

## Capabilities

### New Capabilities

- `auth-api-boundaries`: 定义登录重定向、受保护接口访问边界、高成本接口防护与上游模型调用失败保护的统一要求

### Modified Capabilities

- `project-maintenance`: 增加“涉及认证、接口安全边界或高成本外部调用时必须先审计访问控制、失败保护与回归测试”的维护要求

## Impact

- 受影响代码：
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/signup/page.tsx`
  - `middleware.ts`
  - `src/app/api/explain-selection/*`
  - `src/app/api/practice/generate/*`
  - `src/app/api/scene/mutate/*`
  - `src/app/api/scene/parse/*`
  - `src/app/api/me/*`
  - `src/lib/server/glm-client.ts`
  - `src/lib/explain/providers/openai.ts`
- 受影响系统：
  - 基于 Supabase cookie 的登录态判断
  - App Router API route 入口保护
  - 外部模型调用链路与失败回退
  - 登录后用户资料热路径
- API 影响：
  - 部分原本可匿名访问的高成本接口将改为受保护接口或增加显式拒绝策略
  - 登录/注册后的重定向行为将只接受安全站内路径
- 数据库迁移：无
