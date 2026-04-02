## 1. 句子块交互调整

- [x] 1.1 将句子翻译切换按钮改为纯图标展示
- [x] 1.2 将翻译按钮移动到播放按钮左侧
- [x] 1.3 保持翻译默认隐藏与切换行为不变

## 2. 测试与文档同步

- [x] 2.1 更新 `src/features/lesson/components/sentence-block.interaction.test.tsx`
- [x] 2.2 更新 `CHANGELOG.md`

## 3. 验证

- [x] 3.1 执行 `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx"`
- [x] 3.2 执行 `node --import tsx scripts/check-mojibake.ts`
- [x] 3.3 执行 `node_modules\.bin\openspec.CMD change validate "adjust-sentence-translation-toggle" --strict --no-interactive`
