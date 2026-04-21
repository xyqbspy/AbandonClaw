## 1. 数据模型与服务端基础

- [x] 1.1 新增 Supabase migration：创建 `user_scene_practice_sets`、索引、RLS、更新时间 trigger 和基础约束。
- [x] 1.2 更新服务端 DB 类型或本地类型定义，补齐 practice set row / insert / update 类型。
- [x] 1.3 新增 scene practice set server service，支持读取 latest、保存新 set、重新生成时废弃旧 current set。
- [x] 1.4 在 run / attempt / mode-complete / complete 链路中增加 `practiceSetId` 属于当前 user + scene 的最小所有权校验。

## 2. API 与客户端调用

- [x] 2.1 新增或扩展 scene practice set API，支持读取 latest practice set。
- [x] 2.2 新增或扩展 scene practice set API，支持生成并落库 practice set。
- [x] 2.3 新增或扩展 scene practice set API，支持手动重新生成新 set 且不覆盖旧 set。
- [x] 2.4 新增 client util，明确 GET `cache: "no-store"`，并复用现有错误提示风格。

## 3. Scene 页面与缓存协同

- [x] 3.1 调整 scene detail 数据流：先用本地 practice set 秒开，再后台读取服务端 latest。
- [x] 3.2 服务端返回 practice set 后，刷新页面 generated state 并回填 `scene-learning-flow-v2` 本地缓存。
- [x] 3.3 调整开始练习逻辑：服务端已有 set 时不重复生成；无 set 时生成并落库。
- [x] 3.4 调整重新生成逻辑：创建新服务端 set、切换当前本地 set、保留旧 run / attempt 追溯。
- [x] 3.5 保留旧 localStorage 兼容路径，服务端读取失败时可继续使用本地题目降级。

## 4. 测试验证

- [x] 4.1 补 server service / API 测试：latest 读取、生成落库、重新生成新 id、所有权校验。
- [x] 4.2 补 scene detail regression：本地无缓存但服务端有 set 时恢复题目，不要求重新生成。
- [x] 4.3 补 scene detail regression：本地有缓存时先渲染但仍请求服务端并同步覆盖。
- [x] 4.4 补 scene detail / actions 测试：已有服务端 set 时开始练习不重复调用生成接口。
- [x] 4.5 补重新生成测试：新 set 成为当前 set，旧 attempt 不被改写。
- [x] 4.6 运行最小相关测试：scene detail interaction、practice generation tests、server/API tests。

## 5. 文档与稳定性收口

- [x] 5.1 更新 `docs/system-design/scene-practice-generation.md`，说明 practice set 服务端持久化、重新生成和旧本地缓存兼容边界。
- [x] 5.2 更新 `docs/feature-flows/scene-training-flow.md`，补充 practice set 读取 / 生成 / run / attempt 的链路关系。
- [x] 5.3 必要时更新 `docs/dev/server-data-boundary-audit.md`，记录新用户态表和 RLS 边界。
- [x] 5.4 更新 `docs/dev/dev-log.md`，记录本轮验证结论、收口项、明确不收项和剩余风险。
- [x] 5.5 检查本轮不收项是否已记录：公共题库、exercise 标准化表、题型策略调整、review UI 重构。

## 6. 完成态检查

- [x] 6.1 对照 proposal / design / spec delta 做实现 Review，确认没有扩大范围。
- [x] 6.2 更新 tasks 完成状态和验证命令。
- [x] 6.3 按 OpenSpec 流程完成 stable spec 同步，并准备 archive。
- [x] 6.4 本次未确认直接进入 `main` 发布，不更新正式 `CHANGELOG.md`。
