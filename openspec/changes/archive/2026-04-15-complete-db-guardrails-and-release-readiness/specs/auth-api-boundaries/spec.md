# 规范文档：auth-api-boundaries

## MODIFIED Requirements

### Requirement: 高成本接口必须有显式访问边界
对已切换到用户上下文的用户态读写链路，系统 MUST 同时具备服务层访问边界与数据库层最小权限边界。若服务端通过 `createSupabaseServerClient` 或等效用户上下文访问学习进度、复习结果、短语保存、practice run 或 variant run 等用户私有数据，则对应数据库表 MUST 具备可说明、可审计的最小 RLS / SQL 配套，而不能只依赖服务层参数过滤。

#### Scenario: 用户态接口通过用户上下文读取或写入私有数据
- **WHEN** 用户态接口通过用户上下文访问学习、复习、短语或练习相关的用户私有表
- **THEN** 系统 MUST 有对应的数据库侧最小权限规则或等效 SQL 说明
- **AND** 这些规则 MUST 与服务层当前的用户身份边界保持一致

#### Scenario: 后台白名单入口继续使用高权限访问
- **WHEN** 系统保留共享 `phrases` 表、AI enrich 或其他后台任务的高权限入口
- **THEN** 系统 MUST 显式记录这些入口的用途、边界和回滚策略
- **AND** 不得把这类高权限入口重新扩散回普通用户态服务路径
