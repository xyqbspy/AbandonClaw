## 1. PullToRefresh 监听修复

- [x] 1.1 审计 `src/components/layout/pull-to-refresh.tsx` 当前 `touchstart / touchmove / touchend` 链路，确认被动监听告警的触发点与可替换方案
- [x] 1.2 修复 `PullToRefresh` 的触摸移动监听，实现兼容浏览器被动监听约束且保持现有下拉刷新行为

## 2. 测试与记录

- [x] 2.1 更新 `src/components/layout/pull-to-refresh.test.tsx`，补充不会再触发被动监听告警的回归测试
- [x] 2.2 更新根目录 `CHANGELOG.md`，记录下拉刷新触摸监听修复与验证情况
