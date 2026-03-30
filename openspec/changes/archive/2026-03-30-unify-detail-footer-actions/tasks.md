## 1. 统一 detail footer 行为

- [x] 1.1 抽出 `SelectionDetailActions`，减少 `selection-detail-sheet.tsx` 内联 footer UI
- [x] 1.2 对齐 `SelectionDetailSheet` 与 `FocusDetailSheet` 的 footer padding 基准为 `p-4`
- [x] 1.3 为 `加入复习` 增加 icon 表达

## 2. 补齐变更文档

- [x] 2.1 为这次 UI 一致性调整创建 OpenSpec change
- [x] 2.2 补齐 proposal、design、tasks 和 capability spec
- [x] 2.3 更新 `CHANGELOG.md`

## 3. 校验

- [x] 3.1 运行相关交互测试，确认 lesson/chunks detail 行为未回归
- [x] 3.2 校验 OpenSpec specs 可通过严格验证
