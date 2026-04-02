## ADDED Requirements

### Requirement: 维护流程必须识别并治理超重页面与容器组件
仓库 MUST 在维护流程中识别明显超重的页面和 feature 容器，并优先通过拆分降低单文件职责复杂度。

#### Scenario: 维护者发现核心入口文件持续膨胀
- **WHEN** 维护者发现某个页面或 feature 容器已经同时承担大量状态、派生逻辑、动作编排和视图渲染
- **THEN** 必须先评估是否需要拆分为 hook、logic、section component 或局部容器
- **AND** 应在维护文档或 OpenSpec change 中写清拆分边界与回归计划
