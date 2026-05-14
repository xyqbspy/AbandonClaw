# 任务清单

## Status
completed

## 实施
- [x] 复查现有 `/scenes` 页面组件、hooks、测试和 `scenesNew.html` 视觉参考，确定复用边界
- [x] 新增 scenes 展示 selector / utility，承载筛选、排序、pack 组合、状态与主 CTA 逻辑
- [x] 重构 `/scenes` 页面为移动端优先布局，包含吸顶导航、推荐路径区、粘性筛选区、场景列表和底部主 CTA
- [x] 将生成 / 导入入口降级为次级操作，保留现有能力和点击链路
- [x] 让推荐路径与场景列表完全基于真实 scenes 数据渲染，不写死 mock 场景
- [x] 复用现有进入场景预热、loading overlay、删除 / 导入 / 生成回刷与 review pack 能力
- [x] 处理无进度、新用户、空数据、筛选无结果、加载中和错误状态

## 验证
- [x] 为 selector / utility 补最小单元测试，覆盖 filter / sort / group / primary CTA
- [x] 更新最小页面交互测试，保护卡片进入、主 CTA 和旧入口保留
- [x] 运行最小相关测试并记录结果
- [x] 运行 `pnpm run build`

## 文档
- [x] 更新 `docs/feature-flows/scene-entry.md`，说明 `/scenes` 已从管理列表升级为移动端学习入口
- [x] 在 `docs/dev/dev-log.md` 记录实现范围、验证结果和未收项风险
- [x] 完成态时同步 archive / stable spec / maintenance 收尾

## 本轮收口项
- [x] 收口 scenes 入口的学习主线优先级
- [x] 收口 scenes 页面内分散的筛选 / 推荐 / CTA 判定逻辑，落到稳定 selector 层

## 明确不收项
- [x] 不做 Today 与 Scenes 的统一推荐引擎
- [x] 不重构 scene detail / TTS / review / chunks 主逻辑
- [x] 不上线复杂远程搜索
- [x] 不做桌面端完整信息架构重排
