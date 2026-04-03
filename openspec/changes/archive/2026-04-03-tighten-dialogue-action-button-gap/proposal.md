## Why

当前对话气泡下方操作区里，翻译图标和播放按钮之间的间距偏大，两个按钮显得有些松散。用户希望把这两个按钮的水平间距缩小到当前的一半左右，让操作区更紧凑。

## What Changes

- 收紧 `lesson-reader` 对话气泡下方操作区的按钮间距。
- 收紧移动端分组气泡下方操作区的按钮间距。
- 不改变按钮顺序、翻译显隐行为或其它布局逻辑。

## Impact

- 受影响文件：
  - `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
  - `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：否，仅视觉间距调整
- 是否影响测试基线或回归范围：否，现有行为测试无需改动
