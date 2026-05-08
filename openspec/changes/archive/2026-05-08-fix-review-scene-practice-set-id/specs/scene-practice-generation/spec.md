## ADDED Requirements

### Requirement: Scene practice attempt 进入 Review 回补时必须保留 practice set 追溯

系统 MUST 让由 scene practice attempt 派生出的 Review 回补任务保留原 attempt 的 `practiceSetId`，以便后续回补提交仍能追溯到原始题目集合和服务端 practice set 归属。

#### Scenario: 未完成 attempt 进入 Review 回补队列

- **WHEN** 系统从 `user_scene_practice_attempts` 聚合未 complete 的回补候选
- **THEN** due item MUST 包含该 attempt 的 `practiceSetId`
- **AND** 后续 run / attempt 写入 MUST 指向该 `practiceSetId`

#### Scenario: 当前 scene latest practice set 已变化

- **WHEN** 原 attempt 的 `practiceSetId` 与当前 scene latest generated practice set 不一致
- **THEN** Review 回补 MUST 继续使用原 attempt 的 `practiceSetId`
- **AND** 系统 MUST NOT 自动改写为 latest practice set
