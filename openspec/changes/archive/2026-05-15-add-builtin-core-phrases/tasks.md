## 1. 数据与接口

- [x] 1.1 检查并扩展 `phrases` 最小元字段，补 SQL/seed 支持 builtin/core phrase。
- [x] 1.2 以 starter/builtin scenes 为来源准备第一批 core phrases（80-120 条），并保证不写入 `user_phrases`。
- [x] 1.3 新增 `GET /api/phrases/builtin` 及服务端聚合，支持 `level/category/search/limit` 与 `isSaved`。
- [x] 1.4 复用 `POST /api/phrases/save`，打通 builtin phrase 保存到 `user_phrases` 的幂等链路。

## 2. Chunks 页面

- [x] 2.1 改造 Chunks 顶层为“我的表达 / 必备表达”双入口，保留现有我的表达工作台能力。
- [x] 2.2 按 `newChunks.html` 方向实现 builtin phrase 卡片、筛选条、空状态与移动端 CTA。
- [x] 2.3 补纯函数与前端 selector：筛选、分组、排序、标签文案、已保存判断、推荐结果。

## 3. 闭环与验证

- [x] 3.1 确认 builtin phrase 保存后可被现有 review / today / progress 链路消费，不破坏老用户。
- [x] 3.2 补最小测试：builtin save 幂等、builtin -> user_phrase、isSaved、filter/group 逻辑。
- [x] 3.3 运行最小验证：相关测试、`pnpm run build`、OpenSpec validate。
- [x] 3.4 同步 stable spec、dev-log，并在完成态 archive。
