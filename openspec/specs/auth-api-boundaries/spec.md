## Purpose

定义认证入口、高成本接口、用户态数据访问与后台高权限入口的稳定边界，确保接口治理、安全约束与数据库最小权限规则保持一致。
## Requirements
### Requirement: 账号访问状态必须约束主应用、生成与写入
系统 MUST 使用 profile 级访问状态提供最小封禁和降级能力，避免异常账号只能通过关闭全站入口处理。

#### Scenario: disabled 用户访问主应用或受保护 API
- **WHEN** `profiles.access_status = disabled`
- **THEN** 系统 MUST 阻止用户进入主应用和受保护 API

#### Scenario: generation_limited 用户调用高成本入口
- **WHEN** `profiles.access_status = generation_limited`
- **AND** 用户调用 AI、TTS 或 generate 类高成本入口
- **THEN** 系统 MUST 在 daily quota 预占前拒绝请求
- **AND** 不得触发上游调用或 usage 预占

#### Scenario: readonly 用户执行写入
- **WHEN** `profiles.access_status = readonly`
- **AND** 用户尝试写学习进度、保存/删除表达、提交练习或其他学习写入
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得执行后续写入

### Requirement: 账号状态修改入口必须限制为 admin-only
系统 MUST 通过明确的管理员入口修改 `profiles.access_status`，不得把普通用户入口、公共 API 或手工 SQL 视为默认唯一运维路径。

#### Scenario: 管理员修改账号状态
- **WHEN** 管理员通过后台页面、server action 或受控 admin route 提交新的 `access_status`
- **THEN** 系统 MUST 先校验调用者为管理员
- **AND** 只允许写入 `active`、`disabled`、`generation_limited` 或 `readonly`

#### Scenario: 非管理员尝试修改账号状态
- **WHEN** 非管理员用户调用账号状态修改入口
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得执行 `profiles.access_status` 更新

#### Scenario: 非法状态值写入
- **WHEN** 调用方提交不在允许集合内的状态值
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得写入数据库

### Requirement: 登录跳转只允许安全站内目标
系统 MUST 仅接受站内安全路径作为登录页、注册页与认证中间件的跳转目标。任何缺失、非法、跨站或协议相对的 `redirect` 值都 MUST 回退到默认站内落点，而不能进入前端或服务端跳转链路。

#### Scenario: 未登录用户带合法站内 redirect 进入登录页
- **WHEN** 用户访问 `/login?redirect=/review`
- **THEN** 系统 MUST 保留 `/review` 作为登录成功后的跳转目标
- **AND** 登录页与中间件 MUST 使用一致的安全规则判断该目标有效

#### Scenario: 用户带不安全 redirect 进入登录页
- **WHEN** 用户访问 `/login?redirect=//evil.example`
- **THEN** 系统 MUST 拒绝该跳转目标
- **AND** 登录成功后 MUST 回退到默认站内页面而不是外部地址

### Requirement: 高成本接口默认必须要求已登录访问
任何会触发外部模型调用、批量重生成、重解析或其他高成本服务端处理的接口 MUST 具备与成本等级匹配的显式访问边界。默认情况下，这类接口 MUST 要求已登录用户访问，而不能依赖默认放行。

#### Scenario: 未登录用户访问受保护高成本接口
- **WHEN** 未登录用户请求会触发模型调用、重解析或批量音频处理的受保护接口
- **THEN** 系统 MUST 在进入高成本处理前直接拒绝请求
- **AND** 不得继续发起外部模型调用、文件删除、资源上传或其他高成本任务

#### Scenario: 普通已登录用户访问受保护高成本接口
- **WHEN** 普通已登录用户请求会触发模型调用或重解析的受保护接口
- **THEN** 系统 MUST 允许请求进入后续业务处理
- **AND** route 或 service MUST 保留细粒度参数校验与业务权限判断

### Requirement: 管理员级高成本接口必须额外限制为管理员能力
若高成本接口具备批量重生成、后台维护或其他敏感运维属性，系统 MUST 进一步限制为管理员能力，而不能仅依赖“已登录即可调用”。

#### Scenario: 普通已登录用户访问管理员级高成本接口
- **WHEN** 普通已登录用户请求批量音频重生成或其他管理员级高成本接口
- **THEN** 系统 MUST 在进入实际处理前直接拒绝请求
- **AND** 不得继续执行删除旧资源、触发外部服务或其他高成本操作

