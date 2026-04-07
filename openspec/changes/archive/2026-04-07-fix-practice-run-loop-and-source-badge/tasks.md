# 任务清单

## Status

implemented

## 实施

- [x] 1. 为 scene 练习 run 启动补幂等保护，避免题目页重渲染时重复调用 `/practice/run`
- [x] 2. 为 `PracticeSet` 增加生成来源字段，并在 scene 练习生成链路中正确写入 `ai` / `system`
- [x] 3. 在题目页“来源场景”展示中增加 `系统生成 / AI生成` 提示

## 验证

- [x] 4. 补充题目页回归测试，覆盖“重新生成题目后不会持续重复调用 practice/run”
- [x] 5. 补充题目页展示测试，覆盖“来源场景展示系统生成 / AI生成提示”
- [x] 6. 运行受影响测试与 `pnpm run text:check-mojibake`

## 文档

- [x] 7. 如实施后用户可感知行为发生变化，更新 `CHANGELOG.md`
