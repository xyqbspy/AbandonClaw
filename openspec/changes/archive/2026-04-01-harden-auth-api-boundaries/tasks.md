## 1. 统一认证边界

- [x] 1.1 抽取并接入登录页、注册页与 `middleware` 共用的安全重定向校验规则
- [x] 1.2 扩展 `middleware` 的受保护 API 边界，明确高成本接口默认需要登录或显式例外
- [x] 1.3 优化 `/api/me` 的热路径查询，消除同一请求内可避免的重复认证/资料读取

## 2. 收紧高成本接口与上游调用保护

- [x] 2.1 为 `explain-selection`、`practice/generate`、`scene/mutate`、`scene/parse` 等高成本入口补充显式访问控制
- [x] 2.2 为 `src/lib/server/glm-client.ts` 与 `src/lib/explain/providers/openai.ts` 增加超时、空响应防御与统一错误收敛
- [x] 2.3 校准受影响 route 的错误响应与拒绝分支，确保未登录或上游失败时行为可预测

## 3. 验证与记录

- [x] 3.1 补充登录重定向、安全边界、高成本接口和 `/api/me` 热路径的直接自动化测试
- [x] 3.2 执行受影响的定向测试与默认测试命令，记录通过结果或剩余风险
- [x] 3.3 更新根目录 `CHANGELOG.md`，记录本次边界收紧、接口保护和验证情况
