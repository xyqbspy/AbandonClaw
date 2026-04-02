## Current Flow

当前入口：
- `package.json` 同时存在：
  - `preview`
  - `preview:build`
  - `preview:start`
  - `preview:up`
  - `preview:down`
  - `preview:restart`
  - `preview:status`

当前处理链路：
- README 同时介绍前台 preview 和后台 preview
- 本地使用时容易先尝试 `preview`，但当前机器环境里它不是最稳定入口

当前回退路径：
- 若 preview 有问题，用户只能自己记住改用 `preview:up`

## Problem

当前设计问题：
- 同一件事存在两套入口，增加认知负担
- README 会把不稳定方案继续暴露给后续维护者
- 实际最优路径已经明确，但脚本层还没收口

## Decision

设计决策 1：
- 删除前台 preview 相关脚本，只保留后台 preview 管理器命令

设计决策 2：
- README 中把本地查看页面的建议统一为后台 preview

## Risks

风险 1：
- 维护者如果只想前台跑一个生产预览，会失去现成命令
  - 控制方式：仍保留 `build` 和 `start` 两个基础脚本，必要时可手动组合

## Validation

验证方式：
- 检查 `package.json` 中 preview 相关脚本是否只保留后台方案
- 运行乱码检查，确认文档改动正常

未覆盖风险：
- 本次不涉及业务代码，不需要额外交互回归
