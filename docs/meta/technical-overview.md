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

项目没有上很重的测试平台，而是走“单元测试 + 交互测试 + 定向回归”的轻量方案，比较适合当前阶段快速迭代。

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
- scenes 循环复习的 deterministic review pack，会让后台预准备、浏览器缓存和点击播放稳定指向同一份 scene full 资源

实际效果是：

- 相同 chunk / sentence / scene full 音频可以复用
- 第二次播放通常不需要重新命中远端生成接口
- 即使签名 URL 过期，浏览器本地持久缓存仍可继续复用
- 一组已学场景可以通过单个循环音频包持续播放，减少后台或锁屏时依赖页面 JS 切换下一段音频

## 6.4 音频预加载与预热

已经做的优化包括：

- 首次拿到音频 URL 后自动预加载
- 场景详情加载后预热前几句 sentence 和重点 chunk
- scenes 列表识别出合格场景后，会后台准备固定顺序 review pack，用户点击循环播放时优先命中同一资源
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

高成本接口已经接入统一限流：

- 进程内限流
- `Upstash Redis` 可用时走共享限流
- 共享后端失败时自动 fallback 到本地内存限流

这块主要保护：

- 场景生成
- explain-selection
- practice generate
- tts
- scenes import

## 6.7 统一错误追踪

接口层已经补了：

- `requestId`
- 统一错误响应
- 基础结构化日志

这样在排查问题时，已经可以把 middleware、route、service 串起来，而不是只看零散 `console.error`。

## 7. 稳定性与安全治理

当前项目已经落地的治理项包括：

- middleware 保护页面与 API
- 服务端统一 requestId
- 统一错误响应
- 高成本接口限流
- 关键写接口幂等
- 受保护写接口 Origin 校验
- 用户态表逐步切换到 `createSupabaseServerClient`
- 数据库侧已有主要用户态表的 RLS / policy 配套

可以理解为：项目已经从“纯业务功能阶段”进入了“基础治理已落地”的阶段，但还没有走到完整平台化。

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
- scenes 循环复习后台播放：固定顺序 review pack 复用 scene full TTS 通道，在播放开始后由单个 `<audio loop>` 持续承接

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
- `音频多层缓存`：内存 + Cache Storage + object URL 复用
- `音频预热`：scene、today、chunks 多入口触发
- `review pack 循环播放`：scenes 列表提前准备固定顺序场景音频包，减少后台播放对 JS 切歌的依赖
- `接口限流`：高成本接口防刷
- `幂等去重`：重复写请求更稳
- `统一错误追踪`：requestId + logger + 统一错误结构
- `Origin 防护`：受保护写接口最小攻击防护
- `RLS 承接`：用户态表逐步回到数据库最小权限模型

## 10. 当前边界与未做项

为了避免误判，这里也明确列出现状边界：

- 未看到重型状态管理库，当前以 React 状态与本地逻辑拆分为主
- 未看到完整的 Swagger / OpenAPI 平台化接入
- 未看到完整熔断体系
- 未看到 PWA / Service Worker 级离线架构
- 未看到全面的字段级加解密
- 已补齐最小安全头基线，但 CSP、报告机制、跨源隔离与环境化安全策略仍未平台化

也就是说，这个项目的技术路线更偏“实用型全栈产品工程”，而不是“大而全的平台工程模板”。

## 11. 推荐用法

- 面向产品或业务同学介绍项目时，优先看 `product-overview.md`
- 面向技术面试或技术介绍时，优先看这份 `technical-overview.md`
- 想深入音频链路时，继续看 `docs/system-design/audio-tts-pipeline.md`
- 想深入工程维护方式时，继续看 `docs/dev/project-maintenance-playbook.md`

## 12. 与其他文档的关系

- `docs/meta/product-overview.md`
  - 讲产品定位、核心闭环和用户价值
- `docs/meta/technical-overview.md`
  - 讲技术栈、架构与优化实现
