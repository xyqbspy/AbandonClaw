## Context

当前注册链路已经收口到 `/api/auth/signup`，`invite_only` 模式会在服务端按邀请码明文计算 SHA-256 hash，并与 `registration_invite_codes.code_hash` 匹配。数据库只保存 hash、次数、过期和启停状态；注册尝试写入 `registration_invite_attempts`。

现有问题不在注册校验，而在邀请码发放：维护者必须手动计算 hash、写 SQL、再把明文发给测试用户。这个流程安全但繁琐，阻碍日常测试和小范围 `invite_only` 发放。

## Goals / Non-Goals

**Goals:**

- 在 `/admin` 下提供最小邀请码管理入口。
- 支持管理员手动创建单个邀请码和自动生成一批邀请码。
- 明文邀请码只在创建成功后展示一次；数据库仍只保存 hash。
- 支持查看最小状态、停用邀请码、调整 `max_uses` 和 `expires_at`。
- 支持查看邀请码使用明细和关联账号的最小活动摘要。
- 保持注册页和 `/api/auth/signup` 的用户侧契约不变。
- 补齐测试和文档，让测试注册不再依赖手工 SQL。

**Non-Goals:**

- 不做公开申请邀请码。
- 不做邮件、短信、站内信发送。
- 不做 recipient、渠道、批次、活动归因。
- 不做完整审计后台、异常排行或用户画像。
- 不改变 `REGISTRATION_MODE=closed` 默认拒绝注册的语义。

## Decisions

### 1. 复用现有 invite 表，不新增明文字段

继续使用 `registration_invite_codes`。新增后台能力只负责生成明文、计算 hash、写入现有表。

原因：

- 现有注册服务已经稳定依赖 `code_hash`。
- 不落库明文是当前安全边界，不能为了易用性破坏。
- 当前需求只需要生成和发放，不需要新的数据模型。

备选方案：

- 新增 `plain_code` 字段：拒绝，泄露风险高。
- 新增完整 batch 表：延后，当前没有 recipient/渠道/批次分析需求。

### 2. 明文只在创建成功响应中展示一次

自动生成或手动创建成功后，页面展示本次生成的明文列表，供管理员复制发放。刷新页面后只能看到 hash 对应记录的状态，不能恢复明文。

原因：

- 降低数据库泄露时的邀请码可用风险。
- 管理员仍能完成发放动作。
- 符合现有“只存 hash”的注册边界。

### 3. 生成逻辑放服务端 admin-only action/service

新增服务层函数负责：

- 生成随机邀请码。
- normalize 后计算 SHA-256。
- 批量 insert。
- 查询列表。
- 停用和更新元数据。

页面只调用受控 server action 或 admin route。所有写操作必须先校验管理员身份。

原因：

- 避免前端生成后传 hash 造成规则分散。
- 让测试能覆盖 hash 规则和 admin-only 边界。

### 4. 自动生成码使用短批量、保守默认

默认自动生成少量邀请码，例如 5 个；每个默认 `max_uses=1`，默认 7 天过期。管理员可在表单里设置数量、次数和过期天数，服务端做上限保护。

建议上限：

- `count <= 50`
- `max_uses <= 100`
- `expires_in_days <= 90`

原因：

- 这是测试和小范围发放工具，不是增长后台。
- 防止误操作生成长期大批量可用邀请码。

### 5. 使用明细来自 attempts，活动摘要保持轻量聚合

邀请码详情或列表展开区展示 `registration_invite_attempts` 的最近记录，包括 email、status、failure_reason、auth_user_id 和 created_at。对于 `auth_user_id` 存在的记录，额外关联最小活动摘要：

- profile username / access_status。
- 是否可从 Auth 用户信息判断邮箱已验证。
- 最近学习统计中的学习秒数、完成场景数或复习完成数。
- 今日高成本 usage reserved/success/failed 汇总。

原因：

- 管理员关心的是“邀请码有没有被真实账号使用”，不是完整行为画像。
- 这些字段足以支撑测试发放、异常排查和小范围开放观察。
- 避免首版直接扩成完整用户详情后台。

备选方案：

- 只展示 `used_count`：不够，管理员仍要查 SQL 才知道谁用了。
- 做完整账号活动页：延后，属于 P1/P2 运营后台。

## Risks / Trade-offs

- [Risk] 管理员复制后丢失明文，页面无法恢复。  
  Mitigation: 文档明确明文只展示一次；需要时重新生成并停用旧码。

- [Risk] 管理员误生成过多邀请码。  
  Mitigation: 服务端限制批量数量、最大使用次数和过期天数。

- [Risk] 邀请码管理和用户状态处置挤在同一后台造成页面复杂。  
  Mitigation: 独立 `/admin/invites` 或等价子入口，列表和表单保持最小字段。

- [Risk] 唯一 hash 冲突或手动输入重复邀请码。  
  Mitigation: 数据库 unique 约束兜底，服务端返回受控错误；自动生成可重试或提示失败数量。

- [Risk] 活动摘要查询过重，影响 admin 页面加载。  
  Mitigation: 默认只查最近少量 attempts 和轻量聚合；不做全量日志、趋势或深分页。

## Migration Plan

1. 不新增必需 SQL；复用 `20260509_public_registration_p0a.sql` 已创建的表。
2. 部署代码后，管理员访问 `/admin/invites` 生成测试邀请码。
3. 手工 SQL 发码流程作为临时备用路径保留在文档中，但不再是推荐路径。
4. 回滚时删除/隐藏 admin 页面和 action 即可；已有邀请码记录仍可被注册链路使用。

## Open Questions

- 首版入口使用 `/admin/invites`，还是挂在 `/admin/users` 的相邻导航中？实现时按现有 admin 导航结构选择最贴近的方式。

## Stability Closure

本轮关闭的邀请码发放不稳定点：

- 管理员无需再为了普通测试注册手工计算 hash 和写 SQL。
- 明文展示、持久化 hash、注册校验三者边界明确。
- admin-only 写入口和非管理员拒绝成为可测试契约。
- 邀请码使用者和最小活动摘要成为 admin 可见信息，不再依赖手工 SQL 排查。

明确延后：

- recipient、批次渠道、邮件发送、完整审计、公开申请入口、完整用户画像。
- 延后原因是当前目标是受控小范围 `invite_only`，不是增长运营系统。
- 剩余风险继续记录在公网开放计划和验证指南中。
