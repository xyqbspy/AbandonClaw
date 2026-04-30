# 变更提案：强化 AI 协作中文输出规则

## Status
draft

## Why
当前 `AGENTS.md` 已写明“所有输出使用中文”，但该规则主要停留在强约束入口，没有同步沉淀到长期维护契约和接需求模板。后续模型如果只读取 stable spec、dev 文档或 OpenSpec 任务，仍可能输出纯英文回答，或生成英文 proposal / tasks，造成协作体验和项目规则漂移。

## What Changes
- 明确 AI 协作回答、阶段性更新、最终答复、OpenSpec proposal / design / tasks 与普通维护文档默认使用中文。
- 明确不得输出纯英文回答；英文只允许作为代码、命令、路径、API 名、类型名、错误原文、外部专有名词、用户明确要求的英文内容或英语学习素材出现。
- 把该规则同步到 `AGENTS.md`、接需求模板和 project-maintenance stable spec。

## Stability Closure
### In This Round
- 收口“中文输出”只存在于 `AGENTS.md`、其他维护入口不够明确的问题。
- 收口 OpenSpec 任务和维护文档可能默认英文的问题。
- 收口后续模型读取项目规范时缺少稳定语言契约的问题。

### Not In This Round
- 不批量重写历史 archive、历史 dev-log 或已有英文技术术语：这些内容不是后续回答语言漂移的主要入口。
- 不清理历史乱码文档：本轮只补语言契约，不扩大到文档编码重写。

### Risk Tracking
- 延后原因：历史文档范围大，批量改写容易引入无关 churn。
- 风险记录位置：本 change 的 proposal / design / tasks 与最终说明。

## Scope
### In Scope
- AI 协作输出语言规则。
- OpenSpec 和维护文档默认语言规则。
- 入口文档与 stable spec 同步。

### Out of Scope
- 业务代码、产品页面文案和用户可见功能。
- 历史 archive 全量清理。
- 全量文档乱码修复。

## Impact
影响的规范：project-maintenance。
影响的模块：AI 协作规则、OpenSpec 维护流程、dev 接需求模板。
是否涉及 API 变更：否。
是否涉及前端交互变化：否。
是否影响缓存策略：否。
是否影响测试基线：否。
兼容性：向后兼容。
风险点：规则过严可能误伤代码/API/错误原文，因此明确允许必要英文保留。