- `docs/dev/project-maintenance-playbook.md`
  - 讲维护入口、模块边界与日常改动策略
- `docs/system-design/audio-tts-pipeline.md`
  - 讲音频生成、缓存、预热、播放的实现细节

## 13. 面试与简历表达版

### 13.1 一句话介绍

这是一个基于 `Next.js 16 + React 19 + Supabase` 的英语学习全栈应用，我主要做了学习主链路、表达资产沉淀、TTS 音频链路，以及接口层的限流、幂等、权限边界和请求追踪等工程化治理。

### 13.2 30 秒技术介绍

项目采用单仓全栈架构，前端是 `Next.js App Router + React 19 + Tailwind CSS 4`，后端能力主要基于 `Supabase Auth / Database / Storage`。  
在业务上，它不是普通内容展示站，而是围绕 `Today -> Scene -> Chunks -> Review -> Progress` 做完整学习闭环。  
在技术上，我重点做了场景预取、音频多层缓存、空闲预热、接口限流、幂等去重、统一错误追踪，以及把用户态数据逐步收回到 `RLS` 承接的最小权限模型里。

### 13.3 简历版项目描述

- 基于 `Next.js 16`、`React 19`、`TypeScript`、`Supabase` 搭建单仓全栈英语学习系统，覆盖 Today、场景学习、表达资产、复习与进度聚合等核心模块。
- 设计并落地服务端主导的学习状态闭环，支持学习进度回写、session 恢复、Review 信号沉淀和 Progress 聚合。
- 实现 TTS 音频生成、Storage 持久化、浏览器 Cache Storage 缓存、空闲预热、review pack 循环播放与播放兜底，降低重复请求与二次播放延迟。
- 完成接口层治理基线建设，包括 `requestId` 追踪、统一错误响应、高成本接口限流、关键写接口幂等、Origin 校验与用户态数据权限边界收紧。

### 13.4 简历版优化点

- 通过场景预取、列表/详情缓存回填和空闲时资源预热，优化场景进入速度与重复访问体验。
- 通过音频 URL 缓存、浏览器持久缓存、`blob` URL 复用和固定顺序 review pack，减少 TTS 重复生成、远端请求和后台播放切歌依赖。
- 通过共享限流、幂等去重和统一日志追踪，提升高成本 AI 接口的稳定性与可排障性。
- 通过用户态查询与写入逐步切换到 `createSupabaseServerClient + RLS`，提升后端最小权限边界与安全纵深。

### 13.5 面试问答版

如果面试官问“这个项目的技术亮点是什么”，可以直接答：

1. 不是简单的 React 页面项目，而是 `Next.js + Supabase` 的一体化全栈应用，业务闭环完整。
2. 学习链路不是纯前端状态，而是服务端维护 start、progress、pause、complete 和 review 回写，能支撑恢复与聚合。
3. 音频链路做得比较完整，包含服务端生成、Storage 落地、浏览器缓存、预热、review pack 循环播放和播放 fallback，不是一次性请求。
4. 后端接口已经做了基础治理，包括限流、幂等、Origin 校验、requestId、统一异常和 RLS 承接。

如果面试官问“你做的最工程化的一块是什么”，可以优先讲：

- `TTS 音频链路`
- `接口治理与权限边界收紧`
- `学习状态闭环与服务端聚合`

### 13.6 更偏 AI 产品工程师的表达

如果你要投 `AI 产品工程师 / AI 应用工程师`，可以优先强调这个版本：

- 围绕英语学习场景，把 AI 能力嵌入到内容生成、表达解释、表达补全、相似表达发现和 TTS 音频生成中，而不是做孤立的模型调用 demo。
- 在产品工程层面，把 AI 输出接入可持续使用的学习闭环，包括表达资产沉淀、Review 回写、Today 聚合与继续学习路径。
- 在工程治理层面，对高成本 AI 接口补齐限流、幂等、统一错误追踪和最小压测基线，控制成本并提高稳定性。

