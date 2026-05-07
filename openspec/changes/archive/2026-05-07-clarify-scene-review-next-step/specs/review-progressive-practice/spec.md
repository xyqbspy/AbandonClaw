## ADDED Requirements

### Requirement: Review 阶段展示必须聚焦当前主问题
系统 MUST 在 Review 递进式练习中让每个阶段聚焦一个当前主问题，并以该问题驱动输入、选择或继续动作。阶段说明、调度原因和边界提示可以存在，但不得压过当前阶段主任务。

#### Scenario: 用户进入普通表达 Review 阶段
- **WHEN** 用户进入普通表达 review 的任一递进阶段
- **THEN** 页面 MUST 清楚展示当前阶段要回答或完成的一个主问题
- **AND** 当前阶段主 CTA MUST 与该主问题一致
- **AND** 说明文案 MUST 服务当前阶段，不得把多个后续阶段的解释同时提升为主内容

#### Scenario: 用户进入 Review feedback 阶段
- **WHEN** 用户进入最终 feedback 阶段
- **THEN** 页面 MUST 让 again / hard / good 或对应最终判断成为主动作
- **AND** 前置阶段结果可以作为辅助摘要展示
- **AND** 页面不得把前置阶段结果误呈现为 AI 质量评分或独立调度结果

### Requirement: Review 辅助入口不得抢占当前阶段主 CTA
系统 MUST 保留来源场景、回到场景练习、参考提示等辅助入口，但这些入口不得抢占当前 Review 阶段的主 CTA 层级。

#### Scenario: 普通表达存在可访问来源场景
- **WHEN** 当前普通表达 review 项存在可访问来源场景
- **THEN** 页面 MAY 展示查看原场景入口
- **AND** 该入口 MUST 作为辅助动作呈现
- **AND** 当前递进阶段的继续、输入或最终判断动作 MUST 仍是主 CTA

#### Scenario: 场景回补任务提供回到场景练习
- **WHEN** 当前 review 项是场景回补任务
- **THEN** 页面 MAY 提供回到原场景或继续场景练习入口
- **AND** 在当前 review 阶段未完成前，该入口不得替代当前阶段主 CTA
- **AND** 在用户需要降级回场景练习时，页面 MUST 将其解释为训练辅助路径，而不是当前 review 的失败终点
