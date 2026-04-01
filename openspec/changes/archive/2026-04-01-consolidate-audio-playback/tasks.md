## 1. 公共播放编排层

- [x] 1.1 新增统一的 TTS 播放 controller/hook，封装播放、停止、循环、激活态、loading 态和错误兜底
- [x] 1.2 复用现有 `tts-api`、`use-tts-playback-state` 与 key helper，确保公共层不派生新的等价播放/预热 key

## 2. 页面迁移

- [x] 2.1 迁移 `src/features/lesson/components/lesson-reader.tsx` 的 TTS 播放编排到公共层，只保留页面特化 payload 和业务副作用
- [x] 2.2 迁移 `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts` 的 TTS 播放编排到公共层，并保持既有局部预热与 chunk 详情行为
- [x] 2.3 迁移 `src/app/(app)/chunks/page.tsx` 的发音播放逻辑到公共层，保持当前交互和提示语义

## 3. 验证与文档

- [x] 3.1 为公共播放编排层补充纯逻辑或 hook 级测试，覆盖再次点按停止、loop 清理和错误兜底
- [x] 3.2 更新受影响页面的交互/回归测试，确认 `lesson`、`scene detail`、`chunks` 在迁移后行为保持一致
- [x] 3.3 更新 `docs/audio-tts-pipeline.md` 与根目录 `CHANGELOG.md`，记录公共播放编排层的职责边界、接入方式、影响范围与验证情况
