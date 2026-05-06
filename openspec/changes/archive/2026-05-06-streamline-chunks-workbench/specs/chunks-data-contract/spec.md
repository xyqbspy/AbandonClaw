## ADDED Requirements

### Requirement: Chunks 工作台入口层级调整不得破坏数据副作用契约
系统 MUST 在调整 Chunks 工作台主路径、高级整理入口或句子条目动作时，保持表达保存、sentence 保存、relation、cluster、expression map、review session、缓存失效和页面刷新等既有数据副作用契约稳定。

#### Scenario: 维护者调整 Chunks 用户动作层级
- WHEN 维护者将 relation、cluster、expression map 或 AI 候选入口移动到详情或更多操作中
- THEN 对应动作调用的 API、service、数据写入、cache invalidation、toast 或页面反馈 MUST 与调整前语义一致
- AND 必须通过测试覆盖至少一个受影响入口的副作用仍然可追踪

#### Scenario: 维护者调整 sentence 条目主动作
- WHEN 维护者调整 sentence 条目在 Chunks 工作台里的主 CTA 或提示
- THEN 系统 MUST 保持 sentence 保存语义和 source fields 不变
- AND 不得把 sentence 条目错误写入 expression review session

#### Scenario: 维护者调整 expression 复习入口
- WHEN 维护者移动 expression 复习入口或修改其展示层级
- THEN 系统 MUST 保持 review session 创建、继续和完成回写的既有数据契约
- AND 调整不得改变已保存表达与复习队列之间的绑定语义
