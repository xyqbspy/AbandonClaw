# 任务清单

## Status
completed

## 实施
- [x] 为 `public.scenes` 设计并添加最小元字段 migration，保留旧字段、旧数据和现有 RLS/权限逻辑
- [x] 扩展 `SceneRow`、scene repository 与 scene service 的类型和映射，支持新字段读写
- [x] 将现有内置 seed 链路升级为 24 个 builtin starter/daily scenes 的幂等写入
- [x] 为每个默认场景补齐日常口语正文、学习目标、预计时长、排序信息和 4-8 个核心 chunks，继续复用 `scene_json`
- [x] 更新 `/api/scenes` 列表返回结构与前端 response type，保证新字段不丢失
- [x] 调整 builtin scenes 的默认排序，让新用户优先看到 starter/daily pack 内容
- [x] 完成本轮已识别稳定性缺口的最小必要收口
- [x] 明确记录本轮不收项、延后原因与风险去向

## 验证
- [x] 补最小测试或脚本验证 seed 幂等、场景数量和 slug 唯一性
- [x] 补最小测试验证 `/api/scenes` 返回新增字段
- [x] 跑最小相关测试并说明结果
- [x] 运行 `pnpm run build`
- [x] 检查本轮未收口项是否已记录原因与风险

## 文档
- [x] 更新相关 OpenSpec 变更文档
- [x] 更新 `docs/dev/dev-log.md` 或补充验证记录
- [x] 在记录中写清本轮收口项 / 明确不收项
- [x] 如本次完成态收尾结果已进入或将直接进入 `main`，且存在用户可感知变化，再更新正式 `CHANGELOG.md`（本次未进入 `main`，不适用）
