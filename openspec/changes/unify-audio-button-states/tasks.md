## 1. 公共音频按钮状态统一

- [x] 1.1 新增共享音频状态图标组件
- [x] 1.2 统一 `TtsActionButton` 的三态视觉与项目色
- [x] 1.3 统一 `LoopActionButton` 的状态视觉与项目色

## 2. 测试与文档

- [x] 2.1 新增公共音频按钮测试
- [x] 2.2 回归已有朗读入口测试
- [x] 2.3 更新 `CHANGELOG.md`

## 3. 验证

- [x] 3.1 执行 `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/tts-action-button.test.tsx" "src/components/audio/loop-action-button.test.tsx" "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- [x] 3.2 执行 `node --import tsx scripts/check-mojibake.ts`
- [x] 3.3 执行 `node_modules\.bin\openspec.CMD change validate "unify-audio-button-states" --strict --no-interactive`
