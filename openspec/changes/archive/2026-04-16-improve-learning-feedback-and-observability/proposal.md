# 变更提案：增强学习反馈闭环与可观测性

## Status
draft

## Why
当前项目已经完成前四阶段的接口治理、数据边界、上线准备与 today / TTS 可靠性收口，但仍有三个明显缺口：

1. 用户在完成学习、复习或回炉训练后，能看到的结果反馈还偏弱，难以快速理解“这次完成带来了什么变化”。
2. 服务端已经有 `requestId` 和结构化日志，但仍缺少业务级事件视角，无法快速回答“用户在学习闭环的哪一步掉了”。
3. `scene full` 失败虽然已有受控提示，但还没有替代动作，音频失败后用户只能自己重新找逐句入口。

这会导致两个问题：
- 产品层面：完成学习后的成就感、下一步指引和闭环反馈不够强。
- 维护层面：线上排查仍主要依赖请求日志，缺少业务动作与失败摘要。

## What Changes
- 为学习完成、review 提交和 today 摘要补更明确的结果反馈与下一步提示
- 为关键学习动作增加最小业务级事件与失败摘要记录
- 为 `scene full` 播放失败补齐明确的替代入口或可执行 CTA

## Scope

### In Scope
- `today / lesson complete / review complete` 的结果反馈增强
- 最小业务埋点或结构化事件记录，覆盖关键学习动作与失败类型
- `scene full` 失败后的替代体验收口
- 对应文档、最小回归测试与验证记录

### Out of Scope
- 全量 BI 看板或数据平台化
- 全站埋点统一 SDK 重构
- 复杂告警系统或实时监控平台
- 音频底层存储、生成 provider 或缓存体系重写

## Impact
影响的规范：
- `today-learning-contract`
- `review-experience`
- `audio-playback-orchestration`
- `api-operational-guardrails`
- `project-maintenance`

影响的模块：
- `src/features/today/*`
- `src/app/(app)/review/*`
- `src/features/lesson/*`
- `src/lib/utils/tts-api.ts`
- `src/lib/server/logger.ts` 及相关服务端入口

是否涉及 API 变更：否，优先保持现有接口契约稳定  
是否涉及前端交互变化：是  
是否影响缓存策略：否  
是否影响测试基线：是  
兼容性：向后兼容  

风险点：
- 结果反馈如果解释过度，容易和真实学习证据边界不一致
- 业务事件如果范围过大，容易把第五阶段做成埋点平台化
- `scene full` 替代入口如果处理不好，可能和现有逐句播放状态机冲突
