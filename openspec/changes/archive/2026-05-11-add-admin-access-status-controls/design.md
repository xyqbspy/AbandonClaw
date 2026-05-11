## Context

当前账号访问状态的消费链路已经存在：

- `requireCurrentProfile()` / `requireVerifiedCurrentProfile()` 会阻止 `disabled`
- 高成本入口会在 quota 预占前调用 `assertProfileCanGenerate(profile)`
- 学习写入、表达保存和 review 写入会调用 `assertProfileCanWrite(profile)`

但状态变更链路还没有最小后台闭环。现状主要是：

- 数据模型已具备 `profiles.access_status`
- `/admin` 已有页面框架、server action、notice 机制和 admin service
- 管理员可以看 `/api/admin/status` 的只读摘要
- 真正修改状态仍依赖 SQL

这导致“规则已经可执行，但处置入口仍不可用”。本轮不新建复杂运营域模型，也不引入新依赖，优先复用现有 `/admin` 体系完成最小闭环。

## Goals / Non-Goals

**Goals:**

- 提供最小 admin-only 用户检索与账号状态修改入口
- 复用现有 `profiles.access_status`，不新增新的状态字段或额外状态表
- 让管理员在页面内即可把用户切到 `active`、`disabled`、`generation_limited`、`readonly`
- 保持页面与 action 边界清晰：列表与表单在 `/admin`，数据查询与更新在 `src/lib/server/admin/service.ts`
- 补齐权限、验证、文档和测试，确保该能力不会越权

**Non-Goals:**

- 不做完整用户详情页、学习画像、最近 requestId 聚合或成本画像
- 不做批量操作、批量封禁、审计日志、审批流或自动风控规则
- 不做新的数据库迁移；默认复用现有 `profiles.access_status`
- 不改动普通用户侧的入口、文案或访问语义

## Stability Closure

### In This Round

- 收口 SQL-only 处置链路，提供最小后台闭环
- 收口 checklist 对“可通过 SQL 或 admin-only route 设置状态”的实现漂移
- 收口管理员操作后的受控反馈，而不是把成败留给人工查库

### Not In This Round

- 不做完整运营概览和异常用户看板：这会扩大到 P1
- 不做用户维度长期成本趋势、学习画像和请求历史：这属于用户详情后台
- 不做批量 UI、审计日志和自动封禁：这些需要更明确的运营流程和回滚策略

## Decisions

### 1. 复用现有 `/admin` 页面体系，不新增独立后台域

决策：

- 在现有 `/admin` 下新增用户管理入口，例如 `/admin/users`
- 复用 `PageHeader`、`AdminNoticeCard`、`FilterBar`、`AdminList`、server action 和 `appendAdminNotice()`

原因：

- 当前 admin 页面已经形成一致交互骨架
- 这样能把实现范围控制在“新增一个后台切面”，而不是再造管理框架

备选方案：

- 单独做 `/admin/access-status` 的极简表单页：更省代码，但后续扩展用户详情会重复
- 只加 API route 不加页面：仍会把操作负担留给手工调用，不满足“最小可执行处置入口”

### 2. 查询与更新统一落在 `src/lib/server/admin/service.ts`

决策：

- 新增管理员查询用户列表 / 基础信息的方法
- 新增管理员更新 `profiles.access_status` 的服务方法
- 页面和 action 只做参数编排与重验证，不直接写 Supabase 查询

原因：

- 现有 admin scenes / phrases 已采用相同模式
- 便于后续把“最小列表”逐步扩展到“用户详情”

备选方案：

- 页面内直接使用 `createSupabaseAdminClient()`：实现更快，但会让查询和更新逻辑散落在页面层

### 3. 状态修改优先采用 server action，必要时再补 admin API route

决策：

- 页面内状态切换优先走 server action
- 若 checklist 或脚本联调需要稳定 HTTP 入口，再补 admin-only route 作为辅助

原因：

- 现有 `/admin` 操作基本已经使用 server action
- server action 更容易复用现有 notice、redirect、revalidate 模式

备选方案：

- 只做 API route：更适合程序化调用，但页面还得再写提交与反馈壳
- 同时做 action + route：范围略大，只有在验证脚本或 runbook 明确需要时再扩

### 4. 用户检索只做“足够处置”的最小字段

决策：

- 首版列表只展示：
  - `userId`
  - `email`
  - `username`
  - `access_status`
  - `created_at`
- 筛选只覆盖：
  - `q`（email / userId / username）
  - `access_status`

原因：

- 目标是快速找到并处置账号，不是做完整 CRM
- 字段越少，查询和 UI 都更稳定

备选方案：

- 直接补“最近活跃时间 / 今日高成本用量 / 学习分钟数”：价值更高，但已经跨到 P1 用户详情范围

## Risks / Trade-offs

- [越权修改风险] → 所有查询和更新入口都必须先 `requireAdmin()`，并补非管理员失败测试
- [误封风险] → UI 明确展示当前状态与目标状态，提供受控成功反馈；回滚方式保持为改回 `active`
- [范围膨胀风险] → 列表字段、筛选条件和操作只围绕状态处置，不顺手加入学习画像或成本看板
- [数据来源分散风险] → 用户基础信息可能来自 `auth.users` 与 `profiles` 的组合；实现时需要明确最小来源与缺省字段处理

## Migration Plan

1. 新增 proposal / design / spec / tasks
2. 实现 admin service 的用户查询与状态更新
3. 实现 `/admin/users` 页面与 server action
4. 视需要补 admin-only HTTP route
5. 补测试、文档和 dev-log

回滚策略：

- 若页面或 action 存在问题，可移除 `/admin/users` 入口与对应 action，不影响现有 `access_status` 消费链路
- 数据层不引入新迁移，回滚成本较低；账号状态仍可回退为 SQL 手工操作

## Validation

- 纯逻辑 / 服务端：
  - admin service 用户查询与状态更新测试
  - 非管理员调用 action / route 的拒绝测试
- 页面 / 交互：
  - `/admin/users` 基础渲染
  - 按状态筛选
  - 状态切换表单交互
- 回归：
  - 现有 `auth-access-status` 测试继续通过
  - `maintenance:check` 与 OpenSpec validate 通过

## Open Questions

- 是否需要在本轮同时提供 admin-only HTTP route，还是先以 server action 满足“admin-only 入口”即可
- 用户 email 的查询来源是否直接复用 `auth.admin.listUsers()`，还是优先从当前可落地的 profile / auth 组合查询中取最小字段
