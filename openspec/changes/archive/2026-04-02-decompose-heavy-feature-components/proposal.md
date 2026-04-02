## Why

当前仓库里已经完成了一轮“跨 feature 公共组件收口”，但 `chunks/page.tsx`、`scene-detail-page.tsx`、`lesson-reader.tsx` 这类核心页面/容器仍然同时承担路由编排、状态流、派生逻辑、弹层装配和交互处理，文件体量已经明显超出稳定维护范围。继续在这些超重组件里叠加功能，会让回归测试、状态连续性和后续拆分都越来越困难。

## What Changes

- 为超重页面/feature 容器建立明确拆分规则，区分“页面编排”“controller/hook”“纯派生逻辑”“视图片区块”各自的落点。
- 优先拆分三个高风险文件：`src/app/(app)/chunks/page.tsx`、`src/app/(app)/scene/[slug]/scene-detail-page.tsx`、`src/features/lesson/components/lesson-reader.tsx`。
- 将内嵌的大块交互单元和局部编排逻辑抽成独立模块，例如训练浮层入口、chunks 页面 sheet 装配、lesson reader 的选择/音频控制等。
- 保持既有 props、路由行为、缓存语义和用户可见交互不变，本次不借机改产品功能。
- 同步补充维护规范，明确“何时该继续做 feature 内部拆分，而不是误抽成公共组件”。

## Capabilities

### New Capabilities
- `feature-component-decomposition`: 规定超重页面/feature 容器的拆分目标、拆分边界和回归要求。

### Modified Capabilities
- `component-library-governance`: 增加“强业务语义的重组件优先做 feature 内部拆分，而不是直接抽公共”的约束。
- `project-maintenance`: 增加对超重页面/容器组件的识别、拆分策略和维护入口要求。

## Impact

- 受影响页面与容器：
  - `src/app/(app)/chunks/page.tsx`
  - `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - `src/features/lesson/components/lesson-reader.tsx`
- 受影响 supporting modules：
  - `src/app/(app)/chunks/*`
  - `src/app/(app)/scene/[slug]/*`
  - `src/features/lesson/components/*`
- 受影响文档：
  - 组件库说明
  - 项目维护手册
  - `CHANGELOG.md`
- 受影响测试：
  - chunks 页面交互测试
  - scene detail 页面/训练流程交互测试
  - lesson reader 交互与纯逻辑测试
