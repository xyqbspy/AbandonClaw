## Status

completed

## 1. 缓存治理设计

- [x] 1.1 盘点 `tts-api.ts` 中内存缓存、Blob URL 缓存与 Cache Storage 的当前增长点
- [x] 1.2 明确浏览器端 TTS 缓存的条目上限、体积上限与裁剪顺序
- [x] 1.3 明确裁剪失败时的非阻塞策略与日志边界

## 2. 预热去重收口

- [x] 2.1 盘点 `scene detail`、`scene prefetch`、`today continue`、`chunks` 的音频预热 key 现状
- [x] 2.2 抽出共享的 lesson / chunk 预热 key 规则
- [x] 2.3 接入各入口并确认不会吞掉局部交互预热

## 3. 实现与测试

- [x] 3.1 为 `tts-api.ts` 增加浏览器端缓存裁剪逻辑
- [x] 3.2 为 `resource-actions.ts` 等入口接入统一预热 key
- [x] 3.3 补充 `tts-api`、预热调度与相关入口测试
- [x] 3.4 执行受影响测试并记录结果

## 4. 文档

- [x] 4.1 更新 `docs/audio-tts-pipeline.md`，写清新的缓存治理规则
- [x] 4.2 更新 `CHANGELOG.md`
