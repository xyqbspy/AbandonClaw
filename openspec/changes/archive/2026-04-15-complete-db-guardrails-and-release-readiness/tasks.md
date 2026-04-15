# 任务清单

## Status
draft

## 实施
- [x] 1.1 盘点已切到用户上下文的关键用户态表，明确需要补齐的最小 RLS / SQL 范围。
- [x] 1.2 为 `learning / review / phrases / practice / variant` 相关用户态表补齐最小数据库策略或 SQL 说明。
- [x] 1.3 为仍保留 `service role` 的后台白名单入口补充边界说明和回滚说明。
- [x] 2.1 用现有 `load-api-baseline` 在真实 HTTP 入口下执行最小基线压测。
- [x] 2.2 记录 `review submit`、`learning progress`、`practice generate`、`tts` 的 HTTP baseline 结果与异常说明。
- [x] 3.1 新增服务端治理上线前检查清单，覆盖 Redis、Origin、白名单入口、风险接受项与必跑验证命令。

## 验证
- [x] 4.1 运行受影响接口的最小自动化测试。
- [x] 4.2 完成数据库策略对应的最小冒烟验证或脚本验证。
- [x] 4.3 完成真实 HTTP baseline 执行并记录结果。

## 文档
- [x] 5.1 更新 `docs/dev/server-data-boundary-audit.md`。
- [x] 5.2 更新 `docs/dev/dev-log.md`。
- [x] 5.3 同步本次 change 的 spec delta。
