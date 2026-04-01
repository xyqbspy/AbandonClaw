## Status

completed

## 1. 删除契约与后端语义

- [x] 1.1 审计 `chunks` 详情、`phrases` API、cluster service 与数据库级联，确认删除表达的完整链路和现有缺口
- [x] 1.2 设计并实现用户侧删除表达 API，限定删除对象为当前用户 `user_phrases`
- [x] 1.3 在后端 service 中补齐主表达删除后的 cluster 补位与空 cluster 清理逻辑
- [x] 1.4 统一删除结果返回结构，包含详情回退所需的 `cluster` / `next main` 信息

## 2. 前端详情与状态回退

- [x] 2.1 在 `chunks` 详情弹框左下角 `...` 更多操作菜单中补充删除入口，并接入公共二次确认弹框
- [x] 2.2 删除成功后按返回结果处理详情切换、关闭、focus trail 回退和 sibling 导航刷新
- [x] 2.3 删除成功后统一刷新列表、saved relations 与相关局部状态，并停止当前 detail 音频播放

## 3. 数据边界与文档

- [x] 3.1 明确第一版不物理删除共享 TTS 音频对象，只删除表达资产和关联数据
- [x] 3.2 更新 `docs/chunks-data-mapping.md`，补充删除表达链路和副作用说明

## 4. 验证

- [x] 4.1 补充后端删除 service / route 测试，覆盖主表达补位、空 cluster 删除、越权和异常分支
- [x] 4.2 补充前端详情删除与回退测试，覆盖 main / similar / contrast 三类场景
- [x] 4.3 执行受影响测试并记录结果与剩余风险

## 5. 文档状态维护

- [x] 5.1 实施开始后更新本 change 的 `proposal` / `design` / `tasks` 状态
- [x] 5.2 归档后同步主 `openspec/specs/` 与用户可感知的 `CHANGELOG.md`
