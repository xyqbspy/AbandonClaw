## Why

当前仓库同时提供了前台 `preview` 链路和后台 `preview:up` 链路，但在本机实际使用中，前台 `preview` 会触发不稳定问题，而后台 `preview:up` 才是稳定可用的预览方式。继续保留两套入口会增加误用概率，也会让 README 中的本地运行建议变得分裂。

这次要把本地预览方案收口成单一路径：只保留后台 preview 管理命令，让“默认不开服务，需要看时再后台启动”的工作流更清晰、更可执行。

## What Changes

- 从 `package.json` 中移除前台 `preview`、`preview:build`、`preview:start` 三个脚本。
- 保留 `preview:up / preview:down / preview:restart / preview:status` 作为唯一的预览方案。
- 更新 `README.md`，删除前台 preview 说明，只保留后台 preview 使用方式。
- 更新 `CHANGELOG.md`，记录本地预览脚本的收口调整。

## Impact

- 受影响文件：
  - `package.json`
  - `README.md`
  - `CHANGELOG.md`
- 是否涉及数据库迁移：否
- 是否涉及 API 变更：否
- 是否影响前端交互：否
- 是否影响缓存策略：否
- 是否影响测试基线或回归范围：否
- 兼容性：对业务代码完全兼容；仅调整本地运行脚本入口
