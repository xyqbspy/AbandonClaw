## Why

当前对话气泡下方操作区里的翻译图标和播放按钮虽然已经收紧过一轮，但视觉上仍然偏松。需要在现有基础上继续把两个按钮的水平间距再缩小一半左右。

## What Changes

- 继续收紧对话气泡下方操作区里翻译图标和播放按钮之间的水平间距。
- 继续收紧移动端分组气泡下方操作区里翻译图标和播放按钮之间的水平间距。
- 不改变按钮顺序、尺寸和翻译显隐逻辑。

## Impact

- 受影响文件：
  - `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
  - `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：否，仅进一步调整视觉间距
- 是否影响测试基线或回归范围：否
