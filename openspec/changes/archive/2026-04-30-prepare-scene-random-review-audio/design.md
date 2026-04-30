## 设计

### 场景详情加载

随机复习播放使用专用的缓存优先 loader：

1. 归一化 scene slug。
2. 读取 `getSceneCache(slug)`。
3. 命中有效记录时直接返回缓存 `Lesson`。
4. 未命中时请求 `getSceneDetailBySlugFromApi(slug)`。
5. 网络成功后异步写回 `setSceneCache(slug, lesson)`。

这样可以和 scene 入口、continue-learning 预热保持一致，不再把网络详情请求当成唯一来源。

### Review pack 主路径

随机复习播放优先尝试一个长音频包：

1. 从当前播放起点开始，取少量合格场景。
2. 每个场景通过缓存优先 loader 获取 lesson，并在本轮播放内存中复用已加载详情。
3. 用 `buildSceneFullSegmentsFromLesson()` 组装每个 lesson 的 scene full segments。
4. 把 segments 合并成一个 review pack payload。
5. 复用现有 scene full TTS 通道播放这个 pack，并开启 loop。
6. 如果 pack 生成或播放失败，回退到逐场景队列。

单个候选场景详情加载失败时，review pack 会跳过该候选并继续使用其他已加载场景组包；只有所有候选都无法提供可播放片段时，才进入回退队列。

这样一旦 pack 开始播放，浏览器只需要持续播放同一个音频资源，不再依赖每个场景结束后的 `onended -> 切 src -> play()`。

### 回退队列

review pack 失败时继续使用逐场景播放队列：

- 当前场景和后续少量候选场景会提前准备。
- 准备内容包括 scene detail cache、scene full segments 和 scene full 音频缓存。
- 某个场景失败时跳过，整轮都失败才停止并提示。

### 后台边界

review pack 是本轮后台播放优化的主路径。它不等于完整离线能力：首次生成 pack 仍可能需要联网，浏览器对“启动音频”的限制仍然存在。但 pack 一旦开始播放，后续连续播放不再需要页面 JS 切换下一段场景音频。

## 稳定性收口

### 本轮收口

- 随机复习播放不再把网络详情 fetch 当成唯一来源。
- 回退队列中的 scene full 音频可提前准备。
- 复习播放优先使用单个 loop review pack，减少后台 JS 切歌依赖。
- review pack 组包和回退队列复用本轮已加载详情，减少重复请求。
- 测试覆盖 cache-first、pack 成功、pack 失败回退。

### 延后项

- 完整离线 / Service Worker 协调。
- Media Session 集成。
- scene full 到逐句 / block 串播的降级。
- 专用服务端音频包 API 或 ffmpeg 拼接。

这些项会改变更大的平台行为，后续单独评估。
