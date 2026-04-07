任务清单

Status

completed

实施

- [x] 为 scene `cloze` 模块增加“至少 5 题、按句子数补足”的收口逻辑
- [x] 在 AI `chunk_cloze` 偏少时，用本地 chunk 挖空补齐可用题目
- [x] 放宽 `guided_recall` 最小句长阈值，并提高题量上限
- [x] 收紧 practice generate prompt，明确提高 `chunk_cloze` 覆盖优先级
- [x] 将 fallback 放宽为“必要时每句最多 2 个高价值 chunk”
- [x] 将 fallback 的高价值判断升级为优先短语动词 / 固定搭配 / 习语等表达信号

验证

- [x] 补充 `scene-detail-generation-logic.test.ts`，覆盖低题量补足逻辑
- [x] 补充 `scene-detail-actions.test.ts`，覆盖 5 词句子的半句复现与题量上限
- [x] 补充 `practice-generate-prompt.test.ts`，锁定 `chunk_cloze` 优先级提示
- [x] 补充 `spec-builder.test.ts`，覆盖 fallback 的双 chunk 选择与上限
- [x] 补充 `spec-builder.test.ts`，覆盖表达价值优先级
- [x] 执行最小相关测试与 `pnpm run text:check-mojibake`

文档

- [x] 更新 `docs/scene-practice-generation.md`
- [x] 更新 `CHANGELOG.md`
- [ ] 归档并同步主 specs / CHANGELOG
