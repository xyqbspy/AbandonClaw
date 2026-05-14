## ADDED Requirements

### Requirement: 乱码诊断必须先区分文件损坏与显示链路异常
维护流程 MUST 在重写 `CHANGELOG.md`、`docs/README.md`、维护手册或其他核心维护文档前，先用 UTF-8 感知的读取方式确认文件内容本身是否损坏，而不能仅凭某个终端或 shell 的显示结果就直接判定文档已乱码。

#### Scenario: 终端预览显示疑似乱码，但文件内容仍是干净 UTF-8
- **WHEN** 维护者在 shell、终端面板或命令输出中看到 `CHANGELOG.md` 或其他核心维护文档出现疑似乱码
- **AND** 通过 UTF-8 感知的读取方式验证后，文件字节内容仍是可读文本
- **THEN** 维护流程 MUST 优先修正诊断方式、记录环境差异或改进检查链路
- **AND** 不得仅因终端显示异常就重写本来干净的正式文档

### Requirement: 乱码检查器自身不得通过自我忽略规避检查
维护流程 MUST 保持 `scripts/check-mojibake.ts`、其规则文本与最小测试本身为干净可读 UTF-8，并且不得通过把检查器源码加入忽略名单来规避乱码检查。

#### Scenario: 维护者修改乱码检查模式或忽略规则
- **WHEN** 维护者调整 `scripts/check-mojibake.ts` 的可疑模式、忽略规则或输出文案
- **THEN** 检查器源码 MUST 保持干净可读 UTF-8
- **AND** 不得把 `scripts/check-mojibake.ts` 本身加入忽略列表来通过检查
- **AND** 必须保留最小验证，确认常见高置信度乱码片段仍能被识别
