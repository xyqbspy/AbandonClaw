## Why

当前仓库已有产品文档、技术文档、组件分层说明和若干按钮/详情专项规则，但缺少一份“新增页面或功能时如何保持 UI 风格统一”的总入口。后续如果只靠局部页面惯性，很容易再次出现按钮层级、卡片使用、页面布局和样式写法各自漂移。

本次变更用于把 UI 风格判断前置到维护流程中：新增页面、功能入口或跨页面 UI 时，先按统一风格指南和稳定规则判断，再进入实现。

## What Changes

- 新增轻量 UI 风格指南文档，覆盖页面布局、动作层级、组件归属、样式写法和 OpenSpec 触发条件。
- 修改组件库治理 capability，要求组件库说明必须能指向 UI 风格指南，并在新增页面/功能时提供统一风格入口。
- 修改学习主链路按钮层级 capability，明确新增页面或新增学习动作时必须先按动作语义复用既有主次层级。
- 同步文档索引和维护手册入口，避免 UI 规则只藏在专项 spec 里。
- 不做现有页面的批量视觉重构，不重命名设计 token，不引入重型设计系统。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `component-library-governance`: 补充 UI 风格指南作为新增页面/功能时的固定判断入口。
- `learning-action-button-hierarchy`: 补充新增学习动作时必须按动作语义复用既有按钮层级。
- `project-maintenance`: 补充跨页面 UI 风格规范的文档同步要求。

## Impact

- 影响文档：
  - `docs/system-design/ui-style-guidelines.md`
  - `docs/system-design/README.md`
  - `docs/system-design/component-library.md`
  - `docs/dev/project-maintenance-playbook.md`
  - `openspec/changes/standardize-ui-style-guidelines/specs/*`
- 不影响运行时代码、API、数据库、缓存或测试链路。

## Stability Closure

- 本轮暴露的不稳定点：组件分层、按钮层级和详情专项规则已有稳定落点，但缺少面向新增页面/功能的统一 UI 风格入口。
- 本轮收口项：建立轻量 UI 风格指南，并把它接入 system-design 索引、组件库说明、维护手册和 OpenSpec delta。
- 明确不收项：不批量检查或重构现有页面 UI，不设计完整 token 系统，不新增 Storybook 或视觉回归测试。
- 延后原因：当前需求目标是防止后续新增页面继续漂移，现有页面批量治理会扩大范围并可能牵动业务交互。
- 剩余风险记录位置：本 change 的 `tasks.md` 与后续实现说明中记录。
