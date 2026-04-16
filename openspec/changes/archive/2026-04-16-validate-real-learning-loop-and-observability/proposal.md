# Proposal

## Change ID

`validate-real-learning-loop-and-observability`

## Why

前五阶段已经补齐了后端治理、数据边界、上线准备、today 编排、音频可靠性和学习反馈基线，但还有两类缺口：

1. 当前最小业务事件只打印到客户端 console，维护者很难在真实使用后快速回看“用户刚刚走到了哪一步”
2. 主链路虽然已经具备稳定实现，但还缺一份可执行的真实闭环验收清单，难以持续验证 `today -> scene -> save phrase -> review -> return today`
3. `review` 在队列清空后的反馈仍然偏弱，缺少“这一轮结束了、现在回哪里”的第二轮收口

## What Changes

- 为客户端业务事件增加最小本地持久化与可回看能力
- 新增 `/admin/observability` 面板，查看最近记录的业务事件与失败摘要
- 为 `review` 空队列状态补一层更明确的结果反馈与返回 today 引导
- 新增真实学习闭环验收清单，并更新相关维护文档

## Scope

本次只做最小可维护方案：

- 不引入新的后端埋点服务
- 不引入第三方分析平台
- 不扩大学习证据边界
- 只复用现有稳定字段做完成反馈增强
