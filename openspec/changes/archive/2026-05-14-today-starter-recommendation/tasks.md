## 1. OpenSpec 与推荐 contract

- [x] 1.1 补齐 Today starter recommendation 的 proposal、design、spec delta，并记录本轮收口项与明确不收项。
- [x] 1.2 定义兼容的 dashboard recommendation 字段与服务端纯函数输入输出类型，明确 continue / starter / daily / empty 优先级。

## 2. 服务端聚合与 Today 页面实现

- [x] 2.1 在 learning dashboard 聚合中新增 starter recommendation，复用 scenes 元字段与用户 progress 信号，保证 continue learning 优先且 review 数据不丢失。
- [x] 2.2 在 Today 页面改造首要任务卡片，展示场景标题、推荐理由、level、estimated minutes、进度与 CTA，并保留现有 review / progress / expressions 区块。
- [x] 2.3 处理无 builtin scenes、字段缺失、scene 被删除等降级路径，避免页面或 API 崩溃。

## 3. 验证与文档同步

- [x] 3.1 为推荐纯函数补最小单元测试，覆盖新用户、continue、部分 starter、starter 全完成、空场景、字段缺失与 review coexist。
- [x] 3.2 补 Today 页面最小 UI/交互测试，并运行 `pnpm run build` 与受影响测试。
- [x] 3.3 同步 `docs/dev/dev-log.md` 记录本轮实现、验证与剩余风险，不更新根目录 `CHANGELOG.md`。
