变更提案：统一音频按钮尺寸与页面表面色

## Status

draft

## Why

业务背景：
当前项目已经完成播放按钮的图标状态统一，但不同页面里按钮尺寸和按钮底色仍然没有完全收口。

当前问题：
- 句子气泡下方的播放按钮尺寸偏小，和左侧翻译 icon 不一致，动作区视觉重心失衡。
- 对话气泡场景下的播放按钮仍沿用偏白的背景或近似无表面色处理，和当前页面的气泡、辅助操作区颜色关系不协调。
- selection detail 的主句朗读按钮和相关短语朗读按钮仍停留在自定义封装上，尺寸、底色和状态表现没有完全接入公共按钮体系。
- 句子列表和非对话阅读卡片里仍有一批纯 icon 朗读按钮停留在旧的 `icon-sm + 纯文字色` 规格上，和已经统一过的详情区、气泡动作区存在层级落差。
- `chunks` 相关页面里还有一批纯 icon 朗读按钮保留了描边和独立底板，和当前已经收口到“贴背景层”的按钮风格不一致。
- `chunks list` 来源句朗读、`selection toolbar` 朗读，以及 `lesson reader` 头部 / 卡片里的循环与朗读入口仍各自保留不同的按钮层级和边框策略。
- 公共音频按钮虽然统一了图标语义，但还缺少按使用场景适配尺寸和表面色的明确规则。

用户价值：
- 提升句子气泡下方动作区的一致性，让翻译和播放入口更像同一组操作。
- 让播放按钮在不同页面里更贴合当前视觉上下文，减少突兀感。

## What Changes

- 调整句子气泡下方播放按钮尺寸，使其与同组翻译 icon 保持一致。
- 为音频按钮补充可复用的页面表面色适配方案，避免在浅色气泡动作区继续出现不协调的白底。
- 收口对话气泡下方动作区的翻译 / 播放按钮视觉规则，统一尺寸、圆角、前景色与背景色关系。
- 将 selection detail 的主句朗读和相关短语朗读按钮并入统一公共按钮组件，沿用同尺寸与同底色规则。
- 继续收口句子列表和非对话阅读卡片中的纯 icon 朗读按钮，让它们与已经统一的按钮规格保持一致。
- 继续收口 `chunks` 相关页面中仍然带描边和独立底板的纯 icon 朗读按钮，统一到贴合当前背景层的样式方向。
- 收口剩余头部 / 工具栏 / 列表中的纯 icon 音频按钮，让全站纯 icon 音频入口尽量共用同一套无边框、贴背景层的规则。

## Scope

### In Scope

- `lesson reader` 对话气泡下方动作区的播放按钮视觉调整
- `selection detail` 面板与弹层中的朗读按钮视觉统一
- `sentence block` 与非对话 `lesson reader` 里的纯 icon 朗读按钮视觉统一
- `chunks` 详情与例句卡片中的纯 icon 朗读按钮视觉统一
- 头部、工具栏与列表中的纯 icon 音频按钮视觉统一
- 公共音频按钮组件支持更一致的尺寸与场景色能力
- 与该变化直接相关的交互和回归测试更新

### Out of Scope

- 音频播放编排逻辑、缓存逻辑、预热逻辑调整
- 详情面板、chunks 页面等未受本轮明确要求的视觉重构
- 非音频动作按钮的大范围主题重做

## Impact

- 影响的规范：`audio-action-button-consistency`
- 影响的代码模块：
  - `src/components/audio/tts-action-button.tsx`
  - `src/components/audio/loop-action-button.tsx`
  - `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
  - `src/features/lesson/components/selection-detail-primitives.tsx`
  - `src/features/lesson/components/selection-detail-panel.tsx`
  - `src/features/lesson/components/selection-detail-sheet.tsx`
  - `src/features/lesson/components/sentence-block.tsx`
  - `src/features/lesson/components/lesson-reader.tsx`
  - `src/components/shared/example-sentence-cards.tsx`
  - `src/features/chunks/components/focus-detail-content.tsx`
  - `src/app/(app)/chunks/chunks-list-view.tsx`
  - `src/features/lesson/components/selection-toolbar.tsx`
  - `src/features/lesson/components/lesson-reader.tsx`
  - 相关交互测试
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：是
- 是否影响缓存策略：否
- 是否影响测试基线或回归范围：是
- 兼容性：向后兼容
- 风险点：
  - 公共按钮样式扩展后，其他已接入页面可能被连带影响
  - 移动端和桌面端的按钮尺寸若未限制好，可能导致点击区或对齐出现偏移
