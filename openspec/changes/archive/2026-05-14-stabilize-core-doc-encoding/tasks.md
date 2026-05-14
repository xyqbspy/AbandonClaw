## 1. 乱码检查脚本收口

- [x] 1.1 重构 `scripts/check-mojibake.ts`，移除通过忽略自身规避检查的实现。
- [x] 1.2 将高置信度乱码模式与忽略样例改成编码安全表达，保持脚本源码可读 UTF-8。
- [x] 1.3 保持现有 archive 触碰范围扫描能力，不扩大到全仓历史清理。

## 2. 测试与规则同步

- [x] 2.1 增加最小测试，验证常见乱码片段识别与检查器自检能力。
- [x] 2.2 同步 `project-maintenance` stable spec，明确先验证 UTF-8 文件内容、乱码检查器不得自我豁免。
- [x] 2.3 同步 `docs/dev/project-maintenance-playbook.md`，补充编码诊断口径。

## 3. 收尾

- [x] 3.1 在 `docs/dev/dev-log.md` 记录本轮问题、方案、不收项和验证结果。
- [x] 3.2 运行最小验证：`pnpm run text:check-mojibake`、新增最小测试、`pnpm run maintenance:check`、OpenSpec validate。
- [x] 3.3 完成 stable spec 同步与 archive。
