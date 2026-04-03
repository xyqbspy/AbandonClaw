设计说明：统一音频按钮尺寸与页面表面色

## Status

draft

## Current Flow

当前入口：
- `lesson-reader-dialogue-content` 在对话气泡下方渲染翻译按钮和 `TtsActionButton`
- `selection-detail-primitives` / `selection-detail-panel` / `selection-detail-sheet` 仍保留自定义 `SelectionAudioButton`
- `sentence-block` 与非对话 `lesson-reader` 里的句子 / 段落朗读入口仍使用旧的纯文字色小号 icon 按钮
- `chunks` 的例句卡片和 detail 顶部朗读入口仍保留描边与独立底板
- `chunks list` 来源句朗读、`selection toolbar` 朗读和 `lesson-reader` 头部 / 卡片里的循环与朗读入口仍保留各自分裂的图层样式

当前处理链路：
- 翻译按钮直接使用原生 `button` + `Languages`
- 气泡下方播放按钮使用 `TtsActionButton`
- selection detail 里的播放按钮仍是 `SelectionAudioButton` + `AudioStateIcon`
- 句子列表与非对话阅读块虽然已接 `TtsActionButton`，但仍停留在较小尺寸与无表面色方案
- `chunks` 里多处纯 icon 朗读按钮虽然已经接 `TtsActionButton`，但 className 仍把按钮做成一颗独立凸起的胶囊
- 头部和工具栏里的循环 / 朗读按钮虽然都走公共组件，但边框、底板和尺寸层级并未和当前统一方向完全收口
- 两条链路分别维护尺寸、颜色和 hover 样式

当前回写 / 状态更新：
- 点击翻译按钮只切换本地 `translationOpen`
- 点击播放按钮走既有 `playBlockTts` 和统一 TTS 播放状态

当前回退路径：
- 播放失败仍由现有公共播放链路处理
- 本次仅调整视觉，不改变失败兜底行为

## Problem

当前设计问题：
- 动作区内翻译和播放按钮的视觉规格不一致，用户会感知成不同层级的控件
- 播放按钮的表面色没有融入对话气泡页面语义，导致按钮从动作区里“跳出来”
- selection detail 继续保留自定义音频按钮，导致统一按钮规则无法自然覆盖到详情主句和相关短语
- 句子列表和非对话阅读块里的朗读按钮尺寸偏小，和已统一的动作按钮规格不在一个层级
- `chunks` 里仍有描边底板式按钮，和气泡动作区现在已经确认的“无边框、贴背景层”方向冲突
- 同一个页面里头部、列表、详情、气泡如果继续混用不同的按钮层级，会让“统一播放按钮”继续停留在局部成立

当前不稳定点 / 不一致点：
- 公共音频按钮以文本色驱动为主，缺少场景化按钮表面色能力
- 页面只能局部覆盖 `className`，导致同类按钮在不同区域很容易继续分裂

## Decision

设计决策1：
- 保持 `TtsActionButton` / `LoopActionButton` 作为统一入口，不再回退到页面自定义音频按钮

设计决策2：
- 为公共音频按钮补充更明确的尺寸和表面色扩展能力，让页面可以声明“当前按钮属于哪种视觉表面”，而不是仅覆写零散文本色

设计决策3：
- 对话气泡下方动作区里的翻译按钮和播放按钮保持同尺寸点击区、同圆角、同背景层级
- 默认态使用当前页面的辅助动作底色
- 激活态 / 加载态在保持统一播放主色语义的同时，仍与动作区背景协调，不再出现突兀白底

设计决策4：
- 将 selection detail 的主句朗读按钮和相关短语朗读按钮切回公共 `TtsActionButton`
- 保留 selection detail 现有布局与交互，只替换按钮实现和尺寸 / 表面色规则

设计决策5：
- 将句子列表和非对话阅读块中的纯 icon 朗读按钮升级到与当前统一方案一致的尺寸与软表面按钮规格
- 仍保留带文本的工具栏/头部按钮形态，避免把本轮范围扩成所有音频按钮都必须去文字化

设计决策6：
- 将 `chunks` 中仍然偏凸的纯 icon 朗读按钮改为无边框、贴合当前背景层的方案
- 带文本的朗读按钮或工具条按钮暂不纳入这轮统一，避免误伤信息密度更高的组合操作区

设计决策7：
- 将 `chunks list` 来源句朗读、`selection toolbar` 朗读，以及 `lesson-reader` 头部 / 卡片里的纯 icon 音频按钮继续收口为统一背景层规则
- 若某处按钮仍承担工具栏文案编排职责，则保留其信息结构，但纯 icon 视觉层不再额外凸起

## Risks

风险1：
- 如果公共按钮新增样式参数定义过重，后续容易形成另一套松散变体

风险2：
- 如果页面局部色值写死，后续换主题或调整设计 token 时维护成本会上升

## Validation

验证方式：
- 手动检查句子气泡下方翻译与播放按钮是否同尺寸、同背景层级、同对齐
- 验证播放中 / 加载中 / 默认态下按钮颜色是否仍可区分
- 运行受影响的按钮与阅读器交互测试

回归范围：
- `lesson-reader-dialogue-content`
- `lesson-reader`
- `tts-action-button`
- `selection-detail-panel`
- `selection-detail-sheet`
- `sentence-block`
- `focus-detail-content`
- `example-sentence-cards`
- `chunks-list-view`
- `selection-toolbar`

未覆盖风险：
- 其余页面如果后续也想使用同类表面色，还需要再决定是否抽成更通用的 token
