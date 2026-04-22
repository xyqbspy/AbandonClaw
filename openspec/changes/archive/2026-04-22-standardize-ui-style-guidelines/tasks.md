## 1. 文档落点

- [x] 1.1 新增 `docs/system-design/ui-style-guidelines.md`，覆盖页面布局、动作层级、组件归属、样式写法和 OpenSpec 触发条件。
- [x] 1.2 更新 `docs/system-design/README.md`，把 UI 风格指南加入当前目录和 stable spec 对照。
- [x] 1.3 更新 `docs/system-design/component-library.md`，在新增组件判断前指向 UI 风格指南。
- [x] 1.4 更新 `docs/dev/project-maintenance-playbook.md`，在 UI / 组件相关改动前检查项中加入风格指南入口。
- [x] 1.5 补充 UI 风格指南的视觉语言、间距密度、状态反馈、响应式与可访问性检查。
- [x] 1.6 补充页面骨架模板、通用 UI 模式和常见反模式。

## 2. 稳定规则

- [x] 2.1 通过 change spec delta 记录组件库治理、学习动作按钮层级和项目维护流程的新增规则。
- [x] 2.2 不直接修改主 `openspec/specs/*`；待实现完成并 archive 时再同步 stable spec。

## 3. 验证与收口

- [x] 3.1 使用 `rg` 检查新增样式指南已被 README、组件库说明和维护手册引用。
- [x] 3.2 使用 `git diff --check` 检查文档空白问题。
- [x] 3.3 记录本轮不收项：不批量重构现有页面 UI、不新增设计 token、不新增 Storybook/视觉回归。
