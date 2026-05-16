# 收紧 TTS 预热链路 P0/P1

## Why

上轮 cache + warmup 内存防护落地后，剩余的 TTS 预热架构问题：

1. **跨 scene 取消缺失**：用户离开 scene A 切到 scene B，A 排队的 warmup 任务和在飞 fetch 都不会被打断，浪费用户带宽
2. **失败任务无回退**：sentence/chunk 失败后下次入队直接 reset 重跑，没有节流，疑难内容会每次进 scene 都被反复请求
3. **服务端 signed URL 是进程内 Map**：PM2 cluster 模式下每个 worker 各自一份，命中率被打折
4. **推荐 scene 不预热**：Today 只 warm continueLearning 的 scene，3 个推荐 scene 点进去前都得现场加载
5. **Observability 缺失**：idle scheduler 因为页面 hidden / 用户在滚动 / 网络差而静默跳过轮次，没法在生产回答 warmup 实际命中率

不收口的话：流量浪费、failure-prone 内容反复打 msedge-tts、PM2 多 worker 优势没发挥、用户体验差异感不出来、出问题盲飞。

## What Changes

按依赖序：

1. **Observability**：scheduler 任务转折（loaded/failed/skipped）+ idle scheduler 跳过轮次都补 `recordClientEvent`，事件名 `warmup_*`
2. **Cross-scene cancel**：scheduler 加 `cancelWarmupsBySceneSlug(slug)` + `requestTtsUrl` 接 `AbortSignal`，scene 卸载时清理
3. **推荐 scene 预热**：Today 渲染完后对前 2-3 个推荐 scene 走 background 优先级 warm 第 1 句
4. **Redis signed URL 缓存**：服务端 `signedUrlCache` 从 in-memory Map 改 Upstash Redis，零配置 fallback 到内存
5. **Sentence/chunk cooldown**：把 scene_full 的 45s cooldown 机制泛化到 sentence/chunk，加指数回退（3 次失败 → 5min → 30min）

## Impact

**修改面：**
- `src/lib/utils/scene-audio-warmup-scheduler.ts`（事件 + cancel + cooldown）
- `src/lib/utils/tts-api.ts`（AbortSignal + cooldown 泛化）
- `src/lib/utils/resource-actions.ts`（idle 跳过事件）
- `src/lib/server/tts/service.ts`（Redis signed URL）
- `src/features/today/components/today-page-client.tsx`（推荐 scene 预热）
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`（unmount 清理）

**不改：**
- TTS 服务端合成本身（不动 msedge-tts 调用 / Supabase storage）
- 客户端 cache 层结构（URL Cache / Object URL pool / Browser Cache 不动）
- warmup 优先级语义（immediate/next-up/idle-warm/background）

**预期效果：**
- 切 scene 时旧任务能被打断，节省带宽
- 反复失败的内容不再每次进 scene 都重试
- 多 worker 共享 signed URL 缓存，命中率显著提升
- 推荐 scene 点进去前就已 warm，首次播放零等待
- 生产可观察 warmup 命中率与跳过原因
