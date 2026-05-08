## ADDED Requirements

### Requirement: Review 场景回补必须复用真实 practice set 锚点

系统 MUST 在 Review 场景回补任务中携带产生该回补任务的真实 `practiceSetId`，并在提交回补答案时复用该 ID 调用 scene practice run / attempt / complete 链路。系统不得为 Review 场景回补构造不存在于服务端的临时 `practiceSetId`。

#### Scenario: Review 页提交场景回补

- **WHEN** 用户在 Review 页提交一个 scene practice 回补答案
- **THEN** 前端 MUST 使用 due item 返回的真实 `practiceSetId`
- **AND** 服务端 MUST 继续用 scene practice set 归属校验保护 run / attempt 写入

#### Scenario: 回补任务缺少 practice set 锚点

- **WHEN** Review 场景回补任务缺少可用 `practiceSetId`
- **THEN** 前端 MUST 阻断提交并给出受控失败
- **AND** 系统 MUST NOT 构造 `review-inline:*` 这类临时 ID 继续写入 scene practice run
