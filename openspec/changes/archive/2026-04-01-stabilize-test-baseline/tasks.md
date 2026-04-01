## 1. 恢复测试基线

- [x] 1.1 同步 `src/app/(app)/review/review-page-messages.test.ts` 与当前实现，修复现有失败用例并恢复 `test:unit` 全绿。
- [x] 1.2 复跑受影响的 review 相关单元测试与默认单元测试命令，确认失败信号已经清零。

## 2. 补强入口级自动化测试

- [x] 2.1 为 `middleware.ts` 增加认证、重定向与 `returnTo` 安全约束测试。
- [x] 2.2 为 `src/app/api/review/*` 的高优 handler 补充参数校验、service 透传与错误响应测试。
- [x] 2.3 为 `src/app/api/learning/continue|progress|scenes/[slug]/start|pause` 补充入口级 handler 测试。

## 3. 验证与记录

- [x] 3.1 执行新增测试文件、`pnpm run test:unit` 与必要的交互测试，记录通过结果或剩余风险。
- [x] 3.2 更新 `test.md` 中与本次补强相关的最小回归说明与执行命令。
- [x] 3.3 更新根目录 `CHANGELOG.md`，记录本次测试补强、影响范围与验证情况。
