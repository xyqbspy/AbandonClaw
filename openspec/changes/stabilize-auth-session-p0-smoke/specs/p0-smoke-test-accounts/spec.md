## ADDED Requirements

### Requirement: 测试账号必须通过受保护脚本幂等创建
系统 MUST 提供受环境变量保护的测试账号 seed 能力，用于发布前冒烟和自动化 smoke，不得要求维护者每次走注册、验证码或邀请码流程。

#### Scenario: 创建或更新测试账号
- **WHEN** 维护者执行测试账号 seed 命令且 `ALLOW_TEST_USER_SEED=true`、`SUPABASE_SERVICE_ROLE_KEY`、`TEST_USER_PASSWORD` 和测试账号 email 均已配置
- **THEN** 系统 MUST 通过 Supabase admin / service role 幂等创建或更新测试账号
- **AND** 测试账号 MUST 处于 email confirmed 状态
- **AND** 系统 MUST 复用现有 profile、role、access status 或 admin allowlist 权限模型
- **AND** seed 输出 MUST 不包含明文密码

#### Scenario: seed 缺少保护配置
- **WHEN** 维护者执行测试账号 seed 命令但缺少 `ALLOW_TEST_USER_SEED=true`、`SUPABASE_SERVICE_ROLE_KEY` 或 `TEST_USER_PASSWORD`
- **THEN** 系统 MUST 拒绝执行
- **AND** 系统 MUST 不创建或更新任何 auth user、profile 或权限记录

#### Scenario: seed 支持三类账号
- **WHEN** 维护者执行测试账号 seed 命令
- **THEN** 系统 MUST 至少支持普通测试账号、受限测试账号和 admin 测试账号
- **AND** 对应 email MUST 从 `TEST_NORMAL_EMAIL`、`TEST_RESTRICTED_EMAIL` 和 `TEST_ADMIN_EMAIL` 或等效测试账号 env 读取

### Requirement: 测试账号学习数据 reset 必须受白名单保护
系统 MUST 提供测试账号学习数据 reset 能力，使普通测试账号可恢复到新用户状态；reset 不得删除 auth user，且不得作用于真实用户。

#### Scenario: 重置普通测试账号为新用户状态
- **WHEN** 维护者执行 reset 命令且 `ALLOW_TEST_USER_RESET=true`，目标 email 命中测试账号白名单或受控测试域名
- **THEN** 系统 MUST 仅清空该测试账号的学习闭环用户态数据
- **AND** 系统 MUST 不删除 Supabase auth user
- **AND** reset 后该账号的 Today 首个 starter recommendation MUST 回到 `daily-greeting`
- **AND** reset 后该账号的 Chunks MUST 为空
- **AND** reset 后 Review due MUST 为空或仅包含后续重新保存表达后产生的 due 项

#### Scenario: reset 拒绝非测试账号
- **WHEN** 维护者执行 reset 命令但目标 email 未命中测试账号白名单或受控测试域名
- **THEN** 系统 MUST 拒绝执行
- **AND** 系统 MUST 不删除任何学习数据

#### Scenario: reset 缺少保护配置
- **WHEN** 维护者执行 reset 命令但缺少 `ALLOW_TEST_USER_RESET=true`
- **THEN** 系统 MUST 拒绝执行
- **AND** 系统 MUST 不删除任何学习数据

### Requirement: P0 主闭环必须支持 API-level smoke
系统 MUST 提供可由命令行执行的 P0 API-level smoke，用测试账号通过正式业务 API 验证登录、Today、Scene、Chunks、Review 和推荐推进。

#### Scenario: 普通测试账号完成 P0 API smoke
- **WHEN** 维护者执行 `pnpm run smoke:p0-auth-loop` 或等效命令且测试账号 env 已配置
- **THEN** smoke MUST 使用 `TEST_NORMAL_EMAIL` 与 `TEST_USER_PASSWORD` 登录
- **AND** smoke MUST 验证登录默认落到 `/today`
- **AND** smoke MUST 验证 Today starter recommendation 为 `daily-greeting`
- **AND** smoke MUST 验证 `daily-greeting` scene 可访问且包含 builtin chunks
- **AND** smoke MUST 通过正式业务 API 保存一个 scene chunk
- **AND** smoke MUST 通过 `/api/phrases/mine` 或等效正式 API 验证该表达进入用户态 Chunks
- **AND** smoke MUST 通过 `/api/review/due` 或等效正式 API 验证该表达进入 due
- **AND** smoke MUST 通过 `/api/review/submit` 或等效正式 API 提交复习
- **AND** smoke MUST 验证复习日志写入且 user phrase 状态推进
- **AND** smoke MUST 完成 `daily-greeting` 并验证 Today 后续推荐推进到 `self-introduction`

#### Scenario: smoke 缺少测试账号配置
- **WHEN** 维护者执行 P0 smoke 但缺少测试账号 email、密码或目标 base URL
- **THEN** smoke MUST 以失败状态退出
- **AND** 输出 MUST 明确缺失的配置项
- **AND** smoke MUST 不静默跳过核心步骤后宣称通过

#### Scenario: smoke 只能将 service role 用于 seed 或 reset
- **WHEN** P0 smoke 执行学习闭环步骤
- **THEN** 系统 MUST 使用正式登录 session 和正式业务 API
- **AND** 系统 MUST 不使用 service role 绕过用户态权限、RLS 或业务 API
