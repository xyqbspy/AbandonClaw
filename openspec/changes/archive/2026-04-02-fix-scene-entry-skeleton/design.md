## Current Flow

当前入口：
- `chunks` 页里的“进入场景”按钮直接 `router.push(/scene/[slug])`
- `scenes` 页已有 `prefetchSceneDetail + router.prefetch` 的轻量预热
- `scene/[slug]` 页面服务端先执行 `requireCurrentProfile()`，然后渲染客户端详情页

当前处理链路：
- 路由切换期间，`src/app/(app)/scene/[slug]/loading.tsx` 返回 `null`
- 客户端详情页启动后，`useSceneDetailData` 在无 `initialLesson` 且无同步缓存时会先置 `sceneLoading = true`
- `scene-detail-page.tsx` 在 `sceneLoading` 时直接整页返回 `LoadingState`

当前回写 / 状态更新：
- 场景详情数据仍由现有缓存与网络回填机制负责，不改动学习状态、练习状态或变体状态语义

当前回退路径：
- 若缓存或网络失败，沿用现有 `loadErrorMessage` / not found / cache fallback 路径

## Problem

当前设计问题：
- 路由级 loading 为空，导致服务端等待和模块准备阶段直接暴露为空白
- 页内 loading 只有单行 spinner，无法提供稳定的页面结构感知
- `chunks -> scene` 缺少与 `scenes` 一致的预热动作，首次进入更容易命中空档

当前不稳定点 / 不一致点：
- `scenes` 页已有预热，`chunks` 页没有，导致同样是“进入场景”，不同入口体感不一致
- 路由级和页内 loading 各自独立，而且都没有骨架结构

## Decision

设计决策 1：
- 新增公共的 `SceneDetailSkeleton` 组件，尽量模拟场景详情的标题区、训练入口和正文块结构，供路由级 loading 与页内 loading 复用

设计决策 2：
- `src/app/(app)/scene/[slug]/loading.tsx` 直接渲染 `SceneDetailSkeleton`，避免路由等待期白屏

设计决策 3：
- `scene-detail-page.tsx` 在 `sceneLoading` 时改为渲染同一骨架组件，而不是只显示 spinner 文案

设计决策 4：
- `chunks/page.tsx` 复用 `scenes/use-scenes-page-data.ts` 现有思路：先 `router.prefetch`，再 fire-and-forget 调 `prefetchSceneDetail`，不阻塞用户点击

## Risks

风险 1：
- 若骨架体积过重，可能让 loading 视觉噪音过高
  - 控制方式：只保留首屏关键结构，不复制完整业务组件

风险 2：
- 给 `chunks` 加预热后，可能引入测试环境或弱网下的额外异步副作用
  - 控制方式：复用已有 `prefetchSceneDetail`，不新增新缓存层，也不等待预热完成再跳转

## Validation

验证方式：
- 补 `scene detail` 回归测试，确认无初始 lesson 时会先看到骨架再看到正文
- 补 `chunks` 入口测试，确认点击进入场景时会调用 `router.prefetch` 与 `prefetchSceneDetail`
- 跑 `scene detail` 与 `chunks` 相关 interaction test

回归范围：
- `chunks -> scene`
- `scenes -> scene`
- 直接打开 `/scene/[slug]`

未覆盖风险：
- 真实设备上的弱网观感仍需人工体验确认，但不影响自动化行为基线
