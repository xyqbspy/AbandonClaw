## Why

Scene 主学习视图的循环播放、当前步骤、标题返回和训练进度入口分散在不同区域，首屏操作层级仍偏乱。需要把“当前要做什么”和“可辅助查看什么”重新排到同一个清晰结构里。

## What Changes

- 将循环播放按钮移动到当前步骤主 CTA 左侧，作为次级按钮并排展示，复用原有循环播放逻辑。
- 将 Scene 返回按钮和标题移动到当前下一步区域顶部，并增加默认折叠的展开按钮。
- 当前下一步区域默认折叠，只展示标题、返回、当前步骤和当前步骤操作；展开后展示辅助说明等更多信息。
- 将训练进度入口改为问号图标按钮点击打开面板，移除原先默认吸边的文本悬浮入口。
- 不改变音频循环播放逻辑、训练状态推导、写回、练习/变体生成或完成判定。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `learning-loop-overview`：Scene 主学习视图的标题、当前步骤、循环播放和训练进度入口层级需要进一步收口。

## Impact

- 影响页面组件：Scene 主学习视图、当前下一步任务条、训练进度入口、LessonReader 训练模式标题区。
- 影响测试：Scene detail regression、训练进度入口组件测试，必要时更新 LessonReader mock。
- 影响文档：`docs/feature-flows/scene-training-flow.md`、`openspec/specs/learning-loop-overview/spec.md`。
- 不影响 API、数据库、缓存、TTS 调度、学习写回或完成判定。
