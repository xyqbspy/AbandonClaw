## ADDED Requirements

### Requirement: 公网开放 baseline 完成态必须记录证据与阻塞项
当维护者完成或准备完成公网开放相关变更时，维护流程 MUST 记录真实 HTTP baseline 的执行证据、未覆盖场景和环境阻塞，而不是只在终端临时查看结果。

#### Scenario: 维护者完成公网开放相关收尾
- **WHEN** 维护者完成注册模式、邀请码、邮箱验证、限流、daily quota、账号状态或相关后台状态改动
- **THEN** `docs/dev/dev-log.md` 或等价完成态记录 MUST 说明 baseline 命令、环境前提、关键结果和未覆盖项
- **AND** 若存在 blocked 或 skipped 场景，记录 MUST 明确说明原因和后续执行入口

#### Scenario: 维护者只有本地或部分环境结果
- **WHEN** 维护者只能在本地、临时环境或部分凭据条件下执行公网开放 baseline
- **THEN** 维护流程 MUST 明确区分“已验证场景”和“待真实环境补跑场景”
- **AND** 不得把部分 baseline 结果表述为完整公开前验证完成
