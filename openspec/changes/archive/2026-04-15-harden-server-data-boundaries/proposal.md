## Why

第一阶段只建立了接口入口的最小治理基线，但用户态接口仍然存在两个高风险空洞：一是部分读写仍依赖 `service role`，数据库权限边界不够清晰；二是学习、复习和短语保存等关键写接口缺少幂等与并发保护，重复点击、重试或多端同时提交时仍可能写坏状态。随着高成本接口已经开始限流和追踪，这些更靠近数据正确性的风险已经成为下一阶段最需要优先处理的问题。

现在需要用第二个 OpenSpec change 把“服务端数据边界收紧 + 关键写入一致性保护 + 共享限流升级”明确成可审阅、可拆分实施的方案，避免在主链路上继续零散补丁。

## What Changes

- 逐步收紧用户态接口的数据访问边界，明确哪些服务端场景允许继续使用 `service role`，哪些读写必须迁移到用户上下文或受限仓储入口。
- 为 `review submit`、`learning progress/start/complete`、`phrases save/save-all` 等关键写接口补充幂等、条件更新或版本保护，避免重复请求造成状态错乱。
- 将第一阶段的进程内限流基线升级为可多实例承载的共享限流方案，并统一高成本接口的 key、窗口和退避策略。
- 补齐第一阶段未纳入的受保护写接口来源校验与统一参数校验收口，保持错误契约稳定。
- 为上述改动补充针对主链路写接口的最小回归测试、压测基线和维护记录。

## Capabilities

### New Capabilities
- `write-consistency-guardrails`: 定义关键写接口的幂等、条件更新和并发保护要求，确保学习/复习/短语保存链路在重复提交或多端并发下仍保持一致性。

### Modified Capabilities
- `auth-api-boundaries`: 收紧用户态接口的数据访问边界，补充对 `service role` 使用范围和用户上下文读写的要求。
- `api-operational-guardrails`: 将高成本接口限流从单实例基线升级为共享限流能力，并补充接口级统一参数校验接入要求。
- `project-maintenance`: 增加后端数据边界和关键写入一致性改动必须先审计主链路写入点、数据库边界和回归面的维护约束。

## Impact

- 受影响代码：
  - `src/lib/server/scene/*`
  - `src/lib/server/learning/*`
  - `src/lib/server/review/*`
  - `src/lib/server/phrases/*`
  - `src/lib/supabase/admin.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/server/rate-limit.ts`
  - `src/app/api/learning/**/*`
  - `src/app/api/review/**/*`
  - `src/app/api/phrases/**/*`
- 受影响能力：
  - 用户态接口的数据权限边界
  - 关键写接口的一致性与恢复行为
  - 高成本接口在多实例下的限流行为
  - 写接口参数校验与错误契约
- 受影响系统：
  - Supabase 访问方式与可能的 RLS / SQL 配套
  - 关键 route/handler/service 的测试基线
  - 最小压测与维护文档
