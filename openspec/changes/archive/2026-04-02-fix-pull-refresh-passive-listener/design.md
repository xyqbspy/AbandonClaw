## Context

当前 `PullToRefresh` 直接在 React 的 `onTouchMove` 里调用 `event.preventDefault()`，希望在用户下拉时压住原生滚动/回弹。但浏览器会把这类触摸移动监听当作被动语义处理，从而在真正触发 `preventDefault()` 时抛出告警。

这类问题表面上只是控制台噪声，实际说明实现方式与浏览器触摸事件约束不一致。我们需要改成更稳定的方案，同时不能把现有下拉刷新启用页、阈值、事件派发契约和测试链路打坏。

## Goals / Non-Goals

**Goals:**
- 去掉被动监听上下文中的 `preventDefault()` 告警
- 保持当前支持下拉刷新的页面与阈值语义不变
- 保持 `app:pull-refresh` 事件派发契约不变
- 为这类触摸交互补一条明确回归测试

**Non-Goals:**
- 不重写整套下拉刷新交互
- 不新增新的支持页面或修改阈值
- 不顺手改 `pull-to-refresh` 的文案、动画或视觉样式

## Decisions

### 1. 优先改监听实现，不改业务契约

决定：
- 保留 `PullToRefresh` 的组件入口和 `app:pull-refresh` 事件协议
- 通过显式非被动监听或等效安全方案处理 `touchmove` 阶段的默认滚动阻止

原因：
- 真正的问题在事件监听语义，而不是产品行为设计
- 保持契约不变能减少对 `chunks / scenes / review / admin` 页的连带影响

### 2. 回归测试直接卡住“不会再在 touchmove 里触发被动监听告警”

决定：
- 在现有 `pull-to-refresh.test.tsx` 上增加一条最小测试，验证触发下拉手势时不会因为 `preventDefault()` 语义不匹配而报错

原因：
- 这是浏览器兼容问题，最容易在后续重构中再次回归
- 用页面级 `app:pull-refresh` 结果测试不足以覆盖这个底层问题

## Risks / Trade-offs

- [改监听方式后手势条件变严] -> 保持原有 `startY / threshold / scrollY` 判断不变，只修监听语义
- [测试环境难以稳定模拟浏览器告警] -> 用最小可控断言验证 `touchmove` 期间不会走到不允许的 `preventDefault()` 路径