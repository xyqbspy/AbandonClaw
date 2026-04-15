# 变更提案：补齐数据库防护与上线准备

## Status
draft

## Why
第二阶段已经把大部分用户态读写从 `service role` 收紧到用户上下文，并补了幂等、统一校验、共享限流和最小压测能力，但仍然留有三个明显缺口：

- 数据库侧最小 RLS / SQL 配套还没有补齐，当前约束更多停留在服务层。
- 压测结果目前以 in-process baseline 为主，缺少真实 HTTP 入口下的链路基线。
- 上线前缺少一份围绕限流、Origin、Redis、白名单入口和风险接受项的统一检查清单。

这些缺口已经开始影响“能否稳定上线”而不只是“代码结构是否更整洁”。

## What Changes
- 为已切换到用户上下文的关键用户态表补齐最小 RLS / SQL 配套与说明。
- 在真实 HTTP 入口下补一轮最小基线压测并记录结果。
- 增加一份服务端治理上线前检查清单，统一环境配置、白名单入口和剩余风险说明。

## Scope

### In Scope
- `supabase` 侧最小权限与 SQL 配套梳理
- `learning / review / phrases / practice / variant` 相关用户态表的最小 RLS 审计与补齐
- `scripts/load-api-baseline.ts` 的真实 HTTP 基线执行与记录
- 服务端治理上线前检查清单
- OpenSpec spec delta、开发日志与审计文档同步

### Out of Scope
- 全库 RLS 重构
- 完整熔断体系
- 全量 OpenAPI / Swagger
- 全量生产容量压测
- 将所有后台白名单入口全部改造成用户态访问

## Impact
影响的规范：
- `auth-api-boundaries`
- `api-operational-guardrails`
- `write-consistency-guardrails`
- `project-maintenance`

影响的模块：
- `src/lib/supabase/*`
- `src/lib/server/learning/*`
- `src/lib/server/review/*`
- `src/lib/server/phrases/*`
- `src/lib/server/scene/*`
- `scripts/load-api-baseline.ts`
- `docs/dev/*`

是否涉及 API 变更：否  
是否涉及前端交互变化：否  
是否影响缓存策略：是，涉及共享限流与真实入口验证  
是否影响测试基线：是  
兼容性：向后兼容  
风险点：
- RLS 收紧后如果策略不完整，最容易误伤学习、复习和短语保存主链路。
- 真实 HTTP 压测可能暴露此前 in-process baseline 无法看见的认证、Origin 或限流差异。
- 上线清单如果不明确白名单边界，后续容易把后台入口重新扩散回业务服务层。
