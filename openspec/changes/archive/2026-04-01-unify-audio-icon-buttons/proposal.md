## Why

当前项目里的播放入口样式不一致：有的只有 icon，有的同时显示“朗读 / 播放 / 循环播放”等文字，还有的和翻译按钮并排时视觉重量明显不统一。同时，翻译入口也存在分裂：句子下面有翻译按钮，句子详情弹框里也还保留一层翻译按钮，用户需要重复点开才能看到同样的中文。

现在需要把前端阅读动作统一成一套更直接的规则：播放入口统一成纯 icon，除句子下方外的翻译按钮全部移除，句子详情直接展示中文翻译，同时把播放按钮统一放到句子右侧，和下方其他播放入口保持同一位置语言。

## What Changes

- 统一 `TtsActionButton`、`LoopActionButton` 及其上层使用方式，默认采用纯 icon 展示，不再在按钮正文里显示“朗读 / 播放 / 循环播放”等文字。
- 除句子下方保留的翻译按钮外，移除其他阅读详情中的翻译按钮；句子详情弹框和相关详情面板直接展示中文翻译，不再要求用户二次点击展开。
- 把句子详情里的播放按钮统一放到句子行右侧，与下方其它播放按钮的位置语言保持一致。
- 为受影响的 `lesson`、`selection detail`、`chunks` 等页面更新交互测试，改为基于无障碍名称和稳定选择器断言。
- 明确本次非目标：不改 TTS 播放逻辑、不调整翻译文案来源、不重做整套页面布局。

## Capabilities

### New Capabilities
- `audio-action-button-consistency`: 约束前端音频动作按钮的统一视觉形态、可访问名称，以及句子翻译/播放入口的展示规则。

### Modified Capabilities
- `audio-playback-orchestration`: 明确统一播放编排接入的按钮 UI 可以收敛为纯 icon，但不得丢失无障碍可识别名称。

## Impact

- 受影响公共组件：`src/components/audio/tts-action-button.tsx`、`src/components/audio/loop-action-button.tsx`
- 受影响页面与模块：`src/features/lesson/components/*`、`src/features/chunks/components/*`、`src/app/(app)/chunks/*` 等音频动作与句子详情入口
- 受影响测试：音频按钮相关交互测试、selection detail / sentence block / lesson reader 断言
- 不涉及服务端接口、数据库或缓存协议变更