### Requirement: 受保护写接口必须在入口校验允许的请求来源
若接口同时属于受保护写接口，系统 MUST 在进入实际业务处理前验证请求来源符合允许的同源策略。

#### Scenario: 非同源来源调用受保护写接口
- **WHEN** 客户端从不被允许的跨站来源调用受保护写接口
- **THEN** 系统 MUST 在进入业务处理前拒绝请求
- **AND** 不得继续执行写入、模型调用或其他后续动作

### Requirement: 用户态私有数据必须同时具备服务层与数据库层边界
对已切换到用户上下文的用户态读写链路，系统 MUST 同时具备服务层访问边界与数据库层最小权限边界。若服务端通过 `createSupabaseServerClient` 或等效用户上下文访问学习进度、复习结果、短语保存、practice run 或 variant run 等用户私有数据，则对应数据库表 MUST 具备可说明、可审计的最小 RLS / SQL 配套，而不能只依赖服务层参数过滤。

#### Scenario: 用户态接口通过用户上下文读取或写入私有数据
- **WHEN** 用户态接口通过用户上下文访问学习、复习、短语或练习相关的用户私有表
- **THEN** 系统 MUST 有对应的数据库侧最小权限规则或等效 SQL 说明
- **AND** 这些规则 MUST 与服务层当前的用户身份边界保持一致

#### Scenario: 维护者新增用户上下文私有表读写链路
- **WHEN** 维护者新增一个通过用户上下文访问用户私有表的服务端读写链路
- **THEN** 必须能在稳定文档或审计文档中定位到对应的 RLS / SQL 映射或等效说明
- **AND** 若没有对应映射或说明，不得把该链路视为已完成边界收口

#### Scenario: 后台白名单入口继续使用高权限访问
- **WHEN** 系统保留共享 `phrases` 表、AI enrich 或其他后台任务的高权限入口
- **THEN** 系统 MUST 显式记录这些入口的用途、边界和回滚策略
- **AND** 这些入口 MUST 集中在显式后台 repo 或后台任务路径中
- **AND** 不得把这类高权限入口重新扩散回普通用户态服务路径

### Requirement: 登录后热路径不得重复执行可避免的认证查询
登录成功后的用户资料热路径 MUST 避免重复执行可合并的会话、用户或 profile 查询。系统 MUST 以单次用户识别结果驱动后续资料读取，而不是在同一请求内重复回源到认证层。

#### Scenario: 登录后请求当前用户资料
- **WHEN** 客户端在登录成功后请求当前用户资料接口
- **THEN** 系统 MUST 复用同一请求内已经获取的用户身份结果
- **AND** 不得在无必要时再次执行重复的认证查询

### Requirement: 公网注册入口必须受注册模式控制
系统 MUST 通过服务端注册入口统一执行注册模式判断。注册模式 MUST 支持 `closed`、`invite_only` 和 `open`；后台运行时配置优先于 `REGISTRATION_MODE` 环境变量，非法值、缺失值或读取失败 MUST 保守回退为 `closed`。

#### Scenario: 注册模式关闭
- **WHEN** 用户提交注册请求且有效注册模式为 `closed`
- **THEN** 系统 MUST 在创建 Supabase Auth 用户前拒绝注册
- **AND** 注册页 MUST 展示受控关闭文案

#### Scenario: 邀请注册
- **WHEN** 用户提交注册请求且有效注册模式为 `invite_only`
- **THEN** 系统 MUST 在服务端校验邀请码
- **AND** 邀请码 MUST 使用 hash 匹配，不落库明文
- **AND** 注册尝试 MUST 记录 email、状态、关联邀请码、auth user id 或失败原因

#### Scenario: 运行时配置缺失或读取失败
- **WHEN** 后台运行时注册模式缺失、非法或读取失败
- **THEN** 系统 MUST 回退到合法的 `REGISTRATION_MODE`
- **AND** 若 `REGISTRATION_MODE` 也缺失或非法，系统 MUST 视为 `closed`

### Requirement: 注册入口必须在创建账号前限制同一 IP 频率
系统 MUST 在服务端 `/api/auth/signup` 入口对同一客户端 IP 执行注册频控，并在 `invite_only` 或 `open` 模式下于邀请码校验和 Auth 注册前完成拦截。

