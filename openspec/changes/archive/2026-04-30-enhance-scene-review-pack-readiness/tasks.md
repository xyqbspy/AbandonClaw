# 任务清单

## Status
draft

## 实施
- [x] 1. 新增每日稳定 review queue 排序，保证同日 pack key 与 payload 稳定。
- [x] 2. 导出统一弱网 / 省流量判断，并让 review pack 自动准备复用该判断。
- [x] 3. 增加 review pack 准备状态并在 scenes 按钮 title 暴露。
- [x] 4. 增加 review pack 准备、播放和回退的本地事件记录。

## 验证
- [x] 5. 更新 scenes interaction 测试，覆盖准备态、弱网跳过、事件记录和回退。
- [x] 6. 运行 scenes interaction 测试。
- [x] 7. 运行 scene loop TTS 测试。
- [x] 8. 运行 OpenSpec 校验和格式检查。

## 文档
- [x] 9. 更新 audio playback stable spec。
- [x] 10. 更新音频 TTS pipeline 文档。
- [x] 11. 更新 dev-log，并按用户可感知变化判断是否更新 CHANGELOG。

## 本轮不收
- [x] 12. 明确记录不做 Media Session、完整离线、服务端 pack API 和跨设备 BI。
