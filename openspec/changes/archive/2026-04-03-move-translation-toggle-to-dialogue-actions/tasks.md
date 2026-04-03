## 1. 回退误改

- [x] 1.1 回退 `sentence-block` 中误加的翻译图标调整
- [x] 1.2 更新 `sentence-block` 交互测试

## 2. 对话气泡翻译入口收口

- [x] 2.1 在 `lesson-reader-dialogue-content` 的按钮区新增翻译图标
- [x] 2.2 在 `lesson-reader-mobile-sections` 的按钮区新增翻译图标
- [x] 2.3 保持对话气泡翻译默认隐藏，点击图标展开/收起
- [x] 2.4 更新 `lesson-reader` 交互测试
- [x] 2.5 更新 `CHANGELOG.md`

## 3. 验证

- [x] 3.1 执行 `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- [x] 3.2 执行 `node --import tsx scripts/check-mojibake.ts`
- [x] 3.3 执行 `node_modules\.bin\openspec.CMD change validate "move-translation-toggle-to-dialogue-actions" --strict --no-interactive`