#### Scenario: 同一 IP 在阈值内注册
- **WHEN** 同一客户端 IP 在注册频控窗口内提交注册请求且未超过阈值
- **THEN** 系统 MUST 允许请求继续进入后续注册流程
- **AND** 不得改变原有注册模式、邀请码或邮箱验证语义

#### Scenario: 同一 IP 超过注册阈值
- **WHEN** 同一客户端 IP 在窗口期内超过注册入口阈值
- **THEN** 系统 MUST 在邀请码校验和 Auth 注册前直接拒绝请求
- **AND** 不得继续执行邀请码扣减、attempt 写入或 Auth 注册

### Requirement: 注册必须支持邮箱验证码前置校验
系统 MUST 在允许注册的模式下支持注册邮箱验证码，并在创建 Supabase Auth 用户前完成服务端校验。验证码校验成功且账号创建成功后，系统 MUST 将该账号视为邮箱已验证，不得再依赖 Supabase Confirm email 作为进入主应用的第二道必需确认。

#### Scenario: 用户请求发送注册邮箱验证码
- **WHEN** 用户在注册页提交邮箱并请求验证码
- **THEN** 系统 MUST 在服务端生成短期有效验证码
- **AND** 验证码明文 MUST 不落库
- **AND** 系统 MUST 记录验证码 hash、过期时间、错误次数和消费状态

#### Scenario: 用户提交带邮箱验证码的注册请求
- **WHEN** 用户在 `invite_only` 或 `open` 模式下提交注册请求
- **THEN** 系统 MUST 在创建 Supabase Auth 用户前校验邮箱验证码
- **AND** 验证码 MUST 与注册邮箱一致
- **AND** 验证码 MUST 未过期、未消费且错误次数未超过上限
- **AND** Auth 用户创建成功后 MUST 满足邮箱已验证判定

#### Scenario: 用户提交错误或过期验证码
- **WHEN** 用户提交错误、过期、已消费或超出错误次数上限的验证码
- **THEN** 系统 MUST 返回受控失败
- **AND** 不得创建 Supabase Auth 用户
- **AND** 不得扣减邀请码使用次数

#### Scenario: 注册创建账号成功后消费验证码
- **WHEN** 邮箱验证码校验通过且 Supabase Auth 用户创建成功
- **THEN** 系统 MUST 将该验证码标记为已消费
- **AND** 同一验证码不得再次用于注册

### Requirement: 邮箱未验证用户不得进入主应用或高成本写入口
系统 MUST 在主应用页面入口与高成本/关键写 API 入口检查认证层邮箱验证状态。通过项目 6 位验证码成功注册的新账号 MUST 已满足该状态；未满足该状态的旧账号或异常账号仍 MUST 被阻止进入主应用。

#### Scenario: 邮箱未验证用户访问主应用页面
- **WHEN** 已登录但邮箱未验证的用户访问 `/today`、`/scenes`、`/scene`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson` 或 `/admin`
- **THEN** 系统 MUST 重定向到受控邮箱验证提示页
- **AND** 不得继续进入学习主链路页面

#### Scenario: 邮箱未验证用户调用受保护 API
- **WHEN** 已登录但邮箱未验证的用户调用受保护 API
- **THEN** 系统 MUST 返回受控 403 响应
- **AND** 不得触发模型、TTS 或学习数据写入

#### Scenario: 项目验证码注册成功用户访问主应用
- **WHEN** 用户通过项目 6 位验证码完成注册并登录
- **THEN** 系统 MUST 允许用户进入主应用
- **AND** 不得因为缺少 Supabase Confirm email 点击而重定向到 `/verify-email`

### Requirement: Admin 生成的邀请码必须沿用注册入口 hash 校验
系统 MUST 让 admin-only 后台生成的邀请码与现有 `invite_only` 注册入口使用同一套 normalize 与 hash 匹配规则。

#### Scenario: 用户使用管理员生成的邀请码注册
- **WHEN** 用户在 `invite_only` 模式下提交管理员生成的明文邀请码
- **THEN** 注册入口 MUST 按现有 hash 规则匹配 `registration_invite_codes.code_hash`
- **AND** 注册成功后 MUST 继续记录 `registration_invite_attempts` 并扣减 `used_count`

#### Scenario: 数据库保存管理员生成的邀请码
- **WHEN** 管理员生成邀请码
- **THEN** 数据库 MUST 只保存邀请码 hash
- **AND** 不得持久化明文邀请码
