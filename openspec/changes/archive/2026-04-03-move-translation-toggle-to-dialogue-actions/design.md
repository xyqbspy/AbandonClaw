## Current Flow

当前真实的对话气泡入口：
- `LessonReaderDialogueContent` 渲染对话气泡与气泡下方按钮区
- `LessonReaderMobileSections` 渲染移动端分组气泡与气泡下方按钮区
- 这两处都在播放按钮下方直接显示整段翻译

当前误改位置：
- `SentenceBlock` 被加上了图标化翻译按钮
- 但它没有接入当前用户正在看的对话气泡页面

## Problem

当前设计问题：
- 翻译图标出现在错误的组件层级
- 真实页面里的对话气泡翻译仍然默认展示，和用户目标不一致
- 气泡下方操作区目前只有播放按钮，没有为翻译保留独立入口

## Decision

设计决策 1：
- 回退 `SentenceBlock` 中新增的图标化翻译按钮，避免错误范围继续扩散

设计决策 2：
- 在 `LessonReaderDialogueContent` 与 `LessonReaderMobileSections` 的气泡下方操作区新增翻译图标
- 按钮顺序固定为“翻译在左，播放在右”

设计决策 3：
- 对话气泡翻译默认隐藏
- 点击图标后展开/收起对应 block / group 的翻译内容
- 图标不显示可见文字，但保留 `aria-label`

## Risks

风险 1：
- 回退 `SentenceBlock` 可能影响既有组件测试
  - 控制方式：同步更新 `sentence-block` 测试，只回退误加的 icon-only 行为

风险 2：
- 对话气泡和移动端分组气泡需要各自维护展开状态
  - 控制方式：按 block / group key 维护局部开关，保持实现简单直接

## Validation

验证方式：
- 验证 `LessonReader` 对话气泡默认不显示翻译
- 验证点击翻译图标后，气泡翻译能展开/收起
- 验证朗读按钮仍不会误打开详情
- 运行乱码检查与 OpenSpec 校验
