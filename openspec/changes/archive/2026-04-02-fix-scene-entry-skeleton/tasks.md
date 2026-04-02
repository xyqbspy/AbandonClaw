## 1. 场景进入骨架

- [x] 1.1 新增可复用的 `scene detail` 骨架组件，并替换 `scene/[slug]` 路由级空 loading。
- [x] 1.2 调整 `scene-detail-page` 的 `sceneLoading` 分支，改为结构化骨架展示。

## 2. 入口预热一致性

- [x] 2.1 对齐 `chunks -> scene` 的进入链路，补充与 `scenes` 页一致的轻量预热。

## 3. 验证与文档

- [x] 3.1 补充 `scene detail` 与 `chunks` 相关回归测试，覆盖骨架展示与预热调用。
- [x] 3.2 执行受影响测试与必要的乱码检查，记录验证结果。
- [x] 3.3 更新根目录 `CHANGELOG.md`，记录本次用户可感知体验修复。
