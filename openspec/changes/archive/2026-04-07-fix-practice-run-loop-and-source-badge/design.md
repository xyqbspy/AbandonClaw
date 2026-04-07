# 设计说明：fix-practice-run-loop-and-source-badge

## Status

draft

## Current Flow

- `ScenePracticeView` 在题目页内部通过 `useEffect` 调用 `onPracticeRunStart`
- 父层 `scene-detail-page.tsx` 目前以内联函数形式传入 `onPracticeRunStart`
- 只要父层因为 `trainingState`、`practiceSnapshot` 等状态变化重新渲染，这个回调引用就会变化
- `ScenePracticeView` 的 effect 依赖包含 `onPracticeRunStart`，因此会再次调用 `POST /practice/run`

当前练习集类型只记录来源场景和来源变体，没有记录“这套题是 AI 生成还是系统本地生成”，所以练习页无法展示更明确的来源提示。

## Problem

- 用户点击一次“重新生成题目”，题目页里的 run 启动请求会被重复触发
- 重复写入 `practice run` 会制造额外接口压力，也可能干扰后端当前模块与运行态统计
- 用户无法从题目页区分 AI 生成和系统回退生成，特别是在本地 fallback 生效时缺少可见提示

## Decision

### 1. 练习 run 启动必须具备页面级幂等性

- 进入题目页后，只应在“当前练习集 + 当前题型”首次需要启动时调用一次 `onPracticeRunStart`
- 父层回调需要改为稳定引用，避免单纯因为重渲染导致 effect 重新触发
- 子层也应增加基于 `practiceSetId + mode` 的已启动保护，避免未来父层再次改成非稳定回调时回归

### 2. 练习集需要显式记录生成来源

- 在 `PracticeSet` 上新增生成来源字段，例如 `generationSource: "ai" | "system"`
- 当 `/api/practice/generate` 正常返回模型结果时记录为 `ai`
- 当场景练习生成因为上游失败或数据不足回退到本地出题时记录为 `system`

### 3. 来源场景文案直接展示生成来源

- 原始场景题目展示：`来源场景 | AI生成：...` 或 `来源场景 | 系统生成：...`
- 变体题目展示：保持原有变体来源语义，同时补上生成来源提示
- 文案层只负责展示，不改变练习题真实来源计算逻辑

## Risks

- 如果只修父层回调稳定性，不加子层防重，后续仍可能被别的重构带回归
- 如果生成来源字段只在前端临时推断，不写入 `PracticeSet`，重新进入页面后提示会丢失
- 如果把“题目来源场景”和“题目生成方式”混成一个字段，后续扩展自定义出题来源会更难维护

## Validation

- 题目页首次进入时，`POST /practice/run` 只触发一次
- 点击“重新生成题目”后，新题集进入页面时仍只触发一次 `POST /practice/run`
- 练习页来源场景会展示 `系统生成` 或 `AI生成`
- 回归测试覆盖：
  - `scene-detail-page` / `scene-practice-view` 重复请求
  - 来源文案展示
