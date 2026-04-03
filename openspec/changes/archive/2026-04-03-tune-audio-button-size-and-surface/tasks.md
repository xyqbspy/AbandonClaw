任务清单

## Status

implemented

## 实施

- [x] 1. 为公共音频按钮补充适配页面动作区的尺寸与表面色样式能力
- [x] 2. 调整 `lesson-reader-dialogue-content` 中句子气泡下方翻译 / 播放按钮的尺寸、背景色和激活态颜色，使两者保持一致
- [x] 3. 确认该调整不会破坏已有播放状态语义、无障碍名称和点击行为

## 验证

- [x] 4. 补充或更新公共按钮与对话阅读器相关测试
- [x] 5. 执行受影响测试，验证默认态、播放中、加载中和翻译切换均正常
- [x] 6. 将 `selection detail` 的主句朗读与相关短语朗读按钮并入统一公共按钮组件，并收口尺寸与底色
- [x] 7. 更新 `selection detail` 相关测试，验证详情面板和详情弹层中的朗读按钮交互保持稳定
- [x] 8. 收口 `sentence block` 与非对话 `lesson reader` 中纯 icon 朗读按钮的尺寸与表面色规格
- [x] 9. 更新相关阅读器测试，验证这批按钮切换后交互保持稳定
- [x] 10. 收口 `chunks` 相关页面中仍带描边和独立底板的纯 icon 朗读按钮，统一到贴背景层的样式方向
- [x] 11. 更新 `chunks` 相关测试，验证例句卡片和 detail 顶部朗读入口交互保持稳定
- [x] 12. 收口 `chunks list`、`selection toolbar` 与 `lesson-reader` 头部 / 卡片里的剩余纯 icon 音频按钮样式
- [x] 13. 更新对应测试，验证剩余入口继续保持原有交互与可访问名称

## 文档

- [x] 14. 如实现通过审批并落地，更新根目录 `CHANGELOG.md`
- [x] 15. 如范围变化，先同步更新 proposal / design / tasks / specs
- [x] 16. 归档并同步主 specs / CHANGELOG
