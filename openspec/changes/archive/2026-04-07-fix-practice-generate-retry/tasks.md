# 任务清单

## Status

implemented

## 实施

- [x] 1. 为 scene 练习自动预热增加短时间连续失败熔断，连续三次失败后停止继续自动请求
- [x] 2. 调整 `/api/practice/generate`，让上游模型请求失败时也优先回退到本地出题
- [x] 3. 统一 practice generate 链路的中文错误文案，并区分最终失败与可恢复失败
- [x] 4. 为已有练习补一个手动重新生成入口，允许用户在不删除练习的前提下主动重生题目

## 验证

- [x] 5. 补充 `scene-detail-page` 回归测试，覆盖“删除练习后自动预热失败会展示中文错误”
- [x] 6. 补充 `scene-detail-page` 或相关交互测试，覆盖“已有练习时可手动重新生成”
- [x] 7. 补充 `practice generate` route 测试，覆盖“GLM 请求失败时回退到本地题目”
- [x] 8. 运行受影响测试与 `pnpm run text:check-mojibake`

## 文档

- [x] 9. 如实施后用户可感知行为发生变化，更新 `CHANGELOG.md`
- [ ] 10. 完成后按流程归档并同步主 specs
