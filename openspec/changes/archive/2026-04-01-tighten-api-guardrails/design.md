## Status

completed

## Context

当前请求链路大致如下：

- `middleware` 负责页面/API 的登录边界与登录后安全跳转。
- route handler 负责请求体解析、参数归一化、调用 service/provider。
- `glm-client`、`openai` provider 负责上游模型调用。
- `toApiErrorResponse` 负责把异常转换成接口响应。

现状里已经有几项基础保护：

- 高成本接口大多已被 `middleware` 纳入受保护 API 前缀。
- 上游调用已有超时和空响应保护。
- `AuthError` / `ValidationError` 这类已知异常有稳定状态码。

但完整链路仍有几个断点：

1. `middleware` 的登录边界不等于 route 内部权限边界，导致 `/api/tts/regenerate` 这类敏感写操作仍可被普通登录用户调用。
2. `parseJsonBody` 只保证“是 JSON 对象”，没有统一输入规模约束；高成本接口各自也没有完整的字段长度/批量数量控制。
3. `/api/me` 在热路径里并发调用 `getCurrentSession()` 和 `getCurrentUser()`，会触发重复认证查询与重复重试逻辑。
4. `toApiErrorResponse` 对普通 `Error` 直接返回 message，导致内部失败细节可能泄露到前端。

## Goals / Non-Goals

**Goals**

- 让高成本/敏感接口具备与成本等级相匹配的权限边界。
- 让高成本接口在进入模型或重生成逻辑前就完成输入规模拦截。
- 让 `/api/me` 热路径只依赖一次身份识别结果驱动后续资料读取。
- 让 5xx 错误对外表现为统一、可预测且不泄露内部细节的响应。

**Non-Goals**

- 不实现分布式或依赖 Redis 的全局限流设施。
- 不一次性重构全部 API route 的参数解析方式。
- 不改动业务数据模型或数据库结构。

## Decisions

1. 对敏感重操作接口按能力分级

- `/api/tts/regenerate` 从“已登录可用”收紧为“仅管理员可用”。
- 普通 TTS 生成接口继续保持登录后可用，但保留输入规模约束。

2. 对高成本接口补充显式输入上限

- `explain-selection` 对关键文本字段增加长度上限，拒绝空字符串之外的超长输入。
- `practice/generate` 对 `scene` 的结构合法性之外，再限制可接受的 section/block/sentence/chunk 数量和整体文本规模。
- `tts/regenerate` 对 `items` 数量设置上限，并在空数组或超限时直接返回 400。
- 通用校验层提供可复用的 trimmed string / string array / body size 辅助能力，避免每个 route 自己散落判断。

3. `/api/me` 改为单次身份结果驱动

- 方案优先级：
  - 先用单次 `getCurrentUser()` 结果驱动 profile 查询。
  - 如确有 session 信息返回需求，再从同一认证结果派生，而不是再额外打一轮认证查询。
- 目标是不在同一请求里重复触发可避免的 `getSession`/`getUser` 组合调用。

4. 收紧错误暴露

- `AppError` 继续原样透传，因为它们是显式定义过的接口契约。
- 对未知 `Error`，服务端记录日志，对客户端返回 fallback message 与通用错误码，不再直接回传底层 `message`。
- 上游模型 provider 仍保留内部可诊断日志，但 route 响应只暴露受控错误文本。

## Risks / Trade-offs

- 如果把 `/api/tts/regenerate` 直接收紧到管理员，会改变现有非管理员调用方行为；需要确认当前是否存在普通用户入口。
- 输入上限设置过低会压缩正常业务空间；需要结合现有页面请求体和测试样本给出保守但明确的阈值。
- `/api/me` 去重后如果仍有页面依赖 session 的某些字段，需要确认返回结构不发生破坏性变化。

## Validation

- route 单测：
  - `/api/tts/regenerate` 未登录、普通用户、管理员、超限批量、空批量
  - `/api/explain-selection` 必填/超长输入
  - `/api/practice/generate` 非法 scene、超限 scene、正常 scene
  - `/api/me` 单次身份结果复用，不再触发重复认证依赖
- 回归验证：
  - 现有 `middleware` 保护测试继续通过
  - 现有高成本接口 happy path 不被误伤
- 残余风险：
  - 当前变更只做应用层收口，不包含真正按 IP / 用户维度的全局限流
