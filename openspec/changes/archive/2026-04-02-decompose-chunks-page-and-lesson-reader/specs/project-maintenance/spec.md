## ADDED Requirements

### Requirement: 重入口后续拆分必须优先继续收口页面动作与分支装配
仓库 MUST 在处理 `chunks/page.tsx`、`lesson-reader.tsx` 这类已经过一轮减重但仍然明显过重的入口时，优先继续拆分页面动作编排、section 装配和分支控制，而不是先拆零散展示原子或直接做公共化。

#### Scenario: 维护者继续治理 chunks 或 lesson reader
- **WHEN** 维护者发现 `chunks/page.tsx` 或 `lesson-reader.tsx` 仍同时承担多组局部动作、分支装配和大块 JSX
- **THEN** 必须先评估是否拆成页面动作模块、selection/controller、section 组件或 sheet 装配模块
- **AND** 不应为了减行数优先抽离不稳定的 shared 组件或零散原子组件