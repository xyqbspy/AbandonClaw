## Why

当前后端接口层已经有基础登录保护、部分参数校验、上游超时和统一错误类型，但接口治理能力仍然是分散的：高成本接口缺少统一限流，请求缺少统一 `requestId` 与结构化追踪，写接口缺少同源来源校验，未知内部错误对外响应也没有收口成稳定契约。这些问题已经同时影响安全性、可观测性和稳定性，继续在业务接口里零散补丁会让后续维护和回归越来越难。

现在需要先用一次 OpenSpec 变更，把“后端接口最小治理基线”明确成可审批、可测试、可分阶段实施的能力边界，再进入实现阶段。

## What Changes

- 为受保护写接口补充统一的同源来源校验，避免跨站来源直接调用写接口。
- 为高成本接口增加统一限流基线，优先保护 AI 生成、解析、TTS 等高消耗能力。
- 为接口请求引入统一 `requestId` 与基础日志追踪规范，支持跨中间件、route、service 的定位。
- 统一未知内部错误的对外响应结构，避免泄露底层依赖或上游失败细节。
- 将上述治理能力先接入高风险接口，再补齐对应自动化测试和维护文档。

## Capabilities

### New Capabilities
- `api-operational-guardrails`: 定义接口层的最小运行治理基线，包括请求追踪、限流和高风险接口的统一保护要求。

### Modified Capabilities
- `auth-api-boundaries`: 扩展受保护接口的来源校验、错误响应收口和高成本接口入口保护要求。
- `project-maintenance`: 增加“后端接口治理变更必须同步审查请求边界、追踪、限流和回归测试”的维护约束。

## Impact

- 受影响代码：
  - `middleware.ts`
  - `src/lib/server/api-error.ts`
  - `src/lib/server/auth.ts`
  - `src/lib/server/validation.ts`
  - `src/app/api/tts/*`
  - `src/app/api/scenes/import/*`
  - `src/app/api/practice/generate/*`
  - `src/app/api/explain-selection/*`
  - `src/app/api/review/submit/*`
  - `src/app/api/learning/**/*`
- 受影响能力：
  - 受保护写接口的请求入口约束
  - 高成本接口的资源保护
  - 服务端错误响应契约
  - 请求级日志与排障方式
- 受影响测试：
  - middleware / api-error 单测
  - 高风险 route handler 测试
  - 新增限流与来源校验测试
