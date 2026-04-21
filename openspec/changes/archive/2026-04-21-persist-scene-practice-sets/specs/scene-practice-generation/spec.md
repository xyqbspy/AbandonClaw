## ADDED Requirements

### Requirement: Scene practice set 本体必须可服务端持久化
系统 MUST 为用户在 scene 中生成的 practice set 保存服务端本体记录，并使该记录包含恢复练习所需的题目、答案、来源、状态和生成来源。

#### Scenario: 用户首次生成场景练习
- **WHEN** 用户在某个 scene 中生成 practice set
- **THEN** 系统必须把生成后的 practice set 保存为当前用户和当前 scene 可访问的服务端记录
- **AND** 返回给前端的 `practiceSetId` 必须能在后续 run / attempt 链路中解析到该服务端记录

#### Scenario: 用户从另一设备打开同一场景
- **WHEN** 用户在另一设备进入同一 scene 且服务端存在可继续的 practice set
- **THEN** 系统必须允许页面读取并恢复该 practice set
- **AND** 不得仅因为当前浏览器没有 localStorage 记录就要求用户重新生成题目

### Requirement: Scene practice 重新生成必须创建新的 practice set
系统 MUST 将手动重新生成题目视为创建新 practice set，而不是覆盖旧 practice set 本体。

#### Scenario: 用户手动重新生成题目
- **WHEN** 用户在已有 practice set 的 scene 中主动重新生成题目
- **THEN** 系统必须创建新的 `practiceSetId`
- **AND** 旧 practice set 对应的历史 run / attempt 不得被改写为指向新题目
- **AND** 页面当前继续入口必须切换到新生成的 practice set

### Requirement: Practice run 与 attempt 必须拥有服务端 practice set 锚点
系统 MUST 保证 scene practice run 和 attempt 使用的 `practiceSetId` 属于当前用户可访问的当前 scene practice set，避免学习回写指向无来源的题目集合。

#### Scenario: 用户启动 practice run
- **WHEN** 前端提交 `practiceSetId` 启动 scene practice run
- **THEN** 服务端必须能确认该 `practiceSetId` 属于当前用户和当前 scene
- **AND** 确认失败时不得创建新的 run

#### Scenario: 用户提交练习作答
- **WHEN** 前端提交 scene practice attempt
- **THEN** 服务端必须把 attempt 写入与当前 practice set 对应的 run
- **AND** attempt 记录必须保留 `practiceSetId`，以便后续 review / progress 回看能追溯题目本体