### 13.7 可直接复用的结尾句

- 这个项目的重点不是单点 AI 能力，而是把 AI、学习状态、表达资产和复习回写串成了可持续运行的产品闭环。
- 我做的不只是页面开发，还包括后端接口治理、数据权限边界、缓存策略和可观测性这些偏工程化的能力。

## 14. 招聘平台投递版

### 14.1 BOSS / 拉勾风格短版

负责基于 `Next.js 16 + React 19 + Supabase` 搭建英语学习全栈应用，围绕 `Today -> Scene -> Chunks -> Review -> Progress` 建立完整学习闭环。  
主导学习状态回写、表达资产沉淀、TTS 音频链路和后端接口治理，落地了场景预取、音频多层缓存、空闲预热、接口限流、幂等去重、统一错误追踪和基于 `RLS` 的用户态数据权限边界收紧。

### 14.2 招聘平台两段版

基于 `Next.js App Router`、`React 19`、`TypeScript`、`Supabase` 搭建单仓全栈英语学习系统，覆盖 Today 推荐入口、场景学习、表达资产管理、复习训练和进度聚合等核心模块。项目采用服务端主导的学习状态闭环，支持学习进度回写、session 恢复、Review 信号沉淀和 Progress 聚合。

负责性能与稳定性优化，包括场景详情预取、前端缓存回填、TTS 音频生成与 Storage 持久化、浏览器 Cache Storage 缓存、空闲预热、接口限流、幂等去重、统一错误响应与 requestId 追踪，并将关键用户态读写逐步切换到 `createSupabaseServerClient + RLS`，提升最小权限边界和接口可治理性。

### 14.3 更强调结果的版本

- 搭建 `Next.js + Supabase` 单仓全栈学习系统，形成 Today、Scene、Chunks、Review、Progress 的完整业务闭环。
- 实现服务端学习状态管理，支持进度回写、恢复继续学习、复习信号沉淀和长期概览聚合。
- 设计并落地 TTS 音频链路，覆盖服务端生成、Storage 缓存、浏览器持久缓存、空闲预热和播放兜底。
- 补齐接口治理基线，包括高成本接口限流、关键写接口幂等、Origin 校验、requestId 追踪和统一异常处理。
- 推进用户态数据访问回归 `RLS` 承接，减少 `service role` 在主链路中的直接暴露。

### 14.4 更偏 AI 应用工程师的版本

基于真实英语学习场景，把 AI 能力接入场景生成、表达解释、表达补全、相似表达发现和 TTS 音频生成，不做孤立的模型调用 demo，而是把 AI 输出接到可持续使用的学习闭环里。  
同时补齐高成本 AI 接口的限流、幂等、统一追踪和最小压测基线，兼顾体验、成本和稳定性。

### 14.5 适合直接放简历的 3 条 bullet

- 基于 `Next.js 16`、`React 19`、`TypeScript`、`Supabase` 搭建单仓全栈英语学习应用，完成 Today、场景学习、表达资产、复习与进度聚合等核心模块建设。
- 设计并实现 TTS 音频链路与性能优化体系，覆盖场景预取、前端缓存回填、浏览器音频持久缓存、空闲预热、review pack 循环播放和播放 fallback。
- 建设后端接口治理基线，落地高成本接口限流、关键写接口幂等、统一错误追踪、Origin 校验与用户态数据权限边界收紧。

### 14.6 适合口头自我介绍的版本

我这个项目比较偏全栈产品工程，不只是做页面，而是把学习主链路、表达资产、AI 能力和后端治理一起做了。前端用的是 `Next.js 16 + React 19`，后端主要依赖 `Supabase`。我自己做得比较重的部分，一块是 TTS 音频链路和缓存预热，一块是学习状态闭环和接口治理，比如限流、幂等、requestId、RLS 权限边界这些。
