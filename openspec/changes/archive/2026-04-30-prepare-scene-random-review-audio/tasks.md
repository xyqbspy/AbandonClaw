## 1. scenes 复习播放

- [x] 1.1 为 scenes 复习播放增加 scene detail 缓存优先加载。
- [x] 1.2 为逐场景回退队列增加有界播放前准备。
- [x] 1.3 保留现有失败跳过与整轮失败停止提示。
- [x] 1.4 优先播放单个 loop scene review pack，失败时回退逐场景队列。
- [x] 1.5 review pack 组包时跳过单个详情加载失败的候选场景，并复用本轮已加载详情。

## 2. 规格与文档

- [x] 2.1 补充 audio playback orchestration 的随机复习准备规则。
- [x] 2.2 补充 review pack 后台播放规则。
- [x] 2.3 更新音频 TTS pipeline 文档。
- [x] 2.4 更新 review pack 文档边界。

## 3. 验证

- [x] 3.1 补充 cache-first 随机播放交互测试。
- [x] 3.2 运行上一版最小相关测试。
- [x] 3.3 补充 review pack 成功与失败回退测试。
- [x] 3.4 运行本轮最小相关测试。
- [x] 3.5 补充 review pack 候选场景局部失败仍可继续组包的测试。
