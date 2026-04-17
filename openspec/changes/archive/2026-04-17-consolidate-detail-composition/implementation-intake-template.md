# Detail 重构前检查模板

用于后续真正推进 `lesson detail` / `chunks detail` 结构收敛前的实施检查。

## 1. 本次准备动哪些文件

- `lesson` 侧：
- `chunks` 侧：
- 共享基元层：

## 2. 共享职责判断

- 这次要动的片段是否属于轻语义结构？
  - card
  - icon button
  - basic action
  - loading/detail block
- 如果是，是否适合进入共享基元？
- 如果不是，为什么应继续留在领域层？

## 3. 领域差异判断

- 这次改动是否涉及：
  - segmented tabs
  - related rows
  - cluster actions
  - focus-specific 状态组合
- 如果涉及，是否已经明确不会被误抽进共享层？

## 4. 完整链路检查

- 改动前的入口是什么？
- 改动后的用户路径是否变化？
- selection detail / focus detail / review action 是否仍然连续？
- footer、详情内容、相关操作之间会不会出现新的断层？

## 5. 测试检查

- 受影响的 interaction tests：
- 受影响的 selectors / logic tests：
- 是否需要新增覆盖共享基元边界的测试：

## 6. 实施后记录

- 是否更新 `tasks.md`
- 是否更新 `CHANGELOG.md`
- 是否需要追加新的 delta 或新 change
