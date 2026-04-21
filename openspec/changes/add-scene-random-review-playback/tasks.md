# 任务清单

## Status
approved

## 实施
- [x] 增加 scene full 单次播放能力，保留现有单场景 loop 行为不变
- [x] 在 `scenes` 页面派生 `progressPercent >= 60` 的播放队列
- [x] 新增随机复习播放入口与播放/停止状态
- [x] 播放前按需拉取场景详情并组装 scene full segments
- [x] 处理无可播场景、场景无内容、详情失败和音频失败的最小提示/跳过
- [x] 收口随机播放与完整场景循环播放的按钮视觉一致性
- [x] 完成本轮已识别稳定性缺口的最小必要收口
- [x] 明确记录本轮不收项、延期原因与风险去向

## 验证
- [x] 补 `scenes` 页面随机复习播放交互测试
- [x] 补 TTS scene full 单次播放测试
- [x] 补随机播放与循环播放白底圆按钮、播放中旋转图标测试
- [x] 运行最小相关测试
- [x] 检查本轮未收口项是否已记录原因与风险

## 文档
- [x] 更新 `docs/feature-flows/scene-entry.md`
- [x] 更新 `docs/system-design/audio-tts-pipeline.md`
- [x] 更新 `docs/dev/dev-log.md`
- [x] 本轮不更新正式 `CHANGELOG.md`，除非后续明确进入完成态收尾并将直接进入 `main`
