# 设计说明：学习反馈闭环与可观测性增强

## Status
draft

## Current Flow
当前入口：
- `today` 页面负责展示首要任务、今日路径和摘要
- `review` 页面负责复习工作台与回写
- `lesson / scene detail` 负责音频播放与训练推进

当前处理链路：
- 学习、复习和音频行为已经有稳定主链路
- today 已能解释首要任务来源
- TTS 已有受控错误提示、结构化日志和批量重生成失败汇总

当前回写：
- review 提交会写回正式学习信号和 summary
- today 聚合会消费 dashboard / review summary / continue learning 等稳定摘要

当前回退路径：
- today 会对 continue learning 做 dashboard -> local repeat -> scene list fallback
- `scene full` 失败时只给出受控提示，不会主动切换到逐句入口
- 服务端问题排查主要依赖 `requestId` 和请求级日志

## Problem
当前问题：
- 用户完成一轮学习后，看到的反馈还不够像一个“完成闭环”的结果页或结果摘要
- 维护者能看到请求失败，但不容易从日志直接看出“用户完成了什么、卡在哪一步、失败属于哪类业务动作”
- 音频失败时缺少明确替代操作，用户需要自己重新寻找逐句播放入口

不一致点 / 不稳定点：
- today、review、lesson complete 的结果反馈粒度不一致
- 业务动作日志与请求日志仍未对齐
- 音频错误提示和后续可做动作之间还没有形成闭环

## Decision
设计决策 1：结果反馈优先复用现有稳定学习摘要
- 不新增新的学习证据定义
- 结果反馈只消费已有稳定字段，如 progress、review summary、saved phrase summary、today task 状态

设计决策 2：业务级可观测性采用“最小事件摘要”，不做平台化重构
- 只记录关键业务动作与失败类型
- 先收口到现有结构化日志体系或最小事件 helper
- 重点覆盖：today click、continue start、review submit、lesson complete、tts fail、practice generate fail

设计决策 3：scene full 失败后的替代体验优先做显式 CTA
- 不在本阶段改成自动逐句串播
- 先提供稳定的“改为逐句播放 / 继续跟读当前句”一类 CTA
- 保持现有播放控制器和状态机边界不被扩大

## Risks
风险 1：
如果结果反馈直接解释前端临时状态，可能突破 `learning-evidence` 里的正式证据边界。

风险 2：
如果业务事件一次铺得太大，容易把第五阶段从“最小可观测性”拖成重型埋点项目。

风险 3：
如果 scene full 替代入口直接自动接管播放，可能会和当前统一播放编排层冲突。

## Validation
验证方式：
- 关键页面交互回归
- 相关 selector / service 单测
- 业务日志字段最小导入与断言
- 必要时补一轮真实 HTTP 路径下的失败样本记录

回归范围：
- `today`
- `review`
- `lesson / scene detail`
- `tts` 失败路径

未覆盖风险：
- 不做真实分析平台接入时，业务事件仍主要依赖日志消费
- 不做自动逐句串播时，音频失败替代体验仍属于手动切换而非完全无缝降级
