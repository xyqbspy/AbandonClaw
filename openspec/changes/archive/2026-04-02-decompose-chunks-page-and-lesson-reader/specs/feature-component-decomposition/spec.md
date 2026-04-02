## ADDED Requirements

### Requirement: 重入口第二轮拆分必须继续保持页面级动作与分支语义稳定
系统 MUST 在继续拆分 `chunks/page.tsx` 与 `lesson-reader.tsx` 这类已做过第一轮减重的入口时，保持既有页面级动作、状态分支和副作用链路稳定，不得因为内部模块再拆分而改变用户当前交互结果。

#### Scenario: 拆分 chunks 页面动作编排
- **WHEN** 维护者把 `chunks/page.tsx` 中的 review 启动、expression map 打开、focus detail 成功回退或多 sheet 装配拆到独立模块
- **THEN** 页面级路由状态、focus detail 打开/关闭、review 启动和 map 打开行为必须保持兼容
- **AND** 不得改变现有缓存失效或音频入口语义

#### Scenario: 拆分 lesson reader 分支装配
- **WHEN** 维护者把 `lesson-reader.tsx` 中的 selection 控制、dialogue/mobile 分支或训练桥接逻辑拆到独立模块
- **THEN** 句子激活、chunk 选中、detail panel/sheet 展示和训练模式桥接行为必须保持兼容
- **AND** 不得改变既有 chunk encounter 与 sentence complete 上报结果

### Requirement: 重入口第二轮拆分必须继续保留入口级交互回归
系统 MUST 在继续拆分 `chunks/page.tsx` 与 `lesson-reader.tsx` 时，保留入口级交互测试对真实链路的保护，不得只依赖新拆出模块的局部测试。

#### Scenario: 调整 chunks 或 lesson reader 的局部模块边界
- **WHEN** 维护者完成页面动作模块、section 组件或 controller 的第二轮拆分
- **THEN** 必须继续通过 `chunks/page` 与 `lesson-reader` 的入口级测试验证真实交互仍成立
- **AND** 不得以 hook 或 section 的孤立测试替代主入口回归