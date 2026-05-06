## Why

`chunks` 页面已经承载表达库、表达详情、关系整理、expression cluster、AI 候选、expression map、手动保存和进入复习等多类动作，当前更像资产管理工作台，普通用户主路径容易被高级整理能力稀释。

本次变更要把 `chunks` 收回到产品北极星：优先帮助用户把表达资产用于“回忆、使用、迁移”，让常用动作更清晰，让高级整理动作留在合适的上下文里。

## What Changes

- 明确 `chunks` 页面的一屏主路径：查看表达资产、筛选/搜索、进入详情、开始/继续复习、从详情回到来源场景。
- 收拢高级整理动作：relation、cluster、expression map、AI 生成候选、移动/合并等能力不删除，但应优先从详情或更多操作进入，避免和主路径同级竞争。
- 梳理句子条目的用户路径：句子不伪装成可直接进入 expression review 的条目，而是明确指向来源场景巩固或句内表达提取。
- 限制页面级复杂度增长：实现时优先按动作域拆分 `chunks/page.tsx`，但不把强业务容器误抽到 `shared`。
- 同步用户文案和测试，避免“待开放、示例、技术名词、维护动作”出现在普通用户主路径。

## Capabilities

### New Capabilities

- `chunks-workbench-user-path`: 定义 `chunks` 工作台的用户动作层级、主路径和高级整理能力的展示边界。

### Modified Capabilities

- `chunks-data-contract`: 不改变后端数据写入语义，但补充 `chunks` 页面动作层级变化不得破坏既有保存、relation、cluster、review 副作用契约。

## Stability Closure

### 本次暴露的不稳定点

- `chunks/page.tsx` 已经明显偏重，页面同时承担数据加载、筛选、详情、relation、cluster、map、review、sheet 组装和 toast 反馈。
- 句子条目与表达条目在 UI 动作上容易混淆，之前已有“句子复习待开放”一类半成品口吻。
- 组件公共化边界容易被误判：`chunks` 详情容器、map、cluster 列表看起来可复用，但仍携带强业务语义。

### 本轮收口项

- 建立 `chunks` 用户动作层级的 stable spec。
- 明确主路径与高级整理入口的边界。
- 约束实现时按动作域拆分页面，而不是抽空业务组件或改变数据契约。
- 明确句子条目用户路径，不再把句子作为未完成 review 能力展示。

### 明确不收项

- 不重写 `chunks` 数据模型、relation / cluster 后端语义或 review 调度算法。
- 不删除 expression map、AI 候选、cluster 维护等高级能力，只调整入口层级。
- 不把 `FocusDetailSheet`、`ExpressionMapSheet`、`MoveIntoClusterSheet` 上移为 `shared`。
- 不处理 scene review pack / random review 的内部命名历史包袱。

### 延后原因与风险记录

这些延后项涉及跨模块契约、数据副作用或历史 capability 命名，混入本轮会放大主链路风险。剩余风险记录在本 change 的 `design.md` 和 `tasks.md` 中，后续如需处理应单独提出变更。

## Impact

- 主要代码：
  - `src/app/(app)/chunks/page.tsx`
  - `src/app/(app)/chunks/chunks-list-view.tsx`
  - `src/app/(app)/chunks/chunks-page-sheets.tsx`
  - `src/app/(app)/chunks/use-*.ts`
  - `src/features/chunks/components/*`
- 相关文档：
  - `openspec/specs/chunks-data-contract/spec.md`
  - `docs/system-design/chunks-data-mapping.md`
  - `docs/system-design/component-library.md`
- 相关测试：
  - `src/app/(app)/chunks/*.test.ts`
  - `src/app/(app)/chunks/*.interaction.test.tsx`
  - `src/features/chunks/components/*.test.ts`
  - `src/features/chunks/components/*.interaction.test.tsx`
- 不涉及数据库迁移和新增依赖。
