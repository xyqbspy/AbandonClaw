# 设计说明：fix-practice-generate-retry

## Status

draft

## Current Flow

- 入口：
  - scene 页删除练习后回到 `view=scene`
  - 如果当前学习步骤仍是 `practice_sentence` 或 `scene_practice`，页面会后台调用 `prewarmPractice`
- 当前处理链路：
  - `scene-detail-page.tsx` 根据学习步骤和 `generatedState.practiceStatus` 决定是否自动预热
  - `use-scene-detail-actions.ts` 通过 `generateScenePracticeSet -> practiceGenerateFromApi -> POST /api/practice/generate` 生成练习
  - `/api/practice/generate` 在模型返回结构非法时会回退到 `buildExerciseSpecsFromScene`
- 当前回退路径：
  - 仅当模型响应成功但 JSON/题目结构不合法时回退到本地出题
  - 如果 `requireCurrentProfile`、GLM 请求、profile 读取、上游超时等更早失败，接口直接返回 500 `Practice generate failed.`

## Problem

- 删除练习后重新预热是合理行为，但当前接口失败会反复重试，缺少短时间失败熔断
- `/api/practice/generate` 的本地兜底覆盖范围不够，只兜模型响应非法，不兜模型请求失败
- 前端和接口层错误文案偏英文，用户只能看到 `Practice generate failed.`，无法理解当前状态
- 当前如果用户对已生成题目不满意，或者刚改了生成逻辑想重跑，只能通过“删除练习 -> 回到 scene -> 等自动预热或再次进入练习”绕路，缺少明确的手动重生入口

## Decision

### 1. 生成失败需要统一短时间熔断

- 为 practice generate 增加统一的短时间失败计数
- 同一生成目标在短时间内连续失败达到 3 次后：
  - 返回最终失败结果
  - 停止继续自动重复请求
  - 让页面保留一个稳定错误态，而不是继续 schedule 下一轮生成

### 2. API 层优先扩大本地兜底范围

- `/api/practice/generate` 不仅要在模型返回内容非法时回退
- 当 GLM 请求超时、上游非 200、空响应等可识别失败出现时，也要优先回退到本地 `buildExerciseSpecsFromScene`
- 只有在本地兜底本身也不可用，或请求属于权限/参数错误时，才返回最终错误

### 3. 错误文案统一中文

- 接口层对用户可见错误返回统一中文
- 认证、参数校验、连续失败熔断、生成最终失败分别给出明确中文提示
- 页面直接消费统一后的中文文案，不再继续展示英文默认错误

### 4. 已有练习时允许手动重新生成

- 在当前练习集已存在时，页面应提供明确的“重新生成题目”入口
- 该入口应允许用户在不删除练习集的前提下主动触发新的生成
- 新生成成功后应覆盖当前最新练习集，后续页面继续消费新的最新练习
- 自动预热失败熔断不应阻断用户后续主动手动重试

## Risks

- 如果熔断 key 设计过粗，可能把本应允许再次手动尝试的请求也一起挡住
- 如果 API 把所有异常都回退到本地出题，可能掩盖真实权限/参数错误
- 如果只做页面层熔断、不做接口层兜底，其他调用方仍会继续暴露旧问题

## Validation

- 验证方式：
  - 删除练习后重新预热时，上游失败不会无限重复请求
  - 上游失败时接口能回退到本地练习并返回成功结果
  - 连续三次失败后返回稳定中文错误，并停止继续自动请求
  - 已有练习时可通过手动入口重新生成，不必先删除再绕回句子页
- 回归范围：
  - `scene-detail-page` 回归测试
  - `practice generate` route 测试
  - 必要时补 `use-scene-detail-actions` 测试
- 未覆盖风险：
  - 其他非 scene 场景若复用 practice generate API，也要确认中文错误文案与熔断语义是否一致
