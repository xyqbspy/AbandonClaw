## Status

completed

## Why

当前接口层已经补上了基础登录保护、登录跳转安全校验和上游超时控制，但仍存在几类没有收口的问题：

- `/api/tts/regenerate` 只有登录校验，没有更细的权限边界，且批量请求规模未限制，存在被普通登录用户滥用高成本重生成能力的风险。
- `/api/me` 仍会在同一请求里重复做 session/user 认证读取，和当前 `auth-api-boundaries` 规范里“热路径避免重复认证查询”的目标不一致。
- `explain-selection`、`practice/generate` 等高成本接口缺少统一的输入长度、数组项数、请求体规模控制，容易把异常大请求直接放大成延迟、成本和资源占用问题。
- 当前 5xx 路径对普通 `Error` 仍会直接透传 `error.message`，会把内部依赖和上游失败细节暴露给前端。

这类问题同时影响安全性、性能稳定性和接口契约一致性，需要以一次 OpenSpec 变更明确目标行为和实施范围。

## What Changes

- 收紧高成本与敏感接口的访问边界，区分“普通登录可用”和“仅管理员可触发”的接口能力。
- 为高成本模型接口补齐统一的输入规模控制，包括字段长度、数组数量、批量规模和必要的拒绝策略。
- 调整 `/api/me` 的热路径实现，复用单次身份识别结果，避免同请求内可避免的重复认证调用。
- 统一接口错误收敛策略，避免把内部错误文本直接暴露给客户端。
- 为上述边界补齐直接测试，覆盖未授权、越权、超限输入、热路径复用和错误响应场景。

## Capabilities

### Modified Capabilities

- `auth-api-boundaries`: 补充高成本接口的角色边界、输入规模控制、热路径复用和错误收敛要求。
- `project-maintenance`: 补充“接口安全/性能收口改动需要同时检查权限、输入规模、错误暴露与回归测试”的维护要求。

## Scope

### In Scope

- `src/app/api/tts/regenerate/route.ts`
- `src/app/api/me/route.ts`
- `src/app/api/explain-selection/route.ts`
- `src/app/api/practice/generate/route.ts`
- 通用校验与错误收敛层，如 `src/lib/server/validation.ts`、`src/lib/server/api-error.ts`
- 相关测试与 OpenSpec delta

### Out of Scope

- 新增完整的全局网关级限流系统
- 改造所有 API route 的缓存策略
- 替换现有模型提供商或重写 TTS / Explain / Practice 业务逻辑

## Impact

- 影响的规范：
  - `auth-api-boundaries`
  - `project-maintenance`
- 影响的代码模块：
  - `src/app/api/me`
  - `src/app/api/tts`
  - `src/app/api/explain-selection`
  - `src/app/api/practice/generate`
  - `src/lib/server/auth`
  - `src/lib/server/validation`
  - `src/lib/server/api-error`
- 是否涉及数据库迁移：否
- 是否涉及 API 行为变更：是
- 是否影响前端交互：是，部分接口在越权或超限时会更早返回明确错误
- 是否影响缓存策略：否
- 是否影响测试基线或回归范围：是
- 兼容性：向后兼容为主，但会收紧原本过宽的接口访问和输入范围
- 主要风险：
  - 限制过严会误伤现有正常请求
  - 权限边界调整后需要同步修正调用方预期和测试断言
