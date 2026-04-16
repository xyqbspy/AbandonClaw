## MODIFIED Requirements

### Requirement: Review 页面必须提供阶段式复习工作台
系统 MUST 在 review 完成一个正式提交后，给用户返回简洁但明确的结果反馈，至少说明本次结果会如何影响后续复习或学习闭环，而不是只把请求成功当作流程结束。

#### Scenario: 用户完成一次 review 提交
- **WHEN** 用户完成当前 review 项并提交结果
- **THEN** 页面 MUST 展示最小结果反馈
- **AND** 反馈 MUST 能说明这是复习完成、继续下一题还是返回其他学习入口
- **AND** 反馈不得伪造未正式写回的学习信号

### Requirement: Review 舞台模型必须统一映射普通复习与场景回补
系统 MUST 允许 review 页面记录关键业务动作与失败摘要，以支持维护者区分“页面渲染成功但用户中断”“提交失败”“调度为空”这类不同业务结果。

#### Scenario: review 工作台发生关键动作或失败
- **WHEN** 用户开始 review、提交结果、跳过、结束或遇到提交失败
- **THEN** 系统 MUST 记录最小业务级事件或失败摘要
- **AND** 这些记录 MUST 能与请求级日志关联
