# 任务清单

## Status
step-5-complete

## Archive note

本 change 的早期 delta spec 仍使用 sentence-first 预热口径；后续 `scene-block-first-audio-priority` 已将主口径更新为 block-first，并已同步到主 spec。归档时不再把本 change 的旧 delta 同步进主 spec，避免覆盖当前 block-first 规范。

## Step 1: 浏览器侧预热任务模型
- [x] 1.1 新增 scene 音频预热任务结构，覆盖 `sentence` 和 `scene_full`
- [x] 1.2 支持任务去重、优先级更新、状态流转和默认并发限制
- [x] 1.3 将现有 scene 首屏 sentence / scene full 预热接入调度器
- [x] 1.4 补 scheduler 和 audio warmup 的最小测试

## Step 2: scene 页空闲增量预热
- [x] 2.1 增加页面稳定后的后续句子小批量入队
- [x] 2.2 增加页面可见性、高频交互和弱网降级策略

## Step 3: 播放驱动提权
- [x] 3.1 播放第 N 句时提升 N+1 ~ N+3 优先级
- [x] 3.2 在合适时提升 scene full 音频准备优先级

## Step 4: 最小 observability
- [x] 4.1 记录 sentence 播放 hit / miss
- [x] 4.2 记录 scene full ready / wait / fallback

## Step 5: 验收与文档
- [x] 5.1 补真实 scene 页验收清单
- [x] 5.2 更新音频链路文档和 dev-log
