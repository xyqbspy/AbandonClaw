## Purpose

定义 Review 页面在复习队列、阶段式工作台和完成反馈上的用户体验要求，确保复习结束时仍有明确收束和下一步承接。该 capability 在学习闭环中承接 `review` 完成反馈与下一步入口的体验边界，而不重复定义训练阶段、正式信号或调度规则。

## Requirements

### Requirement: Review 页面必须提供阶段式复习工作台后的结果反馈
系统 MUST 在 review 队列清空时继续给出受控的收束反馈，而不是只显示“没有内容”。该反馈必须基于正式 `summary`，并给出明确的下一步去向。

#### Scenario: review 队列已清空
- **WHEN** 当前没有普通表达或场景回补任务
- **THEN** 页面 MUST 展示当前轮次的收束反馈
- **AND** 若存在当日已完成数量，反馈 MUST 复用正式 summary
- **AND** 页面 MUST 提供至少一个明确下一步入口，例如返回 today
