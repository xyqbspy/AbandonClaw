# 场景生成链路实现说明

## 1. 目标

这份文档说明 scenes 页“生成场景”链路在前端、请求 schema、prompt builder、服务端生成与回归测试之间如何协作。

它重点覆盖：

- 生成模式从哪里进入
- `mode` 字段如何贯穿前后端
- 锚点句模式的最小结果保证放在哪里
- 改这条链路时应同步检查哪些文件和测试

## 2. 对应入口 / 实现位置

- 页面入口：
  - [src/app/(app)/scenes/page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.tsx)
- 生成面板：
  - [src/components/scenes/generate-scene-sheet.tsx](/d:/WorkCode/AbandonClaw/src/components/scenes/generate-scene-sheet.tsx)
- 前端 API 封装：
  - [src/lib/utils/scenes-api.ts](/d:/WorkCode/AbandonClaw/src/lib/utils/scenes-api.ts)
- 请求 schema：
  - [src/lib/server/request-schemas.ts](/d:/WorkCode/AbandonClaw/src/lib/server/request-schemas.ts)
- route 入口：
  - [src/app/api/scenes/generate/route.ts](/d:/WorkCode/AbandonClaw/src/app/api/scenes/generate/route.ts)
- prompt builder：
  - [src/lib/server/prompts/scene-generate-prompt.ts](/d:/WorkCode/AbandonClaw/src/lib/server/prompts/scene-generate-prompt.ts)
- 服务端生成：
  - [src/lib/server/scene/generation.ts](/d:/WorkCode/AbandonClaw/src/lib/server/scene/generation.ts)

## 3. 关键字段与模式语义

当前生成请求至少包括：

- `promptText`
- `mode`
- `tone`
- `difficulty`
- `sentenceCount`
- `reuseKnownChunks`

其中 `mode` 是这条链路的关键分流字段：

- `context`
  - 把 `promptText` 当作想练的情境
- `anchor_sentence`
  - 把 `promptText` 当作要围绕其展开的锚点句

向后兼容策略：

- 旧调用未传 `mode` 时，在 request schema 中默认回落到 `context`

## 4. 页面 / 服务端映射

### 4.1 前端面板

`GenerateSceneSheet` 负责：

- 展示“按情境生成 / 按句子生成”切换
- 根据模式切换输入标签、说明文案和 placeholder
- 在提交时把 `mode` 一起传给 `generatePersonalizedSceneFromApi`

### 4.2 请求 schema

`normalizeGenerateScenePayload()` 负责：

- 解析 `promptText`
- 规范化 `mode`
- 对旧请求补默认值 `context`

### 4.3 prompt builder

`buildSceneGenerateUserPrompt()` 负责：

- 在 `context` 模式下继续按“情境描述”构建 prompt
- 在 `anchor_sentence` 模式下加入锚点句约束：
  - 必须围绕该句构建场景
  - 该句必须原样出现在最终对话文本中
  - 该句必须是关键表达，不是边缘装饰

### 4.4 服务端生成

`generatePersonalizedSceneForUser()` 负责：

- 读取规范化后的 `mode`
- 将 `mode` 纳入生成缓存 key
- 调用 prompt builder 时传入 `mode`
- 在 `anchor_sentence` 模式下做最终文本校验

最小校验位置：

- `generatedSceneContainsAnchorSentence()`

这层校验的目标不是评价场景质量，而是防止模型完全绕开锚点句。

## 5. 失败回退与兼容策略

- 请求未传 `mode`
  - 回退到 `context`
- 锚点句模式生成后未包含锚点句
  - 服务端抛错，整次生成失败
- scenes 页生成成功后
  - 仍然沿用现有列表 cache 清理和网络刷新链路

## 6. 与其他模块 / 页面边界

- 这条链路只负责“生成一个可导入的场景”
- 不负责：
  - 多候选场景批量生成
  - 电影来源或人物元数据抽取
  - 与 review / 表达资产沉淀的自动联动

这些需求如果要做，不能继续塞进当前 `mode` 的最小语义里。

## 7. 什么时侯必须同步更新

出现以下变化时，应同步更新这份文档：

- 生成模式新增或重命名
- 请求字段变化
- 锚点句最小校验策略变化
- 生成缓存 key 维度变化
- scenes 页入口文案或交互变化

## 8. 建议回归

最小建议回归：

- [src/components/scenes/generate-scene-sheet.test.tsx](/d:/WorkCode/AbandonClaw/src/components/scenes/generate-scene-sheet.test.tsx)
- [src/app/(app)/scenes/page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.interaction.test.tsx)
- [src/lib/server/request-schemas.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/request-schemas.test.ts)
- [src/lib/server/prompts/scene-generate-prompt.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/prompts/scene-generate-prompt.test.ts)
- [src/lib/server/scene/generation.test.ts](/d:/WorkCode/AbandonClaw/src/lib/server/scene/generation.test.ts)
