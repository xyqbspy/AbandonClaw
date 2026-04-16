# Design

## Overview

第六阶段分成三块：

1. `client-events` 从“仅 console 输出”提升到“本地持久化 + 可回看”
2. `review` 空队列状态增加更明确的收束反馈与返回入口
3. 文档侧补真实闭环验收清单，形成可执行验证模板

## Decisions

### 1. 客户端事件持久化

- 继续复用现有 `src/lib/utils/client-events.ts`
- 在浏览器环境下把最近事件写入 `localStorage`
- 保留最大条数上限，避免无限增长
- 每次写入后派发 `app:client-events-updated` 自定义事件，供调试面板刷新

### 2. 可回看面板

- 新增 `/admin/observability`
- 页面使用纯客户端面板读取 `client-events` 本地记录
- 只支持：
  - 查看最近记录
  - 关键字筛选
  - 按类型筛选
  - 清空当前记录
- 不引入跨设备同步或服务端聚合

### 3. review 第二轮反馈

- 当 `review` 当前没有任务时，若存在 `summary.reviewedTodayCount > 0`
- 页面显示“今天已完成多少条回忆”和“现在建议返回 today 继续场景”
- 提供显式 CTA 返回 `/today`
- 不新造完成证据，只消费已有 `summary`

## Risks

- `client-events` 仍然是本地设备维度，不能替代正式埋点链路
- `localStorage` 可能被用户清空，所以只适合开发、排查和发布前验证
- `review` 空队列增强不能误导成“所有学习都已完成”，因此只提示“本轮回忆收束”和“建议下一步”

## Validation

- `client-events` 持久化与清理测试
- `admin observability` 面板最小交互测试
- `review` 空队列反馈与 CTA 测试
- 文档补充到 `dev-log` 和真实闭环验收清单
