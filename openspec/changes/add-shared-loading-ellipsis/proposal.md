## Why

当前项目里已经有 `LoadingContent / LoadingButton / LoadingOverlay / LoadingState` 这类公共 loading 基础，但文案仍然是静态字符串，例如“生成中...”或“进入场景中...”。用户在点击“重新生成题目”这类等待时间略长的动作时，缺少更明确、更统一的动态反馈。

这次希望把“正在生成中...”做成统一公共组件，并让 `...` 三个点按顺序轮流出现，避免每个页面各自拼接文案和动画。

## What Changes

- 新增一个公共 loading 文案组件，支持基础文本加动态省略号动画
- 让 `LoadingContent` 体系可以复用这套公共动态文案，而不是每处手写“生成中...”
- 先在 scene 练习“重新生成题目”这条链路接入统一 loading 展示，文案为“正在生成中”
- 为公共 loading 组件和 scene 练习入口补充测试

## Capabilities

### Modified Capabilities

- `component-library-governance`: 扩展共享 loading 组件能力，新增统一动态省略号文案
- `scene-practice-generation`: 练习重生成入口采用统一 loading 展示

## Impact

- 受影响代码：
  - `src/components/shared/action-loading.tsx`
  - `src/components/shared/action-loading.test.tsx`
  - `src/features/scene/components/scene-practice-view.tsx`
  - `src/features/scene/components/scene-practice-view.interaction.test.tsx`
- 受影响链路：
  - scene 练习页“重新生成题目”
