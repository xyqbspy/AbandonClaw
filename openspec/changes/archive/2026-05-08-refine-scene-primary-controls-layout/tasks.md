## 1. Scene 当前任务区

- [x] 1.1 将返回、标题、当前步骤和当前步骤主 CTA 合并到当前下一步任务区。
- [x] 1.2 为任务区增加默认折叠状态和顶部右侧折叠按钮。
- [x] 1.3 将循环播放作为次级按钮放到当前步骤主 CTA 左侧，按钮文字为“循环播放”，图标在文字右侧。
- [x] 1.4 确认循环播放继续复用原有 `toggleSceneLoopPlayback` 逻辑。

## 2. 训练进度入口

- [x] 2.1 将 `SceneTrainingCoachFloatingEntry` 入口改为问号图标。
- [x] 2.2 移除默认吸边/拖拽文本入口，不改变展开后的进度面板内容。

## 3. 测试与文档

- [x] 3.1 更新 Scene detail regression，覆盖默认折叠、展开、循环播放按钮迁移和问号训练入口。
- [x] 3.2 更新训练进度入口组件测试。
- [x] 3.3 同步 `docs/feature-flows/scene-training-flow.md` 和 `openspec/specs/learning-loop-overview/spec.md`。
- [x] 3.4 更新 `docs/dev/dev-log.md`。
- [x] 3.5 运行最小相关测试、`tsc --noEmit`、OpenSpec validate、`text:check-mojibake`、`maintenance:check` 和 `git diff --check`。
- [x] 3.6 实现 Review，确认未改音频调度、训练状态、API、数据库、生成策略或完成判定。

