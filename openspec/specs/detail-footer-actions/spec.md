## Purpose

定义学习详情页底部动作区的统一规则，确保 lesson detail 与 chunks detail 在 footer spacing、主操作表达和复习动作呈现上保持一致，降低后续维护时的样式漂移和决策分叉。
## Requirements
### Requirement: 移动端详情 footer 必须使用统一 spacing 基准
移动端详情 footer MUST 使用当前约定的统一 spacing 基准，避免相邻学习链路中的详情页脚出现明显不一致。

#### Scenario: 用户在 lesson detail 与 chunks detail 之间切换
- **WHEN** 用户分别打开 lesson selection detail 和 chunks focus detail
- **THEN** 两者的 footer 内边距应保持一致
- **AND** 不应出现一处明显更挤或更松的视觉断层

### Requirement: 加入复习动作必须有明确主操作表达
详情页中的“加入复习”类按钮 MUST 作为清晰可识别的主操作呈现，并包含与复习语义一致的 icon 辅助表达；同一学习链路中的“开始复习 / 加入复习”还 MUST 与 `scene`、`lesson`、`chunks`、`scenes` 中其它主动作保持一致的主按钮层级。

#### Scenario: 用户查看可加入复习的详情页
- **WHEN** 用户看到详情页底部的加入复习动作
- **THEN** 按钮应以主操作样式呈现
- **AND** 按钮应携带与复习语义一致的 icon
- **AND** 该按钮不得再因为局部页面特例而退回为次按钮、白底按钮或独立主色实现

### Requirement: Selection detail 的 footer 动作必须通过复用组件维护
lesson selection detail 的 footer 动作 MUST 通过独立组件封装，避免再次回到页面内联堆叠按钮实现。

#### Scenario: 维护者修改 lesson detail footer
- **WHEN** 维护者需要调整 lesson detail 底部动作
- **THEN** 应优先在动作组件中修改
- **AND** 不应把整组按钮重新散落回 `selection-detail-sheet.tsx`
