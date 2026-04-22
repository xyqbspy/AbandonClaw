## ADDED Requirements

### Requirement: UI 风格指南必须作为新增页面和功能的固定入口
系统 MUST 提供一份轻量 UI 风格指南，帮助维护者在新增页面、功能入口或跨页面 UI 调整前判断页面布局、动作层级、组件归属和样式写法，避免只依赖局部页面惯性继续产生风格漂移。

#### Scenario: 维护者新增页面或功能入口
- **WHEN** 维护者准备新增一个页面、主要功能入口或跨页面可复用 UI
- **THEN** 他必须能够通过 `docs/system-design/ui-style-guidelines.md` 判断应复用哪些既有组件、按钮层级和页面结构
- **AND** 若该 UI 涉及组件抽取或跨 feature 复用，还必须继续遵守组件库说明和组件库治理 capability
- **AND** 不得仅因为局部页面已有相似 class 或临时视觉效果，就绕过既有组件和样式入口
