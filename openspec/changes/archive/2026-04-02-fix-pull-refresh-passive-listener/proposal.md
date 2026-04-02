## Why

`PullToRefresh` 在 `touchmove` 处理中调用了 `event.preventDefault()`，但当前绑定方式会落到浏览器的被动监听语义里，导致控制台持续报出 `Unable to preventDefault inside passive event listener invocation.`。这会污染调试输出，也说明下拉刷新阻止原生滚动的实现方式不够稳。

## What Changes

- 修复 `src/components/layout/pull-to-refresh.tsx` 中的触摸监听实现，避免在被动监听上下文里调用 `preventDefault()`。
- 保持现有页面级下拉刷新启用范围、阈值和 `app:pull-refresh` 事件契约不变。
- 补一条针对触摸移动阶段的回归测试，明确不会再触发被动监听告警。

## Capabilities

### Modified Capabilities
- `project-maintenance`: 增加对触摸/滚动交互中 `preventDefault()` 与被动监听兼容性的维护要求

## Impact

- 受影响文件：
  - `src/components/layout/pull-to-refresh.tsx`
  - `src/components/layout/pull-to-refresh.test.tsx`
- 受影响行为：
  - 支持下拉刷新的页面顶部下拉手势
  - 控制台告警与触摸滚动阻止策略