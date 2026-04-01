## Why

当前仓库已经有较大规模的单元测试和交互测试，但测试基线并不稳定：`test:unit` 仍有失败用例，`middleware` 与高优 API 入口缺少直接回归保护，导致后续改动容易在认证、学习续接和复习写回等关键入口产生静默回归。现在补齐这批测试，可以先恢复可依赖的绿色基线，再为后续业务迭代提供更稳定的验收入口。

## What Changes

- 修复 review 文案与样式映射相关的失效单元测试，恢复 `test:unit` 全绿。
- 为 `middleware` 增加认证与跳转规则测试，覆盖未登录访问、已登录重定向与 returnTo 安全约束。
- 为高优学习与复习 API handler 增加入口级测试，覆盖参数校验、服务调用透传与错误分支。
- 补充测试维护说明，明确这次补强对应的最小回归范围与验证命令。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `project-maintenance`: 补充仓库在恢复测试基线与新增高优回归测试时的维护要求与最小验收范围。

## Impact

- 受影响代码：`src/app/(app)/review/*`、`middleware.ts`、`src/app/api/review/*`、`src/app/api/learning/*`、相关测试文件与测试说明文档。
- 受影响系统：Node `--test` 单元测试链路、基于 jsdom 的交互测试链路、关键 API handler 的入口回归链路。
- API 行为：无用户可见 API 契约变更，仅补充入口级自动化验证。
- 数据库迁移：无。
