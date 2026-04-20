## Purpose

定义 Today 页面承接学习主链路后的聚合展示边界，确保 today 反馈可追踪、可验收，并与正式聚合字段保持一致。该 capability 在学习闭环中承接 `today` 的聚合字段映射、入口优先级、解释文案与 fallback 规则，而不重复定义整条学习闭环。

## Requirements

### Requirement: Today 页面数据来源与优先级必须可追踪
系统 MUST 在 `today` 页面给出可被真实验收的主链路承接结果，至少让维护者能够确认 `today -> scene -> review -> return today` 的反馈仍遵守稳定聚合字段边界。

#### Scenario: 维护者执行真实闭环验收
- **WHEN** 维护者按验收清单走完整主链路
- **THEN** `today` 页面 MUST 能基于稳定聚合字段展示结果摘要
- **AND** 不得因为前端临时状态丢失而出现与主链路不一致的反馈
