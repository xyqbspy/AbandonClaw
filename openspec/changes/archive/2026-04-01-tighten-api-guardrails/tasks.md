## Status

completed

## 1. 权限与边界收口

- [x] 1.1 审计 `/api/tts/regenerate` 的现有调用入口，确认存在 `chunks` 页面中的普通用户触发路径
- [x] 1.2 将 `/api/tts/regenerate` 收紧为管理员能力，并补齐越权拒绝分支
- [x] 1.3 复核 `middleware` 与 route 级权限边界，确保高成本接口的入口保护和内部权限判断一致

## 2. 输入规模与热路径优化

- [x] 2.1 为 `explain-selection` 增加文本字段长度校验与拒绝策略
- [x] 2.2 为 `practice/generate` 增加 scene 结构规模与文本规模限制
- [x] 2.3 为 `tts/regenerate` 增加批量数量限制和空批量校验
- [x] 2.4 调整 `/api/me` 热路径，复用单次身份识别结果，消除可避免的重复认证查询

## 3. 错误收敛

- [x] 3.1 调整通用 API 错误转换逻辑，未知错误不再直接透传内部 message
- [x] 3.2 校准受影响 route 的 fallback message 和错误码，确保客户端行为稳定可预测

## 4. 验证

- [x] 4.1 为 `/api/tts/regenerate` 补充未登录、越权、超限和管理员成功路径测试
- [x] 4.2 为 `/api/explain-selection` 与 `/api/practice/generate` 补充超限输入测试
- [x] 4.3 为 `/api/me` 补充热路径复用测试，锁住认证调用次数或依赖使用方式
- [x] 4.4 执行受影响测试并记录通过结果或剩余风险

## 5. 文档

- [x] 5.1 更新本 change 的 proposal、design、tasks 状态
- [x] 5.2 在归档后同步主 `openspec/specs/` 与 `CHANGELOG.md`
