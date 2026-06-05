## Overview

本变更把 Scene 阶段入口拆成两层：

- 主 CTA：继续表示“当前下一步”，负责推动用户进入当前应做阶段，包括首次生成练习或首次生成变体。
- 阶段入口：表示已经到达并可再次进入的阶段。`练习` 和 `变体` 都是显式选择入口，但不得抢占主 CTA。

匿名试用页不维护用户训练进度，因此不使用“阶段到达”判断；它默认全阶段解锁，但所有体验来自固定资产。

## Formal Scene Rules

### Practice

- `practice` 阶段未到达：不展示可点击 `练习` 阶段入口。
- 到达 `practice_sentence` 或 `scene_practice` 后：
  - `latestPracticeSet.status === "generated"`：`练习` 进入 `?view=practice`。
  - `latestPracticeSet.status === "completed"`：`练习` 调用 repeat practice，再进入 `?view=practice`。
  - 无 practice set：仍由当前下一步 CTA 生成并进入，不把阶段入口变成第二个生成入口。
- 重新生成题目只保留在 practice view 内部明确动作，继续创建新的 `practiceSetId`。

### Variants

- 未解锁变体：不展示可点击 `变体` 阶段入口。
- 解锁后：
  - `latestVariantSet.status === "generated"`：`变体` 进入 `?view=variants` 或当前 active variant。
  - `latestVariantSet.status === "completed"`：`变体` 调用 repeat variants，再进入 `?view=variants`。
  - 无 variant set：仍由当前下一步 CTA 生成并进入。

## Anonymous Trial Rules

- `/trial/scene/[slug]` 默认显示 `练习` / `变体`，并视为全阶段可进入。
- 试用场景详情头部复用正式 Scene 的当前下一步头部结构，只在该结构内额外展示默认可进入的 `练习` / `变体` 阶段按钮。
- `练习` 打开固定 practice fixture，本地交互可进行，但不写 run / attempt / complete。
- `变体` 打开固定 variant fixture，本地浏览可进行，但不写 variant view / run / complete。
- TTS 只读取预生成 Storage 音频；Storage miss 时显示不可用或注册引导，不触发实时生成。
- 保存、加入复习、提交、生成、导入、实时 AI 解释继续走注册阻断。

## Layering

匿名注册阻断弹框必须高于 `DetailSheetShell` 的 `z-[70]/z-[71]`。实现可选：

- 将 `AnonymousBlockModal` 提升到 `z-[80]` 或更高。
- 或点击详情 sheet 中保存 / 加入复习时先关闭 sheet，再显示注册阻断。

## Asset Strategy

最小实现不新增后端生成接口，优先使用 repo 内固定 fixture / manifest：

- trial scene slug
- fixed practice set id
- fixed variant set id
- sentence / block / chunk TTS key 列表

部署前通过脚本或人工预热确认 manifest 中 TTS key 在 Storage 存在。

## Risks

- 如果正式页阶段入口也承担生成，会和当前下一步 CTA 形成重复生成风险。
- 如果匿名 fixture 没有 manifest 校验，试用页会出现可点击但无内容或音频缺失。
- 如果注册阻断层级只靠 z-index，不处理多个 portal 并存，仍需交互测试覆盖。
