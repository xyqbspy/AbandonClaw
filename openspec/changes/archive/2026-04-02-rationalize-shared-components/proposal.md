## Why

当前仓库已经有 `src/components/shared`、`src/components/audio`、`src/components/ui` 这些公共层，但仍存在一批组件虽然已经被跨 feature 复用，却还挂在单个 feature 目录下。例如 `lesson` 详情原语直接依赖 `chunks` 目录里的信息块组件和例句卡片，这会让目录职责、导入方向和后续维护边界越来越模糊。

现在需要做一轮受控的组件公共化：把确实已经跨 feature 复用的组件抽回公共层，同时补一份组件库说明，明确什么应该放 `components/*`，什么应该继续留在 `features/*`。

## What Changes

- 审计当前组件分层，区分“真正公共组件”“特定功能组件”“页面组装组件”三类职责。
- 把已经跨 feature 复用、但仍位于单个 feature 目录的组件迁移到合适的公共层，例如 `detail-info-blocks`、`example-sentence-cards` 一类。
- 为组件目录建立明确规则，避免后续继续出现 feature A 直接依赖 feature B 组件的隐式耦合。
- 新增一份组件库说明文档，记录组件分类、推荐放置位置、典型组件清单与新增组件时的判断标准。
- 明确本次非目标：不把所有 feature 组件强行抽公共，不借机重写现有页面或视觉系统。

## Capabilities

### New Capabilities
- `component-library-governance`: 约束组件分层、跨 feature 复用组件的公共化标准，以及组件库说明文档的维护规则。

### Modified Capabilities
- `project-maintenance`: 将“组件分层与组件库说明”纳入项目维护入口文档要求。

## Impact

- 受影响公共层：`src/components/shared`、`src/components/audio`、可能新增更合适的公共组件目录
- 受影响 feature 组件：`src/features/chunks/components/*`、`src/features/lesson/components/*` 中已被跨 feature 复用的组件
- 受影响文档：新增组件库说明文档，并更新维护手册 / CHANGELOG
- 受影响测试：组件迁移后的交互测试、导入路径回归测试
- 不涉及服务端接口、数据库或缓存协议变更
