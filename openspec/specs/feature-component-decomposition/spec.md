## Purpose

定义超重页面与 feature 容器的拆分治理规则，确保维护者优先通过 feature 内部 hook、logic、section component 和局部容器降低单文件复杂度，而不是继续堆叠职责或误抽成公共组件。

## Requirements

### Requirement: 超重页面与 feature 容器必须优先做内部职责拆分
系统 MUST 在页面文件或 feature 容器同时承担过多路由编排、状态流、局部交互和大块视图职责时，优先进行 feature 内部拆分，而不是继续在单文件中堆叠逻辑。

#### Scenario: `chunks/page.tsx` 或 `scene-detail-page.tsx` 持续膨胀
- **WHEN** 某个页面文件已经同时承担路由状态、局部动作编排、sheet 装配和大量派生逻辑
- **THEN** 维护者必须优先把局部职责拆到同目录的 hook、logic 或 section 组件
- **AND** 页面入口应继续保留页面级组装职责，而不是继续直接吞入新逻辑

### Requirement: 超重组件拆分不得改变既有用户行为
系统 MUST 在拆分超重页面或 feature 容器后保持现有 props、路由行为、缓存语义和用户可见交互不变。

#### Scenario: 拆分 `lesson-reader` 或训练浮层
- **WHEN** 维护者把选择控制、音频动作或训练浮层从原组件中抽出
- **THEN** 既有入口组件的对外接口和交互行为必须保持兼容
- **AND** 不得借拆分顺手改变产品流程或用户可见状态机

### Requirement: 超重组件拆分必须带测试校验
系统 MUST 在拆分超重页面或 feature 容器时，为受影响入口保留或补充自动化测试，确保拆分后真实链路仍然成立。

#### Scenario: 拆分 chunks 或 scene detail 主入口
- **WHEN** 维护者完成局部职责拆分
- **THEN** 必须执行受影响入口的纯逻辑测试、交互测试或页面回归测试
- **AND** 不得只验证新拆出的辅助模块而忽略原始入口链路
