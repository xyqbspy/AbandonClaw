## Purpose
定义 `scene` 练习题生成的最少题量覆盖、半句复现覆盖范围和统一 loading 反馈边界，确保练习生成结果稳定且用户可见反馈一致。该 capability 在学习闭环中承接 `scene` 练习题生成质量与生成中反馈边界，而不重复定义句子推进里程碑、场景练习完成或学习状态聚合语义。
## Requirements
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

### Requirement: 场景填空模块必须提供稳定的最少题量覆盖
系统 MUST 在 scene 练习的 `cloze` 模块中提供稳定的最少题量覆盖，避免中等以上句子数量的场景只生成极少数填空题。

#### Scenario: 用户手动重新生成题目
- **WHEN** 用户在 scene 练习页主动点击“重新生成题目”
- **THEN** 系统必须展示统一的 loading 反馈
- **AND** 文案必须明确表示当前正在生成中
- **AND** 该 loading 展示必须复用公共组件，而不是在页面局部单独实现

### Requirement: 半句复现必须覆盖更多中短句
系统 MUST 让 `guided_recall` 覆盖更多仍有练习价值的中短句，而不是只保留偏长句。

#### Scenario: 句子长度刚达到放宽后的阈值
- **WHEN** 某句词数达到当前半句复现最小阈值，且前后半句都非空
- **THEN** 系统必须为该句生成半句复现题

#### Scenario: 场景存在多条可做半句复现的句子
- **WHEN** 场景里可用的半句复现句子多于单轮上限
- **THEN** 系统应保留不超过当前上限的题量
- **AND** 该上限必须高于旧版的 4 题限制

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
