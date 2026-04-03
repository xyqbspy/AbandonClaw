## Why

上一轮把翻译图标加到了 `SentenceBlock`，但这个组件当前并没有接到用户实际看到的对话气泡页面上，导致改动没有命中真实入口。用户真正需要的是：只在对话气泡下方按钮区提供翻译图标，并把它放在播放按钮左边；其它位置不需要新增这个图标入口。

这次要把翻译入口的范围收口到真实使用的对话气泡操作区，并回退掉误加到错误组件层级上的改动。

## What Changes

- 回退 `src/features/lesson/components/sentence-block.tsx` 中上一次误加的图标化翻译按钮调整。
- 仅在对话气泡下方的操作区新增翻译图标，位置固定在播放按钮左边。
- 对话气泡翻译默认隐藏，点击图标后展开/收起。
- 更新相关交互测试与 `CHANGELOG.md`。

## Impact

- 受影响文件：
  - `src/features/lesson/components/sentence-block.tsx`
  - `src/features/lesson/components/sentence-block.interaction.test.tsx`
  - `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
  - `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
  - `src/features/lesson/components/lesson-reader.interaction.test.tsx`
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：是
- 是否影响缓存策略：否
- 是否影响测试基线或回归范围：是，需要更新 lesson reader 与 sentence block 相关测试
