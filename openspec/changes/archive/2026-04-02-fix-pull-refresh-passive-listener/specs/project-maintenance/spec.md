## ADDED Requirements

### Requirement: 触摸交互必须兼容浏览器被动监听约束
仓库 MUST 在实现下拉刷新、拖拽或其它触摸移动交互时，避免在被动监听上下文里直接调用 `preventDefault()`，以免产生浏览器运行时告警或导致默认滚动阻止失效。

#### Scenario: PullToRefresh 处理下拉手势
- **WHEN** 用户在支持页面顶部执行下拉刷新手势
- **THEN** 系统必须在不触发被动监听告警的前提下维持当前刷新阈值与 `app:pull-refresh` 事件契约
- **AND** 不得因为监听修复改变现有启用路径或下拉触发结果