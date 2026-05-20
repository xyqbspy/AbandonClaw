# AbandonClaw 技术方案总览

## 1. 文档目标

这份文档用于快速说明当前项目实际采用的技术方案、工程架构和已经落地的性能优化点。  
它不是详细实现文档，也不是产品说明，而是帮助团队或面试场景快速回答这些问题：

- 这个项目用什么技术栈搭起来的
- 前后端分别怎么组织
- 已经做了哪些性能优化和稳定性治理
- 哪些能力已经有，哪些还没有做成平台级

## 2. 适用场景

- 对外介绍项目技术栈
- 写简历、项目说明、技术答辩材料
- 新同学或 AI 快速建立技术认知
- 做后续架构演进前的现状盘点

## 3. 技术栈总览

### 3.1 前端框架与运行时

- `Next.js 16`
- `React 19`
- `TypeScript 5`
- App Router 目录结构

项目采用的是 `Next.js + React` 一体化全栈方案，页面、接口和服务端聚合逻辑都放在同一个仓库里，减少了前后端分仓后的联调成本。

### 3.2 UI 与样式体系

- `Tailwind CSS 4`
- `@base-ui/react`
- `shadcn`
- `vaul`
- `lucide-react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `tw-animate-css`
- `sonner`
- `next-themes`

当前 UI 体系是“Tailwind 原子样式 + 轻量组件库 + 本地业务组件”的组合，不是重型设计系统。  
项目里已经有统一的 `ui` 基础组件层、按业务拆分的 `features/*` 组件层，也有按子域收口的操作组件，例如 admin 的统一操作按钮。

主应用壳已经把顶部栏、移动端菜单和面包屑收口到 layout 层；页面内容区只负责当前页面主体，不再各自重复渲染位置说明。admin 子域也有独立的样式 helper 和操作按钮，避免后台页面继续复制不同的圆角、focus、cursor 和提交态样式。

### 3.3 后端与数据

- `Supabase`
- `@supabase/ssr`
- `@supabase/supabase-js`
- `Supabase Auth`
- `Supabase Database`
- `Supabase Storage`
- `supabase/sql` 迁移脚本管理数据库演进

项目的数据能力主要依赖 Supabase，既承担用户认证，也承担数据库与对象存储。  
当前已经不是“只靠前端本地状态”的模式，而是服务端维护学习、复习、短语资产和音频资源的完整闭环。

认证和公开注册也已经收口到服务端：注册页调用 `/api/auth/signup`，服务端统一处理注册模式、邀请码、注册邮箱验证码、注册 IP 频控和 Supabase Auth 创建账号；邮箱链接确认继续使用项目内 `/auth/callback` 处理 Supabase code，`/verify-email` 提供重发验证邮件入口。

### 3.4 AI 与音频能力

- `msedge-tts`
- 服务端 TTS 生成与存储链路
- AI 驱动的场景生成、解释、表达补全、相似表达等接口

音频和 AI 不是独立 demo，而是嵌进学习主链路里的基础能力。

### 3.5 测试与工程工具

- Node 原生 `--test`
- `tsx`
- `jsdom`
- `@testing-library/react`
- `@testing-library/user-event`
- `ESLint`
- `OpenSpec`
- `GitHub Actions` CI workflow（lint / mojibake / unit + scripts test / openspec validate / maintenance:check）
- `Sentry`（`@sentry/nextjs`，requestId 自动注入 + 5xx 自动 capture + CSP violation 上报）

项目没有上很重的测试平台，而是走“单元测试 + 交互测试 + 定向回归”的轻量方案，比较适合当前阶段快速迭代。CI 工作流已经在 PR 和 push 到 main 时跑全套护栏。

## 4. 架构组织方式

### 4.1 一体化全栈架构

项目整体是单仓全栈结构：

- `src/app`
  - 页面与 API 路由
- `src/features`
  - 业务视图与交互组件
- `src/components`
  - 公共 UI 与共享组件
- `src/lib/server`
  - 服务端业务逻辑、聚合逻辑、仓储与治理能力
- `src/lib/cache`
  - 前端缓存、预取与回填
- `supabase/sql`
  - 数据库迁移与策略声明

这套组织方式的特点是：

- 页面层尽量薄
- 复杂逻辑下沉到 `server / logic / controller / actions`
- 业务模块按 `scene / learning / review / phrases / tts` 分域

### 4.2 业务与数据分层

当前已经形成了比较明确的分层：

- 路由层：接请求、鉴权、参数解析、返回响应
- service 层：业务编排、状态推进、跨表聚合
- repository / repo 层：部分模块承担数据访问
- SQL 层：数据库结构、RLS、policy

这不是完全严格的 DDD 或重型分层，但已经不是把查询和业务逻辑都堆在 route 里的写法。

### 4.3 服务端主导状态闭环

学习进度、复习提交、短语沉淀、表达簇关系、练习运行态，都逐步收到了服务端维护。  
这意味着：

- 支持 session 恢复
- 支持 Today / Review / Progress 聚合
- 状态不是纯前端瞬时状态
- 更适合后续继续做推荐、回写和审计

### 4.4 代码组织治理与多轮拆分

项目把"页面薄层化"做成了一条可量化、可迭代的工程治理路径,不是一次性 refactor。每一轮拆分都按 OpenSpec change 走 proposal → tasks → spec delta → 实施 → 量化反馈 → 归档,关键文件 LoC 与减幅都进 spec 留档,给下一轮策略提供数据依据:

- `chunks/page.tsx`:**2368 行 → 2125 (r2, -243) → 2102 (r3, -23) → 2041 (r4, -67)**,共 4 轮拆分,每轮抽出 hook / view section / wrapper
- `scene-detail-page.tsx`:**1326 行 → 849 (r2, -36%)**,抽出 practice run lifecycle / generation prewarm / variant run lifecycle / view switch 4 块职责
- 量化反馈驱动策略迭代:r3 抽 4 个小 hook 只减 23 行,**关键发现**"装配回调 / 解构 / props 透传"开销与抽走代码量近似抵消;这一发现写进 r3 spec delta,r4 据此改抽**高 props-cost 子树**(ChunksListView wrapper),效率立刻提升 3 倍

页面拆分以外的代码组织治理:

- **组件分层规范化**(架构审计批次 A,commit `f96139c`):把 `src/features/*` 与 `src/components/shared` 边界重新对齐,消除跨 feature 直接 import
- **OpenSpec spec `feature-component-decomposition`** 已经为 chunks/scene/review 三个重入口建立了"必须按轮迭代 + 字节级 DOM 兼容 + 入口级回归测试不弱化"的硬约束,新拆分必须遵守
- **AI 协作自治边界**(`docs/dev/ai-token-efficiency-playbook.md` §1.0):明确 AI agent 在文档 / 代码 / spec 三层的自治边界,避免 AI 改动越界或为节省 token 跳过验证

这些治理项的目标不是把 LoC 降到某个魔法数字,而是建立"页面薄 → 复杂度下沉到 hook / section / logic → 入口级测试保护 → 多轮迭代降低单次风险"的可维护节奏。

## 5. 前端实现方案

### 5.1 页面组织

主要页面包括：

- `today`
- `scenes`
- `scene/[slug]`
- `chunks`
- `review`
- `progress`
- `admin`

其中 `scene/[slug]` 是学习主工作台，`chunks` 是表达资产工作台，`review` 是正式回忆训练入口。

### 5.2 组件组织

组件分层大致是：

- `src/components/ui`
  - 基础 UI primitive
- `src/components/shared`
  - 跨 feature 复用组件
- `src/components/audio`
  - 音频播放相关通用组件
- `src/features/*`
  - 按业务域组织的页面级组件

这让项目避免了“所有组件都堆在 pages 旁边”的混乱结构。

### 5.3 骨架屏与加载反馈

当前项目已经有明确的骨架屏实现，例如：

- `src/components/ui/skeleton.tsx`
- `src/app/(app)/scene/[slug]/loading.tsx`

也就是说，这个项目不是只靠转圈 loading，而是对核心页面提供了可感知的占位态。

最近一轮又补上了两类长等待反馈：

- 全局 route pending 蒙层：应用内链接跳转或表单提交等待超过短延迟时，会在 layout 层显示居中的加载反馈。
- admin server action 提交按钮：后台同步、停用/启用、更新权益、用户处置和表达补全等表单按钮统一用 `useFormStatus()` 显示处理中状态，避免慢请求下重复点击。

## 6. 已落地的性能优化点

## 6.1 前端缓存

当前已经有多层缓存，不只是一次性请求：

- Scene 列表缓存
- Scene 详情缓存
- Review 页面缓存
- 运行时内存缓存
- 音频 URL 缓存
- 浏览器 Cache Storage 音频缓存

这带来的收益是：

- 首屏更快回填
- 详情页重复进入更稳
- 音频重复播放明显减少网络请求

## 6.2 场景预取与资源预热

项目已经做了主动预取，而不是完全点开再加载：

- `scene` 列表页会做场景详情预取
- 预取成功后会顺手预热部分音频资源
- `today continue learning` 会在空闲时轻量预热
- Scene 详情页加载后会继续调度音频 warmup

当前预取有几个明显特征：

- 用 `requestIdleCallback` 或延迟调度，尽量避开主交互
- 弱网或省流量环境下会抑制重预热
- 有去重和最近窗口控制，避免反复重复拉取

## 6.3 音频缓存

音频链路是当前项目比较有特色的优化点，已经做成了多层缓存：

- 进程内签名 URL 缓存
- 浏览器内存 URL 缓存
- 浏览器 `Cache Storage` 持久缓存
- `blob:` URL 复用
- 预加载状态集合
- scenes 循环复习的 deterministic review pack，会让后台预准备、浏览器缓存和点击播放稳定指向同一份 scene full 资源；这里做的是 segments 级组包，不是 ffmpeg 式音频文件拼接

实际效果是：

- 相同 chunk / sentence / scene full 音频可以复用
- 第二次播放通常不需要重新命中远端生成接口
- 即使签名 URL 过期，浏览器本地持久缓存仍可继续复用
- 一组已学场景可以通过单个循环音频包持续播放，减少后台或锁屏时依赖页面 JS 切换下一段音频
- 用户可以查看本次循环包含的场景清单，避免把整体音频包误解成实时逐场景切换

## 6.4 音频预加载与预热

已经做的优化包括：

- 首次拿到音频 URL 后自动预加载
- 场景详情加载后预热前几句 sentence 和重点 chunk
- scenes 列表识别出合格场景后，会后台准备同日稳定 review pack，用户点击循环播放时优先命中同一资源
- 导入场景后可批量预热 TTS
- 弱网下对较重的 scene full 预热做抑制

这是“按资源重量分层预热”的思路，不是所有音频都一股脑全量拉取。

## 6.5 请求去重与幂等

服务端已经补了：

- 接口幂等 key
- 进行中请求复用
- 重复点击短时间结果复用

重点写接口如学习推进、复习提交、短语保存，已经不是完全裸奔状态。

## 6.6 限流与高成本接口保护

高成本接口已经接入统一限流与成本止损：

- 进程内限流
- `Upstash Redis` 可用时走共享限流
- 共享后端失败时自动 fallback 到本地内存限流
- 用户 + IP 双维度限流
- daily quota 和调用前预占
- 管理员可在后台临时关闭单个 high-cost capability

这块主要保护：

- 场景生成
- explain-selection
- practice generate
- tts
- scenes import

如果某个能力异常放大成本，系统会在 quota 预占或上游调用前拒绝请求，而不是等模型或 TTS 已经触发后再失败。

## 6.7 注册准入与邮箱验证闭环

公网注册相关能力已经形成服务端闭环：

- `closed / invite_only / open` 注册模式优先读取后台运行时配置，环境变量作为兜底。
- `invite_only` 通过 `registration_invite_codes` 的 hash 校验邀请码，明文不落库。
- 注册入口在邀请码校验和 Auth 注册前执行同一 IP 频控。
- 注册页通过 `/api/auth/signup/email-code` 发送 6 位邮箱验证码，服务端只保存 hash、过期、错误次数和消费状态。
- `/api/auth/signup` 在创建 Supabase Auth 用户前校验 `emailCode`，账号创建成功后消费验证码。
- Supabase Auth 注册时显式传入 `/auth/callback` 邮箱验证回跳地址。
- `/auth/callback` 使用 Supabase server client 交换 code 并写入 session cookie。
- `/verify-email` 支持重发 signup 验证邮件。
- middleware 基于 `email_confirmed_at / confirmed_at` 阻止未验证用户进入主应用或受保护 API。

这套方案已经自建注册验证码的最小闭环，但仍复用 Supabase Auth 作为账号体系和邮件链接确认兼容入口；本轮不做邮件投递监控、模板系统或复杂风控。

## 6.8 可观测性收口

接口层与运行时已经形成多入口可观测性：

- `requestId`：每个请求生成稳定 ID，贯穿 middleware、route、service 与错误响应
- 统一错误响应：`code / details / requestId` 结构稳定，前端可解析
- 基础结构化日志：`logServerEvent` / `logApiError` 自动注入 requestId + module + userId
- `Sentry`：`@sentry/nextjs` 在生产环境捕获 5xx 错误，自动附带 requestId tag，DSN 缺失时 SDK 退化为 no-op 不报错
- `[boot]` 启动自检：`instrumentation.ts` 在 Node runtime 启动时打印 10 个关键 env 的就绪状态（sentry / upstash / resend / email / origin / IP 限流 / daily quota / registration mode / CSP mode），不打印 secret 值，运维侧一眼可见是否漂移
- CSP violation 上报：`Content-Security-Policy-Report-Only` 已上，违规通过 `/api/csp-report` 收集并送 Sentry，观察期稳定后通过 `CSP_ENFORCE=true` env 一键切正式 enforce
- `/admin/observability`：本地浏览器回看最近业务事件与失败摘要
- `/admin/status`：实时观察 rateLimitBackend / todayHighCostUsage 等运行时状态
- `pnpm run usage:snapshot`：独立脚本入口，输出当日高成本能力用量快照（汇总 + 明细 + JSON 三段），可被 PM2 cron 调度采集
- TTS warmup 生命周期事件：`warmup_task_finished` / `warmup_task_promoted` / `warmup_task_reset` / `warmup_task_cancelled` / `warmup_idle_round_skipped` / `tts_request_cooling_down`，覆盖任务每一次状态转折和 idle scheduler 因 hidden / save-data-2g / playback-loading / interaction-recent 而 skip 的原因，能回答"预热到底有没有命中"

这样在排查问题时，已经可以把 middleware、route、service 串起来，而不是只看零散 `console.error`，并且生产环境出 5xx 时分钟级触发告警。

## 6.9 高成本资源失败回退与跨 worker 缓存共享

TTS / AI 这类高成本资源已经在限流之外补了"失败回退阶梯 + 跨 worker 缓存共享"两层保护:

- **跨场景 cancel**:用户从 scene A 切到 scene B 时,A 的排队任务会被 promoted 到 skipped,正在加载的任务通过 `AbortController.abort()` 中断;`requestTtsUrl` / `ensureSentenceAudio` / `ensureChunkAudio` / `ensureSceneFullAudio` 都接受 optional `AbortSignal`,避免后台空跑浪费带宽
- **sentence / chunk 失败 cooldown ladder**:失败次数对应 `[0, 5s, 60s, 300s, 1800s]` 冷却时间,疑难内容不会反复打上游 TTS;静默 30 分钟后视为新一轮,失败计数才重置;scene full 仍走自己的 45 秒独立路径,不混进通用 ladder
- **签名 URL 缓存跨 worker 共享**:`src/lib/server/tts/signed-url-cache.ts` 用 Upstash Redis 优先 + 内存 Map fallback,PM2 cluster 多 worker 部署时命中率不再被打折;Upstash 不可用时退化保持本地零配置;`pendingSignedUrlRequests` 仍保留为进程内短时去重
- **Today 推荐场景背景预热**:`today-page-client` 在 sceneList 加载完后,复用 `scene-prefetch.ts` 的 `scheduleScenePrefetch` 对前 2 个推荐 scene 发起 background warm;saveData / 2g 网络下自动跳过

这层设计的目标是:让"失败的高成本资源"既不重复打上游、也不阻塞后续请求,同时多 worker 部署不会让缓存收益缩水。

## 6.10 API 错误响应契约统一

最近一轮通过 `docs/dev/api-error-response-audit-2026-05-16.md` 对 58 个 API route + admin server actions 做了系统盘点,识别出 3 处 P0(响应契约破坏)+ 10 处 P1(高成本路径可观测性缺失),按 OpenSpec change `harden-api-error-response-consistency` 一次性收口:

- 全量 API 错误响应统一 `code + details + requestId` 三件套,前端可稳定解析错误结构
- `auth/logout` Supabase signOut 失败响应从 500 `INTERNAL_ERROR` 改 401 `AUTH_UNAUTHORIZED`,语义更准确(前端遇到这种错应该引导回登录,而不是上报后端故障)
- `auth/signup` GET 加 try/catch 保护;两端都通过 DI 注入 `getEffectiveRegistrationMode`,可测试性提升
- `csp-report` 早期返回(payload 异常)改 `throw new ValidationError(...)`,统一走外层 catch
- `auth/logout` 内部异常包装从 plain `Error` → `AuthError`,POST 改 `handleLogoutPost` 支持单测注入 Supabase factory
- 7 处高成本路径(scene/parse / scenes/import / scenes/[slug]/variants / phrases/manual-assist / expression-map/generate / phrases/similar/generate / phrases/similar/enrich)补 `logApiError(module, error, { request })` 注入 module 关联,事故后能按业务模块过滤,而不是只看一堆没有上下文的 5xx
- `similar/generate` / `scene/mutate` 等几处 plain `Error("Model output is not valid JSON.")` 改 `SceneParseError`,符合"受控失败类型映射表"
- spec delta ADD "高成本接口必须通过 logApiError 注入 module 关联";MODIFIED "未知服务端异常必须被错误追踪系统捕获"(补 `SceneParseError` / `AuthError` 包装约束 + 受控失败类型映射表)

这层契约统一对成功路径无影响,但显著提升了前端错误处理逻辑稳定性 + 后端事故定位速度 + Sentry 事件分桶能力。

## 7. 稳定性与安全治理

当前项目已经落地的治理项包括：

- middleware 保护页面与 API
- 服务端统一 requestId
- 统一错误响应
- 高成本接口限流
- 高成本 daily quota、预占和紧急开关
- 服务端受控注册、邀请码准入、邮箱验证码、邮箱验证闭环和注册 IP 频控
- 关键写接口幂等
- 受保护写接口 Origin 校验
- 账号状态降级：`disabled`、`generation_limited`、`readonly`
- 用户态表逐步切换到 `createSupabaseServerClient`
- 数据库侧已有主要用户态表的 RLS / policy 配套
- 错误聚合与告警:`@sentry/nextjs` 在生产捕获 5xx,自动注入 requestId tag
- 安全策略层:除最小安全头基线外,已上 `Content-Security-Policy-Report-Only` + `/api/csp-report` 收集 + 通过 `CSP_ENFORCE=true` env 一键切 enforce
- 启动期 env 自检:`instrumentation.ts` 启动时打印 `[boot]` 行,关键 env 漂移分钟级可见
- CI 工作流:GitHub Actions 在 PR 与 push 到 main 时跑 lint / mojibake / unit + scripts test / openspec validate / maintenance:check
- 合规占位:`/privacy` / `/terms` 占位页面 + 注册同意条款 checkbox
- 部署配置模板:`deploy/nginx.example.conf` + `proxy_common` + `deploy/README.md`,Nginx 反向代理 + 限流模板直接 cp 即用
- 灾备文档:`docs/dev/disaster-recovery.md` 备份策略 / RPO / RTO / 单表恢复步骤
- 事故响应剧本:`docs/dev/incident-response-runbook.md` 4 类事故剧本 + Nginx / WAF / Cloudflare 启用顺序
- API 错误响应契约一致:全量 API 错误响应统一 `code + details + requestId`,高成本路径补 `logApiError(module, error, { request })` 注入 module 关联(spec `api-operational-guardrails`)
- 生产稳定性诊断深度:线上 502 不是一次性 fix,而是分次定位到根因——Supabase 大 cookie 触发 Nginx 客户端请求头超限补 `large_client_header_buffers`、之后排查发现真正瓶颈在上游响应头方向补 `proxy_buffers` / `proxy_buffer_size`(`deploy/nginx.example.conf` + `deploy/proxy_common.example.conf`),诊断过程沉淀到 deploy 模板供二次复用

可以理解为:项目已经从“纯业务功能阶段”进入了“基础治理已落地”的阶段,可观测性、安全策略、CI、灾备与事故响应都已经形成最小可执行入口,但仍未走到完整平台化。

## 8. 典型技术方案

### 8.1 TTS 音频链路

完整链路大致是：

1. 服务端生成音频
2. 上传 Supabase Storage
3. 返回签名 URL
4. 客户端缓存 URL
5. 异步落到浏览器 Cache Storage
6. 后续优先走本地缓存播放

这条链路同时兼顾了：

- 首次可用
- 重复复用
- 弱网容错
- 后台预热
- 跨场景自动 cancel：用户切场景时,旧场景 queued 任务会被 promoted 到 skipped,loading 任务通过 `AbortController.abort()` 中断,避免后台空跑
- sentence / chunk 失败 cooldown ladder：失败次数对应 `[0, 5s, 60s, 300s, 1800s]` 阶梯,疑难内容不会反复打上游;scene full 走自己的 45 秒独立路径
- 签名 URL 缓存跨 worker 共享：服务端用 Upstash Redis 优先 + 内存 fallback,PM2 cluster 多 worker 命中率不打折
- scenes 循环复习后台播放：同日稳定 review pack 先把多个场景的 scene full segments 合并为一个 payload，再复用 scene full TTS 通道生成整体音频，播放开始后由单个 `<audio loop>` 持续承接

### 8.2 学习状态闭环

学习链路不是单纯页面交互，而是：

- start
- progress
- pause
- complete
- 聚合 overview / today / review

这让产品具备了真正的“可恢复、可回写、可聚合”能力。

### 8.3 表达资产化

短语与表达不是简单收藏，而是逐步形成：

- user phrases
- phrase relations
- expression clusters
- review signals

这套模型说明项目在数据设计上已经有“知识资产沉淀”的方向，不是一次性内容消费型页面。

## 9. 当前已经有的优化项清单

- `SSR + 服务端聚合`：减少纯前端拼装压力
- `前端缓存回填`：列表和详情页重复进入更快
- `空闲时预取`：减少主线程抢占
- `弱网感知`：降低重资源预热
- `骨架屏`：核心页面有明确占位态
- `全局路由等待反馈`：应用内跳转和表单提交慢时有统一 pending 蒙层
- `后台提交态`：admin server action 按钮使用统一处理中状态，避免重复提交
- `音频多层缓存`：内存 + Cache Storage + object URL 复用
- `音频预热`：scene、today、chunks 多入口触发
- `review pack 循环播放`：scenes 列表提前准备同日稳定场景音频包，减少后台播放对 JS 切歌的依赖
- `接口限流`：高成本接口防刷
- `注册准入`：服务端注册模式、邀请码、邮箱验证码、邮箱验证和 IP 频控
- `成本止损`：daily quota、调用前预占和 admin 高成本紧急开关
- `幂等去重`：重复写请求更稳
- `统一错误追踪`：requestId + logger + 统一错误结构
- `Origin 防护`：受保护写接口最小攻击防护
- `RLS 承接`：用户态表逐步回到数据库最小权限模型
- `错误聚合`：`@sentry/nextjs` 自动 capture 5xx + requestId tag
- `启动自检`：`instrumentation.ts` 启动期打印 `[boot]` 行,关键 env 漂移可见
- `CSP report-only`:`Content-Security-Policy-Report-Only` + `/api/csp-report` 收集 violation 送 Sentry,通过 `CSP_ENFORCE=true` env 一键切 enforce
- `CI 工作流`:GitHub Actions 在 PR / push main 跑全套护栏(lint / mojibake / unit + scripts test / openspec validate / maintenance:check)
- `用量快照脚本`:`pnpm run usage:snapshot` 输出当日高成本能力用量,可被 cron 调度
- `部署模板`:`deploy/nginx.example.conf` + `proxy_common` + 启用步骤文档,生产部署直接 cp 即用
- `API 错误响应契约一致`:全量 API 错误响应统一 `code + details + requestId`,高成本路径自动按 module 进入 Sentry
- `TTS 失败回退阶梯`:sentence / chunk 失败 `[0, 5s, 60s, 300s, 1800s]` 冷却 + 跨场景 cancel + Upstash Redis signed URL cache,避免反复打上游和 PM2 多 worker 命中率打折
- `代码组织治理`:chunks / scene-detail 等重入口走多轮 OpenSpec change 拆分,每轮 LoC 与减幅入 spec 留档,数据驱动下一轮策略(r3 -23 行 → r4 -67 行验证"高 props-cost 子树"策略效率高 3 倍)
- `AI 协作自治边界`:`docs/dev/ai-token-efficiency-playbook.md` 约束 AI agent 在文档 / 代码 / spec 三层的自治边界,避免改动越界或为节省 token 跳过验证

## 10. 当前边界与未做项

为了避免误判，这里也明确列出现状边界：

- 未看到重型状态管理库，当前以 React 状态与本地逻辑拆分为主
- 未看到完整的 Swagger / OpenAPI 平台化接入
- 未看到完整熔断体系
- 未看到 PWA / Service Worker 级离线架构
- 未看到全面的字段级加解密
- 安全头与 CSP 已经覆盖 report-only 与基础策略,但 CSP 仍处于观察期(尚未切 enforce);更高阶的跨源隔离、平台级 CSP 治理与全面环境化安全策略仍未平台化
- 公开注册已具备小范围试放的准入和处置基线,但完整 WAF、设备指纹、邮件投递监控、增长分析和运营审计后台仍未平台化
- 错误聚合 / 启动自检已就位,但全量 APM、跨设备业务事件聚合、retention 类用户结果指标尚未平台化
- 部署模板与灾备 / 事故剧本已成文,但实际生产环境的 Nginx 限流启用、灾备演练、WAF 接入仍依赖外部执行
- 多轮页面拆分已建立可迭代模式且每轮量化,但 `chunks/page.tsx` 仍 2041 行 / `scene-detail-page.tsx` 仍 849 行,r5 及之后的"高 props-cost 子树"候选(`<FocusDetailSheet>` 装配等)仍待按 OpenSpec change 推进

也就是说，这个项目的技术路线更偏“实用型全栈产品工程”，而不是“大而全的平台工程模板”。

## 11. 推荐用法

- 面向产品或业务同学介绍项目时，优先看 `product-overview.md`
- 面向技术现状盘点或架构介绍时，优先看这份 `technical-overview.md`
- 准备面试、简历表达或项目深挖追问时，继续看 `docs/meta/interview-project-deep-dive.md`
- 想深入音频链路时，继续看 `docs/system-design/audio-tts-pipeline.md`
- 想深入工程维护方式时，继续看 `docs/dev/project-maintenance-playbook.md`
- 想看上线策略与放行边界时，看 `docs/dev/release-readiness-assessment.md`
- 想看上线前执行清单与真实 HTTP baseline 时，看 `docs/dev/backend-release-readiness-checklist.md`
- 部署 Nginx 反向代理 + 限流模板时，看 `deploy/README.md`
- 想看灾备 / 事故响应剧本时，看 `docs/dev/disaster-recovery.md` 与 `docs/dev/incident-response-runbook.md`
- 想看 API 错误响应一致性盘点结果时，看 `docs/dev/api-error-response-audit-2026-05-16.md`
- 想看 AI 协作的 token 效率与自治边界约束时，看 `docs/dev/ai-token-efficiency-playbook.md`
- 想看页面拆分多轮策略与量化反馈时，看 `openspec/specs/feature-component-decomposition/spec.md` 与归档的 `decompose-chunks-page-r2 / r3 / r4` 及 `decompose-scene-detail-page-r2`

## 12. 与其他文档的关系

- `docs/meta/product-overview.md`
  - 讲产品定位、核心闭环和用户价值
- `docs/meta/technical-overview.md`
  - 讲技术栈、架构与优化实现
- `docs/meta/interview-project-deep-dive.md`
  - 讲面试可复述版本、架构取舍、技术亮点、追问回答和简历表达
- `docs/dev/project-maintenance-playbook.md`
  - 讲维护入口、模块边界与日常改动策略
- `docs/system-design/audio-tts-pipeline.md`
  - 讲音频生成、缓存、预热、播放的实现细节
- `docs/dev/release-readiness-assessment.md`
  - 上线策略、放行边界与平台运维缺口跟踪
- `docs/dev/backend-release-readiness-checklist.md`
  - 上线前执行清单与真实 HTTP baseline
- `deploy/README.md`
  - Nginx 反向代理 + 限流配置启用步骤
- `docs/dev/api-error-response-audit-2026-05-16.md`
  - 58 个 API route + admin server actions 的错误响应一致性盘点(已按 OpenSpec change `harden-api-error-response-consistency` 收口 P0+P1)
- `docs/dev/ai-token-efficiency-playbook.md`
  - AI 协作的 token 效率手册 + AI agent 在文档 / 代码 / spec 三层的自治边界约束
