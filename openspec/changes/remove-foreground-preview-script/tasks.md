## 1. 脚本收口

- [x] 1.1 从 `package.json` 移除 `preview`、`preview:build`、`preview:start`
- [x] 1.2 保留 `preview:up / preview:down / preview:restart / preview:status`

## 2. 文档同步

- [x] 2.1 更新 `README.md`，只保留后台 preview 的说明
- [x] 2.2 更新 `CHANGELOG.md`

## 3. 验证

- [x] 3.1 检查脚本存在性
- [x] 3.2 执行 `node --import tsx scripts/check-mojibake.ts`
