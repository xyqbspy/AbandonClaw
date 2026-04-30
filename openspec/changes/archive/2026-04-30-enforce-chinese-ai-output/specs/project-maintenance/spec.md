# 规范文档：project-maintenance

## ADDED Requirements

### Requirement: AI 协作输出必须默认使用中文
系统 MUST 要求 AI 协作过程中的阶段性更新、问题分析、最终答复、OpenSpec proposal、design、tasks、spec delta 和普通维护文档默认使用中文。系统 MUST 禁止 AI 在未被用户明确要求时输出纯英文回答。

英文 MAY 出现在代码、命令、路径、文件名、API 名、类型名、错误原文、外部专有名词、引用标题、英语学习素材或用户明确要求保留英文的内容中，但这些内容周围的解释、结论、风险说明和任务描述 MUST 使用中文。

#### Scenario: AI 回答用户的问题
- **WHEN** AI 在本项目中回复用户、汇报进度或给出最终结论
- **THEN** 回答主体必须使用中文
- **AND** 不得在用户没有明确要求英文时给出纯英文回答

#### Scenario: AI 生成 OpenSpec 或维护文档
- **WHEN** AI 新建或更新 proposal、design、tasks、spec delta、dev 文档或维护说明
- **THEN** 标题、任务项、问题分析、决策、风险和验证说明必须默认使用中文
- **AND** 代码标识、命令、API 名、错误原文和英语学习素材可以保留英文
