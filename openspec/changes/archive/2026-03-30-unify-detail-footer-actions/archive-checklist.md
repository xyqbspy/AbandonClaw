# Archive Checklist

这份清单用于在归档 `unify-detail-footer-actions` 前做最后确认。

## 1. 实现确认

- [x] `SelectionDetailActions` 已作为独立动作组件承接 lesson detail footer
- [x] `SelectionDetailSheet` 已复用 `SelectionDetailActions`
- [x] `SelectionDetailSheet` 与 `FocusDetailSheet` footer padding 已统一为 `p-4`
- [x] `加入复习` 按钮已带 icon

## 2. 文档确认

- [x] `proposal.md` 已说明变更背景和影响范围
- [x] `design.md` 已说明基准、决策和风险
- [x] `tasks.md` 已更新完成状态
- [x] delta specs 已可被 OpenSpec 正确解析

## 3. 验证确认

- [x] 相关交互测试已执行
- [x] `pnpm run spec:validate` 已通过
- [x] `openspec change validate unify-detail-footer-actions --strict --no-interactive` 已通过

## 4. 归档前剩余判断

- [ ] 是否确认这次规则已经稳定，值得沉淀到长期 specs
- [ ] 是否没有继续挂在这条 change 上的后续 UI 调整
- [ ] 是否准备执行 `openspec archive unify-detail-footer-actions`
