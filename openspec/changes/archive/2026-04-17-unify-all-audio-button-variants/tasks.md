## 1. 音频按钮样式继续收口

- [x] 1.1 修正 `audio-state-icon` 的 tts 波纹裁切
- [x] 1.2 将 `selection-detail-primitives` 接入统一音频状态图标
- [x] 1.3 更新 `CHANGELOG.md`

## 2. 验证

- [x] 2.1 执行 `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/tts-action-button.test.tsx" "src/components/audio/loop-action-button.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/chunks/components/example-sentence-cards.test.tsx"`
- [x] 2.2 执行 `node --import tsx scripts/check-mojibake.ts`
- [x] 2.3 执行 `node_modules\.bin\openspec.CMD change validate "unify-all-audio-button-variants" --strict --no-interactive`
