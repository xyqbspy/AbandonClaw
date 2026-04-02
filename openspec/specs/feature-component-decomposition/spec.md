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

### Requirement: 重页面拆分必须保持任务阶段与缓存语义稳定
系统 MUST 在拆分 `review`、`scenes` 这类高状态密度页面时，保持原有任务阶段推进、缓存命中与后台刷新语义稳定，不得因为内部拆分改变用户当前任务流或列表刷新结果。

#### Scenario: 拆分 review 页面阶段控制
- **WHEN** 维护者把 review 页面中的数据加载或阶段推进逻辑拆到独立 hook 或局部组件
- **THEN** 当前任务来源、阶段切换和提交后的下一项回退行为必须保持兼容
- **AND** 不得改变 phrase review 与 scene practice 的既有用户可见流程

#### Scenario: 拆分 scenes 页面数据与刷新逻辑
- **WHEN** 维护者把 scenes 页面中的缓存读取、强制刷新或进入前预热逻辑拆到独立 hook 或局部组件
- **THEN** 列表的缓存回填、后台网络刷新和进入场景前预热行为必须保持兼容
- **AND** 不得因为拆分导致列表刷新、删除回退或场景进入语义漂移

### Requirement: 重页面拆分必须保持局部高交互行为可回归
系统 MUST 在拆分带有滑动删除、底部固定动作区或多弹层装配的页面时，保留这些局部高交互行为的页面级回归保护。

#### Scenario: 拆分 scenes 删除手势与 review 底部动作区
- **WHEN** 维护者把 scenes 的滑动删除或 review 的底部固定动作区从页面主文件中抽出
- **THEN** 必须继续通过页面级交互测试验证这些入口行为仍然成立
- **AND** 不得只依赖新拆出模块的孤立测试替代原页面回归
